// Build a labeled contact sheet of all asset previews -> game/assets/preview/contact_sheet.png
// usage: NODE_PATH=... bun scripts/contact-sheet.ts
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

import { readdirSync } from "node:fs";
const root = process.cwd();
const prevRoot = join(root, "game", "assets", "preview");
const manifest = await Bun.file(join(root, "tools", "assetgen", "manifest.json")).json();
const files: string[] = [];
for (const f of readdirSync(prevRoot, { recursive: true }) as string[]) {
  const p = join(prevRoot, String(f));
  if (String(f).endsWith(".png") && !String(f).includes("contact_sheet")) files.push(p);
}
const ids = manifest.assets.map((a: { id: string }) => a.id);
files.sort();
if (files.length !== ids.length) console.warn(`warning: ${files.length} pngs vs ${ids.length} manifest ids`);

const cell = 220;
const cols = 5;
const rows = Math.ceil(files.length / cols);
const html = `<body style="margin:0;background:#1b1b22;font:12px monospace">
<div style="display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:2px">
${files.map(f => `<div style="width:${cell}px;height:${cell + 18}px;background:#26262f;text-align:center">
<img src="${pathToFileURL(f).href}" style="width:${cell}px;height:${cell}px;object-fit:contain">
<div style="color:#cfd6e4;height:16px;line-height:16px;overflow:hidden">${f.split("/").pop()}</div></div>`).join("")}
</div></body>`;
const sheetHtml = join(prevRoot, "contact_sheet.html");
await Bun.write(sheetHtml, `<!DOCTYPE html><html><head><meta charset="utf-8"></head>${html}</html>`);
const browser = await chromium.launch({
  executablePath: join(process.env.HOME ?? "", ".cache/ms-playwright/chromium-1255/chrome-linux64/chrome"),
  args: ["--allow-file-access-from-files", "--no-sandbox"],
  env: { ...process.env, LD_LIBRARY_PATH: join(process.env.HOME ?? "", ".local/share/chrome-libs") },
});
const page = await browser.newPage({ viewport: { width: cols * (cell + 2), height: rows * (cell + 20) } });
await page.goto(pathToFileURL(sheetHtml).href);
await page.waitForTimeout(300);
const out = join(prevRoot, "contact_sheet.png");
await page.screenshot({ path: out });
await browser.close();
console.log(`contact-sheet: ${files.length} figures -> ${out}`);
