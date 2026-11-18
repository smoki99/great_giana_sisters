// zip-web.ts — pack build/web into a static-playable zip.
// usage: bun scripts/zip-web.ts [version=0.1.0]
import { zipSync } from "fflate";
// (glob via Bun.Glob below)

const version = Bun.argv[2] ?? "0.1.0";
const src = "build/web";
const out = `build/mia-candy-land-web-${version}.zip`;

const files: Record<string, Uint8Array> = {};
for await (const p of new Bun.Glob(`${src}/**/*`).scan(".")) files[p.slice(src.length + 1)] = await Bun.file(p).bytes();

const zipped = zipSync(files, { level: 6 });
await Bun.write(out, zipped);
console.log(`${out} ${(zipped.length / 1e6).toFixed(1)} MB (${Object.keys(files).length} files)`);
