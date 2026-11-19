// e2e.ts — browser smoke over raw CDP (no new deps): serve build/web, drive Chromium,
// assert canvas boot, 0 page errors, input responsiveness, title-bridge state (with --full),
// write screenshots to build/shots/. Usage: bun scripts/e2e.ts [--full] [--port=8061]
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { launchChrome, openTab, sleep, waitBoot } from "./cdp";

const ROOT = `${import.meta.dir}/..`;
const PORT = Number(Bun.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 8061);
// --url=https://… verifies an externally hosted build (e.g. the public tunnel demo)
// instead of spawning the local server
const REMOTE = Bun.argv.find((a) => a.startsWith("--url="))?.split("=")[1];
const FULL = Bun.argv.includes("--full");
const SHOTS = `${ROOT}/build/shots`;
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` :: ${extra}` : ""}`);
	if (!ok) failures++;
};

// 1. serve
const server = REMOTE ? null : spawn("bun", ["scripts/serve-web.ts", "build/web", String(PORT)], { cwd: ROOT, stdio: "ignore" });
let chrome = null as null | ReturnType<typeof spawn>;
try {
	if (!REMOTE) for (let i = 0; i < 50; i++) {
		try { if ((await fetch(`http://127.0.0.1:${PORT}/index.html`)).ok) break; } catch {}
		await sleep(100);
	}

	// 2. chromium + CDP
	const booted = await launchChrome({ port: 9333, profile: "/tmp/giana-cdp-profile" });
	chrome = booted.chrome;
	const k = await openTab(booted.cdp, SHOTS);
	const { tab, consoleErrors, pageErrors, evaluate, shot, key, tap, hold, title, clickCanvas } = k;

	// 3. load + boot
	await tab.send("Page.navigate", { url: REMOTE ? `${REMOTE}/index.html` : `http://127.0.0.1:${PORT}/index.html?e2e=1` });
	for (let i = 0; i < 120; i++) {
		if (await evaluate("!!document.querySelector('canvas')")) break;
		await sleep(250);
	}
	check("canvas present", !!(await evaluate("!!document.querySelector('canvas')")));
	// engine-ready signal: main.gd sets the title bridge on its first processed frame
	const ready = await waitBoot({ ...k }, 60_000);
	check("engine ready (title bridge live)", ready, String(await title()));
	await sleep(1200);
	await shot("e2e_t2.png");
	check("webassembly booted (canvas sized)", !!(await evaluate("const c=document.querySelector('canvas'); c && c.width>0")));
	check("0 page errors on boot", pageErrors.length === 0, pageErrors.join(" | "));

	// 4. input probe: ENTER starts, D moves, SPACE jumps -> title-bridge time ticks
	// give the Godot canvas focus (real users click it; headless has no implicit focus)
	await clickCanvas();
	await sleep(300);
	const t0 = String(await title());
	await tap("Enter", 13);
	await sleep(1500);
	await hold("KeyD", 68, FULL ? 1500 : 600);
	await tap("Space", 32);
	await sleep(1200);
	const t1 = String(await title());
	check("ENTER starts the run (playing flag in title)", / - 1 G\d+/.test(t1), `${t0} -> ${t1}`);
	await shot("e2e_t10.png");

	// 5. fps sample (logged; swiftshader has no gate)
	const fps = await evaluate(`(() => { const { promise, resolve } = Promise.withResolvers();
		let n = 0; const t = performance.now();
		const step = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(step); else resolve((n / 2).toFixed(1)); };
		requestAnimationFrame(step);
		return promise; })()`);
	console.log(`INFO swiftshader fps ~${fps}`);

	// 6. --full alpha choreography via the title bridge
	if (FULL) {
		// first gem is 2 cells (8 m) east at x=8, same row as the spawn; the camera boom is
		// fixed (yaw 0) so D = due east, A = due west — no diagonal compensation needed.
		// swiftshader software rendering runs the sim at ~10 fps, so ~1 m/s wall-clock:
		// budget 12 x 2 s holds to cover the 8 m plus renderer slack.
		for (let i = 0; i < 12; i++) {
			await key("KeyD", 68, true);
			await sleep(2000);
			await key("KeyD", 68, false);
			await tap("Space", 32);
			await sleep(500);
			console.log(`INFO gem-step ${i}: ${await title()}`);
			if (/G[1-9]/.test(String(await title()))) break;
		}
		await sleep(700);
		let tg = String(await title());
		// if the east-walk overshot the gem: walk back west along the spawn row, hopping —
		// the gem at x=8 sits exactly on that line, so this sweep cannot miss it
		for (let i = 0; i < 6 && !/G[1-9]/.test(tg); i++) {
			await hold("KeyA", 65, 2000);
			await tap("Space", 32);
			await sleep(400);
			tg = String(await title());
		}
		check("gem pickup (G>=1 in title)", /G[1-9]/.test(tg), tg);
		// deterministic self-kill: A = due west (fixed camera); walking past x<0 drops into
		// the void along the whole west edge regardless of where the gem phase left us
		let lives2 = false;
		for (let i = 0; i < 10 && !lives2; i++) {
			await hold("KeyA", 65, 2500);
			await sleep(400);
			lives2 = /L2/.test(String(await title()));
		}
		check("fall costs a life (L2)", lives2, String(await title()));
		let respawned = false;
		for (let i = 0; i < 10 && !respawned; i++) {
			await sleep(1500);
			respawned = /X0 Z8/.test(String(await title()));
		}
		check("respawn returns to respawn point", respawned, String(await title()));
		await tap("KeyM", 77);
		await sleep(400);
		check("music toggle: no page errors so far", pageErrors.length === 0, pageErrors.join(" | "));
		await shot("e2e_full.png");
	}

	check("0 console errors (whitelist: emscripten blocking note)", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
	check("0 page errors", pageErrors.length === 0, pageErrors.join(" | "));
	chrome.kill("SIGTERM");
} finally {
	server?.kill("SIGTERM");
	chrome?.kill("SIGTERM");
}
console.log(failures === 0 ? "E2E OK" : `E2E FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
