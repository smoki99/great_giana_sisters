// shots.ts — gallery tooling. `bun scripts/shots.ts lint [dir]`:
// runs palette_lint.py (color gates) + the draw-call perf budget gate over
// build/shots/gallery/. Exit != 0 on any red gate.
import { existsSync, readFileSync } from "node:fs";

const PY = `${process.env.HOME}/.local/opt/py/bin/python3`;
const ROOT = `${import.meta.dir}/..`;
const sub = Bun.argv[2] ?? "lint";
if (sub !== "lint") {
	console.error(`unknown subcommand ${sub} (only: lint)`);
	process.exit(64);
}
const dir = Bun.argv[3] ?? `${ROOT}/build/shots/gallery`;
const DC_BUDGET = 260; // SPEC v0.3: draw calls in L3 <= 260

let failures = 0;

	const p = Bun.spawn([PY, `${ROOT}/scripts/palette_lint.py`, dir], { stdout: "pipe", stderr: "pipe" });
	const out = await new Response(p.stdout).text();
	const errText = await new Response(p.stderr).text();
process.stdout.write(out);
if (errText.trim()) process.stderr.write(errText);
if ((await p.exited) !== 0) failures++;

const statsPath = `${dir}/stats.json`;
if (!existsSync(statsPath)) {
	console.log(`FAIL perf :: missing ${statsPath} — run: bun scripts/shotgallery.ts`);
	failures++;
} else {
	const stats = JSON.parse(readFileSync(statsPath, "utf8")) as { shot: string; dc: number; fps: number }[];
	for (const s of stats) {
		if (s.dc < 0) { console.log(`FAIL perf :: ${s.shot} has no draw-call stats (stats bridge missing?)`); failures++; continue; }
		if (s.dc > DC_BUDGET) { console.log(`FAIL perf :: ${s.shot} ${s.dc} draw calls > ${DC_BUDGET}`); failures++; continue; }
		console.log(`PASS perf :: ${s.shot} dc=${s.dc} (<= ${DC_BUDGET}) fps=${s.fps}`);
	}
}
console.log(failures === 0 ? "LINT OK" : `LINT FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
