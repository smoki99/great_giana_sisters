// Build all game assets with headless Blender; verifies determinism.
// Usage: bun scripts/build-assets.ts [--only=id,id] [--twice]
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface AssetSpec {
  id: string;
  builder: string;
  out: string;
}

const root = process.cwd();
const outRoot = process.env.MCL_OUT ?? join(root, "game", "assets", "models");
const manifest: { assets: AssetSpec[] } = JSON.parse(
  readFileSync(join(root, "tools", "assetgen", "manifest.json"), "utf8"),
);
const only = (process.argv.find(a => a.startsWith("--only=")) ?? "--only=").slice(7);
const ids: string[] = only ? only.split(",") : manifest.assets.map(a => a.id);

async function buildOne(id: string): Promise<number> {
  const p = Bun.spawn(["blender", "-b", "--factory-startup", "-P",
    join(root, "tools", "assetgen", "main.py"), "--", "--id", id],
  { stdout: "pipe", stderr: "pipe", env: { ...process.env, MCL_OUT: outRoot } });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  const rc = await p.exited;
  const line = out.split("\n").find(l => l.startsWith("EXPORTED"));
  if (rc !== 0 || !line) {
    console.error(`FAIL ${id} rc=${rc}\n${out.slice(-1500)}\n${err.slice(-1500)}`);
    return 1;
  }
  console.log(line.replace("EXPORTED ", "  built "));
  return 0;
}

function glbFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(e =>
    statSync(join(dir, e)).isDirectory() ? glbFiles(join(dir, e)) : [join(dir, e)],
  ).filter(f => f.endsWith(".glb"));
}

let fails = 0;
for (const id of ids) fails += await buildOne(id);
if (fails) { console.error(`build-assets: ${fails} failed`); process.exit(1); }

if (process.argv.includes("--twice")) {
  const hash = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
  const first = new Map<string, string>();
  for (const f of glbFiles(outRoot)) first.set(f, hash(f));
  for (const id of ids) fails += await buildOne(id);
  for (const [f, h] of first) if (hash(f) !== h) { console.error(`NONDETERMINISTIC: ${f}`); fails++; }
  if (fails) process.exit(1);
  console.log("determinism: ok");
}
console.log(`build-assets: ${ids.length} assets ok`);
