// shotgallery.ts — visual-QA gallery: drives the web build through the 8 canonical
// states with key choreography, captures screenshots + live stats (draw calls, fps,
// title-bridge state) into build/shots/. Proof artifact for spec §Visual QA.
// Usage: bun scripts/shotgallery.ts [--port=8062]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { launchChrome, openTab, sleep, waitBoot } from "./cdp";

const ROOT = `${import.meta.dir}/..`;
const PORT = Number(Bun.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 8062);
const SHOTS = `${ROOT}/build/shots/gallery`;
mkdirSync(SHOTS, { recursive: true });

const server = spawn("bun", ["scripts/serve-web.ts", "build/web", String(PORT)], { cwd: ROOT, stdio: "ignore" });
let chrome = null as null | ReturnType<typeof spawn>;
const gallery: { shot: string; title: string; dc: number; fps: number; prims: number }[] = [];
try {
	for (let i = 0; i < 50; i++) {
		try { if ((await fetch(`http://127.0.0.1:${PORT}/index.html`)).ok) break; } catch {}
		await sleep(100);
	}
	const booted = await launchChrome({ port: 9334, profile: "/tmp/giana-gallery-profile" });
	chrome = booted.chrome;
	const k = await openTab(booted.cdp, SHOTS);
	const { tab, consoleErrors, pageErrors, evaluate, shot, key, tap, hold, title, clickCanvas } = k;

	await tab.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html?e2e=1&slowmo=1` });
	for (let i = 0; i < 120; i++) {
		if (await evaluate("!!document.querySelector('canvas')")) break;
		await sleep(250);
	}
	if (!(await waitBoot(k, 60_000))) throw new Error("engine never booted");
	// stats bridge needs one tick after boot before first read
	await sleep(1500);

	const snap = async (name: string) => {
		await shot(name);
		const st = await evaluate("window.__game_stats ?? {}");
		gallery.push({ shot: name, title: String(await title()), dc: st.dc ?? -1, fps: +(st.fps ?? -1).toFixed(1), prims: st.prims ?? -1 });
		console.log(`shot ${name} :: ${await title()} :: dc=${st.dc} fps=${(st.fps ?? 0).toFixed(0)}`);
	};

	// swiftshader renders 1-2 fps under screenshot load while the sim tracks real time:
	// one paused screenshot walks the player ~5 m, so fixed wall-clock holds are useless.
	// Choreography is pulse-based: key presses <= ~600 ms, title bridge re-read after
	// every pulse, and keys are released before snapshots — the sole exception is the
	// run shot, which starts at X0 where >=8 m of clear runway tolerates capture drift.
	interface RunState { play: number; g: number; l: number; x: number; z: number }
	const state = async (): Promise<RunState | null> => {
		const m = String(await title()).match(/(\d) G(\d+) T\d+ L(\d+)P? X(-?\d+) Z(-?\d+)/);
		return m ? { play: +m[1], g: +m[2], l: +m[3], x: +m[4], z: +m[5] } : null;
	};
	const pulse = async (dir: "D" | "A", hop: boolean) => {
		const code = dir === "D" ? "KeyD" : "KeyA";
		const vk = dir === "D" ? 68 : 65;
		await key(code, vk, true);
		await sleep(550);
		if (hop) await tap("Space", 32);
		await key(code, vk, false);
		await sleep(150);
		return state();
	};
	const until = async (dir: "D" | "A", hop: boolean, max: number, done: (s: RunState) => boolean) => {
		let s = await state();
		for (let i = 0; i < max && !(s && done(s)); i++) s = await pulse(dir, hop);
		return s;
	};

	// 1. title overlay
	await snap("01_title.png");
	await clickCanvas();
	await sleep(300);

	// 2. start -> idle at spawn
	await tap("Enter", 13);
	await sleep(2000);
	await snap("02_idle.png");

	// 3. run: home to the spawn strip, then capture while D is held (only here a held
	// key survives the snapshot; drift from X0 stays on the ground east of spawn)
	await until("A", false, 6, (s) => s.x <= 1);
	await key("KeyD", 68, true);
	await snap("03_run.png");
	await key("KeyD", 68, false);
	await sleep(1200); // decelerate/settle

	// 4. standing jump: tap Space, snapshot ~0.9 s later lands inside the air arc
	await until("A", false, 8, (s) => s.x <= 2);
	await tap("Space", 32);
	await sleep(900);
	await snap("04_jump.png");
	await sleep(6000); // land + settle

	// 5. gem: pulse east until collected (gem sits ~X6-8), capture at rest beside it
	await until("D", false, 14, (s) => s.g > 0 || s.x >= 9);
	await until("A", false, 4, (s) => s.g > 0); // overshoot: nudge west onto the pickup line
	await snap("05_gem.png");

	// 6. home with pulses, then walk pulses west over the void edge: exactly one life
	await until("A", false, 14, (s) => s.x <= 1 && s.g > 0);
	let s = await until("A", false, 12, (st) => st.l <= 2);
	if (!s || s.l !== 2) console.log(`WARN damage phase lost ${3 - (s?.l ?? 0)} lives: ${await title()}`);
	await snap("06_damage.png"); // fires inside the death blink (~1.5 s sim)

	// 7. respawn: playing again at X0 Z8
	for (let i = 0; i < 30; i++) {
		s = await state();
		if (s && s.play === 1 && s.x === 0 && s.l === 2) break;
		await sleep(2500);
	}
	await snap("07_respawn.png");

	// 8. scene beauty pass: hop east past the gap into the brick/candy zone, capture at rest
	await until("D", true, 24, (st) => st.x >= 14);
	await snap("08_scene.png");

	writeFileSync(`${SHOTS}/stats.json`, JSON.stringify(gallery, null, 1) + "\n");
	console.log(`errors console=${consoleErrors.length} page=${pageErrors.length}`);
	if (consoleErrors.length || pageErrors.length) process.exit(2);
} finally {
	server.kill("SIGTERM");
	chrome?.kill("SIGTERM");
}
console.log(`GALLERY OK (${gallery.length} shots)`);
