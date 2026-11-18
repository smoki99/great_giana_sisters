// check-gd.ts — static-check every .gd in the Godot project.
// usage: bun scripts/check-gd.ts
// (glob via Bun.Glob below)

const GODOT = process.env.GODOT ?? `${process.env.HOME}/.local/bin/godot`;
const files: string[] = [];
for await (const p of new Bun.Glob("game/**/*.gd").scan(".")) if (!p.includes("/.godot/")) files.push(p);

if (files.length === 0) { console.log("check-gd: no .gd files"); process.exit(0); }
let failed = 0;
for (const p of files) {
	const res = Bun.spawnSync({
		cmd: [GODOT, "--headless", "--path", "game", "--check-only", "--script", `res://${p.slice("game/".length)}`],
		stdout: "pipe", stderr: "pipe",
	});
	if (res.exitCode !== 0) {
		failed++;
		console.error(`FAIL ${p}\n${res.stderr.toString().slice(0, 2000)}`);
	}
}
console.log(`check-gd: ${files.length - failed}/${files.length} ok`);
process.exit(failed ? 1 : 0);
