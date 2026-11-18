// mcp-line-framing.ts — bridge between omp's Content-Length-framed MCP stdio
// client and servers that speak bare JSON-lines (e.g. @coding-solo/godot-mcp).
// usage: bun scripts/mcp-line-framing.ts <cmd> [args...]
import { spawn } from "node:child_process";

const [bin, ...args] = Bun.argv.slice(2);
if (!bin) {
	console.error("usage: mcp-line-framing.ts <cmd> [args...]");
	process.exit(2);
}
const child = spawn(bin, args, { env: process.env });

let buf = "";
child.stdout.on("data", (d: Buffer) => {
	buf += d.toString();
	let i: number;
	while ((i = buf.indexOf("\n")) >= 0) {
		const line = buf.slice(0, i).trim();
		buf = buf.slice(i + 1);
		if (!line) continue;
		process.stdout.write(`Content-Length: ${Buffer.byteLength(line)}\r\n\r\n${line}`);
	}
});
child.stderr.on("data", (d: Buffer) => process.stderr.write(d));
child.on("exit", (code) => process.exit(code ?? 0));

let inbuf = Buffer.alloc(0);
for await (const chunk of Bun.stdin.stream()) {
	inbuf = Buffer.concat([inbuf, Buffer.from(chunk)]);
	for (;;) {
		const sep = inbuf.indexOf("\r\n\r\n");
		if (sep < 0) break;
		const len = Number(/content-length: *(\d+)/i.exec(inbuf.subarray(0, sep).toString())?.[1]);
		if (!len || inbuf.length < sep + 4 + len) break;
		child.stdin.write(inbuf.subarray(sep + 4, sep + 4 + len).toString() + "\n");
		inbuf = inbuf.subarray(sep + 4 + len);
	}
}
child.stdin.end();
