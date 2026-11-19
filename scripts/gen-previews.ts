// Render one preview PNG per asset with headless Chromium (SwiftShader GL).
// Usage: bun scripts/gen-previews.ts [id,id]
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = process.cwd();
const outRoot = join(root, "game", "assets", "models");
const prevRoot = join(root, "game", "assets", "preview");
const manifest = await Bun.file(join(root, "tools", "assetgen", "manifest.json")).json();
const only = (process.argv[2] ?? "");
const ids: string[] = only ? only.split(",") : manifest.assets.map((a: { id: string }) => a.id);

const browser = await chromium.launch({
  executablePath: join(process.env.HOME ?? "", ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome"),
  args: ["--allow-file-access-from-files", "--no-sandbox"],
  env: { ...process.env, LD_LIBRARY_PATH: join(process.env.HOME ?? "", ".local/share/chrome-libs") },
});
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
page.on("requestfailed", r => console.error("  reqfail:", r.url(), r.failure()?.errorText));
page.on("console", m => { if (m.type() === "error") console.error("  console:", m.text().slice(0, 200)); });

let fails = 0;
for (const id of ids) {
  const asset = manifest.assets.find((a: { id: string }) => a.id === id);
  const glb = join(outRoot, asset.out);
  const url = `file://${join(root, "tools/previewgen/preview.html")}?glb=${pathToFileURL(glb).href}`;
  await page.goto(url);
  await page.waitForFunction("window.__READY === 1", undefined, { timeout: 30000 });
  const err = await page.evaluate("window.__ERR ?? null");
  if (err) { console.error(`FAIL ${id}: ${err}`); fails++; continue; }
  const out = join(prevRoot, asset.out).replace(/\.glb$/, ".png");
  await Bun.$`mkdir -p ${String(join(out, ".."))}`.quiet();
  await page.locator("canvas").screenshot({ path: out });
  const bytes = Bun.file(out).size;
  if (bytes < 2048) { console.error(`FAIL ${id}: preview only ${bytes} bytes`); fails++; continue; }
  console.log(`  ${id} -> ${out.slice(root.length + 1)} (${bytes} B)`);
}
await browser.close();
if (fails) { console.error(`gen-previews: ${fails} failed`); process.exit(1); }
console.log(`gen-previews: ${ids.length} previews ok`);
