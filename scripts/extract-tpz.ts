// extract-tpz.ts — pull templates matching a substring out of Godot's 1.25 GB
// export_templates.tpz without materializing the whole archive (fflate streaming Unzip).
// usage: bun scripts/extract-tpz.ts <templates.tpz> <dest-dir> [name-substr=web]
import { Unzip, UnzipInflate } from "fflate";
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";

const [src, dest, sub = "web"] = Bun.argv.slice(2);
if (!src || !dest) {
	console.error("usage: extract-tpz.ts <templates.tpz> <dest-dir> [substr=web]");
	process.exit(2);
}
mkdirSync(dest, { recursive: true });

const writes: Promise<unknown>[] = [];
let count = 0;
const unzip = new Unzip((file) => {
	if (!file.name.includes(sub)) return null;
	const path = join(dest, basename(file.name));
	const chunks: Uint8Array[] = [];
	file.ondata = (err, data, final) => {
		if (err) throw err;
		chunks.push(data);
		if (final) {
			writes.push(Bun.write(path, new Blob(chunks as BlobPart[])));
			count++;
		}
	};
	file.start();
	return file;
});
unzip.register(UnzipInflate);
const reader = Bun.file(src).stream().getReader();
for (;;) {
	const { done, value } = await reader.read();
	if (done) break;
	unzip.push(value);
}
unzip.push(new Uint8Array(), true);
await Promise.all(writes);
console.log(`extracted ${count} '${sub}' templates -> ${dest}`);
