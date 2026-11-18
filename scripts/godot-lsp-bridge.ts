// godot-lsp-bridge.ts — stdio↔TCP bridge so omp's stdio-only LSP config can use
// Godot's built-in GDScript LSP (TCP 6005). Spawns the Godot headless LSP server
// on demand and reuses it across client sessions.
// usage: bun scripts/godot-lsp-bridge.ts [--kill]
//   --kill: stop a previously spawned server and exit.
import { connect } from "node:net";
import { spawn as spawnChild } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";

const GODOT = "/home/omp/.local/opt/godot/Godot_v4.6-stable_linux.x86_64";
const PROJECT = "/workspace/great_giana_sisters/game";
const PORT = 6005;
const PIDFILE = "/tmp/godot-lsp-6005.pid";

const tryConnect = () =>
	new Promise<boolean>((res) => {
		const s = connect({ host: "127.0.0.1", port: PORT });
		s.on("connect", () => { s.destroy(); res(true); });
		s.on("error", () => res(false));
	});

const killServer = async () => {
	if (existsSync(PIDFILE)) {
		try { spawnChild("kill", [readFileSync(PIDFILE, "utf8").trim()]); } catch {}
		unlinkSync(PIDFILE);
	}
	console.log("godot lsp server killed");
};
const ensureServer = async () => {
	if (await tryConnect()) return;
	const child = spawnChild(GODOT, ["--headless", "--path", PROJECT, "--lsp", "--editor"], {
		stdio: "ignore",
		detached: true,
		env: { ...process.env, LD_LIBRARY_PATH: "/home/omp/.local/lib/blender" },
	});
	child.unref();
	writeFileSync(PIDFILE, String(child.pid));
	for (let i = 0; i < 60; i++) {
		if (await tryConnect()) return;
		await Bun.sleep(500);
	}
	throw new Error("godot LSP server did not come up on port " + PORT);
};

if (Bun.argv[2] === "--kill") {
	await killServer();
	process.exit(0);
}
await ensureServer();

const tcp = connect({ host: "127.0.0.1", port: PORT });
tcp.on("error", (e) => {
	console.error("bridge tcp error:", e.message);
	process.exit(1);
});
// stdin -> tcp
void (async () => {
	for await (const chunk of Bun.stdin.stream()) tcp.write(chunk);
	tcp.end();
})();
// tcp -> stdout
for await (const chunk of tcp) process.stdout.write(chunk);
process.exit(0);
