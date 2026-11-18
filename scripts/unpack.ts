// unpack.ts — xz/tar/zip extraction without system binaries (no xz, no unzip here)
// usage: bun scripts/unpack.ts tarxz <file.tar.xz> <dest-dir>   (strips top-level dir)
//        bun scripts/unpack.ts zip <file.zip> <dest-dir> [--strip 1] [--exec]
import { unzipSync } from "fflate";
import { XzReadableStream } from "xz-decompress";
import * as tar from "tar-stream";
import { mkdirSync, writeFileSync, chmodSync, unlinkSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";

const [mode, src, dest, ...rest] = Bun.argv.slice(2);
if (!mode || !src || !dest) {
	console.error("usage: unpack.ts tarxz <src> <dest> | zip <src> <dest> [--strip 1] [--exec]");
	process.exit(2);
}
const strip = rest.includes("--strip") ? 1 : 0;
const markExec = rest.includes("--exec");
mkdirSync(dest, { recursive: true });

const writeEntry = (name: string, data: Uint8Array, exec: boolean) => {
	const parts = name.split("/").filter((p) => p && p !== ".");
	if (parts.length <= strip) return;
	const rel = parts.slice(strip).join("/");
	if (!rel || rel.includes("..")) return;
	const path = join(dest, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, data);
	if (exec || markExec) chmodSync(path, 0o755);
};
const writeSymlink = (name: string, linkname: string) => {
	const parts = name.split("/").filter((p) => p && p !== ".");
	if (parts.length <= strip) return;
	const rel = parts.slice(strip).join("/");
	if (!rel || rel.includes("..")) return;
	const path = join(dest, rel);
	mkdirSync(dirname(path), { recursive: true });
	try { unlinkSync(path); } catch {}
	symlinkSync(linkname, path);
};

if (mode === "tarxz") {
	const xz = new XzReadableStream(Bun.file(src).stream());
	const extract = tar.extract();
	extract.on("entry", (header, stream, next) => {
		const chunks: Buffer[] = [];
		stream.on("data", (c: Buffer) => chunks.push(c));
		stream.on("end", () => {
			if (header.type === "file") {
				const data = Buffer.concat(chunks);
				writeEntry(header.name, data, (header.mode ?? 0) & 0o111 ? true : false);
			} else if (header.type === "symlink" || header.type === "hardlink") {
				writeSymlink(header.name, header.linkname ?? "");
				next();
				return;
			}
			next();
		});
		stream.on("error", next);
		stream.resume();
	});
	const done = new Promise<void>((res, rej) => {
		extract.on("finish", () => res());
		extract.on("error", rej);
	});
	Readable.fromWeb(xz as unknown as ReadableStream<Uint8Array>).pipe(extract);
	await done;
	console.log(`extracted ${src} -> ${dest}`);
} else if (mode === "zip") {
	const entries = unzipSync(new Uint8Array(await Bun.file(src).arrayBuffer()));
	let n = 0;
	for (const [name, data] of Object.entries(entries)) {
		if (name.endsWith("/")) continue;
		const exec = await isProbablyBinary(data);
		writeEntry(name, data, exec);
		n++;
	}
	console.log(`extracted ${n} entries ${src} -> ${dest}`);
} else {
	console.error("unknown mode");
	process.exit(2);
}

async function isProbablyBinary(u8: Uint8Array): Promise<boolean> {
	return u8.length > 0 && u8[0] === 0x7f && u8[1] === 0x45; // ELF
}

