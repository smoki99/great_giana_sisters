// e2e.ts — browser smoke over raw CDP (no new deps): serve build/web, drive Chromium,
// assert canvas boot, 0 page errors, input responsiveness, title-bridge state (with --full),
// write screenshots to build/shots/. Usage: bun scripts/e2e.ts [--full] [--port=8061]
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";

const ROOT = `${import.meta.dir}/..`;
const PORT = Number(Bun.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 8061);
const FULL = Bun.argv.includes("--full");
const SHOTS = `${ROOT}/build/shots`;
mkdirSync(SHOTS, { recursive: true });

const chromeBase = `${process.env.HOME}/.omp/puppeteer/chrome`;
const ver = readdirSync(chromeBase)[0];
const CHROME = process.env.CHROME ?? `${chromeBase}/${ver}/chrome-linux64/chrome`;

type Msg = { id: number; result?: any; error?: any; method?: string; params?: any };

class CDP {
	ws!: WebSocket;
	private static seq = 0;
	private static pending = new Map<number, (r: Msg) => void>();
	statics = new Map<string, (p: any) => void>();
	constructor(public sessionId: string) {}
	static async connect(url: string) {
		const ws = new WebSocket(url);
		const { promise: opened, resolve: onOpen, reject: onErr } = Promise.withResolvers<void>();
		ws.onopen = onOpen;
		ws.onerror = onErr;
		await opened;
		const root = new CDP("");
		root.ws = ws;
		ws.onmessage = (ev) => {
			const m = JSON.parse(String(ev.data)) as Msg;
			const p = CDP.pending.get(m.id!);
			if (m.id && p) { CDP.pending.delete(m.id); p(m); }
			else if (m.method) root.statics.get(m.method)?.(m.params);
		};
		return root;
	}
	send<T = any>(method: string, params: any = {}): Promise<T> {
		const id = ++CDP.seq;
		const payload: any = { id, method, params };
		if (this.sessionId) payload.sessionId = this.sessionId;
		this.ws.send(JSON.stringify(payload));
		const { promise, resolve, reject } = Promise.withResolvers<T>();
		CDP.pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result as T)));
		return promise;
	}
}

const sleep = (ms: number) => {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
};

let failures = 0;
const check = (name: string, ok: boolean, extra = "") => {
	console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` :: ${extra}` : ""}`);
	if (!ok) failures++;
};

// 1. serve
const server = spawn("bun", ["scripts/serve-web.ts", "build/web", String(PORT)], { cwd: ROOT, stdio: "ignore" });
try {
	for (let i = 0; i < 50; i++) {
		try { if ((await fetch(`http://127.0.0.1:${PORT}/index.html`)).ok) break; } catch {}
		await sleep(100);
	}

	// 2. chromium + CDP
	const chrome = spawn(CHROME, [
		"--headless=new", "--remote-debugging-port=9333", "--no-sandbox", "--disable-dev-shm-usage",
		"--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
		"--user-data-dir=/tmp/giana-e2e-profile", "--window-size=1280,720", "about:blank",
	], { cwd: ROOT, stdio: "ignore" });
	let version: any = null;
	for (let i = 0; i < 80 && !version; i++) {
		await sleep(250);
		try { version = await (await fetch("http://127.0.0.1:9333/json/version")).json(); } catch {}
	}
	if (!version) { console.log("FAIL chromium CDP endpoint"); process.exit(1); }
	const cdp = await CDP.connect(version.webSocketDebuggerUrl);
	const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
	const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
	const tab = new CDP(sessionId);
	tab.ws = cdp.ws;
