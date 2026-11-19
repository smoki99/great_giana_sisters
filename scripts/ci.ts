// ci.ts — pipeline stages for Mia in Candy Land.
// usage: bun scripts/ci.ts [--stages=import,check,export,zip]
// stages: assets | import | check | unit | export | zip | e2e (default: import,check,export,zip)
const GODOT = process.env.GODOT ?? `${process.env.HOME}/.local/bin/godot`;
const BLENDER = process.env.BLENDER ?? `${process.env.HOME}/.local/bin/blender`;
import { mkdirSync } from "node:fs";
mkdirSync("build/web", { recursive: true });

const arg = Bun.argv.find((a) => a.startsWith("--stages="));
const stages = (arg?.split("=")[1] ?? "import,check,export,zip").split(",").map((s) => s.trim());

async function run(label: string, cmd: string[], opts: { cwd?: string } = {}): Promise<boolean> {
	console.log(`\n=== ${label}: ${cmd.join(" ")}`);
	const p = Bun.spawn({ cmd, cwd: opts.cwd ?? process.cwd(), stdout: "pipe", stderr: "pipe", env: process.env });
	const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
	const ok = (await p.exited) === 0;
	if (!ok) console.error((out + err).slice(-4000));
	else console.log(`${label}: ok`);
	return ok;
}

let allOk = true;
const step = async (name: string, fn: () => Promise<boolean>) => {
	if (!stages.includes(name)) return;
	allOk = (await fn()) && allOk;
};

await step("assets", () => run("assets", [BLENDER, "-b", "-P", "tools/blender/build_assets.py"]));
await step("import", () => run("import", [GODOT, "--headless", "--path", "game", "--import"]));
await step("check", () => run("check", ["bun", "scripts/check-gd.ts"]));
await step("unit", () => run("unit", [GODOT, "--headless", "--path", "game", "-s", "res://tests/run_tests.gd"]));
await step("export", () => run("export", [GODOT, "--headless", "--path", "game", "--export-release", "Web", "../build/web/index.html"]));
await step("zip", () => run("zip", ["bun", "scripts/zip-web.ts"]));
await step("e2e", async () => { console.log("e2e: wired in T30 (browser suite)"); return true; });

console.log(allOk ? "\nCI OK" : "\nCI FAILED");
process.exit(allOk ? 0 : 1);