const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	cdp.statics.set("Runtime.consoleAPICalled", (p) => {
		if (p.type === "error") {
			const txt = (p.args ?? []).map((a: any) => a.value ?? a.description ?? "").join(" ");
			if (!/Blocking on the main thread/.test(txt)) consoleErrors.push(txt.slice(0, 200));
		}
	});
	cdp.statics.set("Runtime.exceptionThrown", (p) => pageErrors.push(String(p.exceptionDetails?.text ?? p.exceptionDetails?.exception?.description).slice(0, 200)));
	await tab.send("Page.enable");
	await tab.send("Runtime.enable");

	const evaluate = async (expr: string) =>
		(await tab.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
	const shot = async (name: string) => {
		const { data } = await tab.send("Page.captureScreenshot", { format: "png" });
		writeFileSync(`${SHOTS}/${name}`, Buffer.from(data, "base64"));
	};
	const key = (code: string, vk: number, down: boolean) =>
		tab.send(down ? "Input.dispatchKeyEvent" : "Input.dispatchKeyEvent", down
			? { type: "keyDown", code, key: code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
			: { type: "keyUp", code, key: code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
	const tap = async (code: string, vk: number) => { await key(code, vk, true); await key(code, vk, false); };
	const hold = async (code: string, vk: number, ms: number) => { await key(code, vk, true); await sleep(ms); await key(code, vk, false); };
	const title = () => evaluate("document.title");

	// 3. load + boot
	await tab.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/index.html?e2e=1` });
	for (let i = 0; i < 120; i++) {
		if (await evaluate("!!document.querySelector('canvas')")) break;
		await sleep(250);
	}
	check("canvas present", !!(await evaluate("!!document.querySelector('canvas')")));
	// engine-ready signal: main.gd sets the title bridge on its first processed frame
	let ready = false;
	for (let i = 0; i < 240 && !ready; i++) {
		ready = /T\d+/.test(String(await title()));
		if (!ready) await sleep(250);
	}
	check("engine ready (title bridge live)", ready, String(await title()));
	await sleep(1200);
	await shot("e2e_t2.png");
	check("webassembly booted (canvas sized)", !!(await evaluate("const c=document.querySelector('canvas'); c && c.width>0")));
	check("0 page errors on boot", pageErrors.length === 0, pageErrors.join(" | "));

	// 4. input probe: ENTER starts, D moves, SPACE jumps -> title-bridge time ticks
	// give the Godot canvas focus (real users click it; headless has no implicit focus)
	for (const type of ["mousePressed", "mouseReleased"]) {
		await tab.send("Input.dispatchMouseEvent", { type, x: 640, y: 360, button: "left", clickCount: 1 });
	}
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
		// first gem is 2 cells (8 m) east at x=8; walk with interleaved hops (gems float)
		// camera sits at a 3/4 angle: D alone pulls north-east; D+S cancels to due east
		for (let i = 0; i < 7; i++) {
			await key("KeyD", 68, true);
			await key("KeyS", 83, true);
			await sleep(2200);
			await key("KeyD", 68, false);
			await key("KeyS", 83, false);
			await tap("Space", 32);
			await sleep(600);
			console.log(`INFO gem-step ${i}: ${await title()}`);
		}
		await sleep(700);
		let tg = String(await title());
		// camera drift may steer us past the gem band (x~8, z~4-8): S/A zig-zag rescue sweep
		for (let i = 0; i < 10 && !/G[1-9]/.test(tg); i++) {
			await hold("KeyS", 83, 2200);
			await tap("Space", 32);
			await hold("KeyA", 65, 2200);
			await sleep(500);
			tg = String(await title());
		}
		check("gem pickup (G>=1 in title)", /G[1-9]/.test(tg), tg);
		// deterministic self-kill: camera diagonals make W+A = due west; walking past x<0
		// drops into the void along the whole west edge (works from any east-drift position)
		let lives2 = false;
		for (let i = 0; i < 8 && !lives2; i++) {
			await key("KeyW", 87, true);
			await key("KeyA", 65, true);
			await sleep(2500);
			await key("KeyW", 87, false);
			await key("KeyA", 65, false);
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
	server.kill("SIGTERM");
}
console.log(failures === 0 ? "E2E OK" : `E2E FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
