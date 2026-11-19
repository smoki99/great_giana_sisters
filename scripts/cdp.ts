// cdp.ts — shared raw-CDP client + Chromium bring-up (no deps beyond Bun).
// Used by e2e.ts (regression suite) and shotgallery.ts (visual-QA gallery).
import { spawn, type ChildProcess } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";

export type Msg = { id: number; result?: any; error?: any; method?: string; params?: any };

export class CDP {
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

export const sleep = (ms: number) => {
	const { promise, resolve } = Promise.withResolvers<void>();
	setTimeout(resolve, ms);
	return promise;
};

export function chromePath(): string {
	const chromeBase = `${process.env.HOME}/.omp/puppeteer/chrome`;
	const ver = readdirSync(chromeBase)[0];
	return process.env.CHROME ?? `${chromeBase}/${ver}/chrome-linux64/chrome`;
}

export interface LaunchOpts {
	port: number;
	profile: string;
	size?: string;
}

/** Spawn headless Chromium (swiftshader GL) and connect the root CDP session. */
export async function launchChrome(opts: LaunchOpts): Promise<{ chrome: ChildProcess; cdp: CDP }> {
	const chrome = spawn(chromePath(), [
		"--headless=new", `--remote-debugging-port=${opts.port}`, "--no-sandbox", "--disable-dev-shm-usage",
		"--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
		`--user-data-dir=${opts.profile}`, `--window-size=${opts.size ?? "1280,720"}`, "about:blank",
	], { stdio: "ignore" });
	let version: any = null;
	for (let i = 0; i < 80 && !version; i++) {
		await sleep(250);
		try { version = await (await fetch(`http://127.0.0.1:${opts.port}/json/version`)).json(); } catch {}
	}
	if (!version) throw new Error("chromium CDP endpoint never came up");
	return { chrome, cdp: await CDP.connect(version.webSocketDebuggerUrl) };
}

export interface TabKit {
	tab: CDP;
	consoleErrors: string[];
	pageErrors: string[];
	evaluate: (expr: string) => Promise<any>;
	shot: (name: string) => Promise<void>;
	key: (code: string, vk: number, down: boolean) => Promise<void>;
	tap: (code: string, vk: number) => Promise<void>;
	hold: (code: string, vk: number, ms: number) => Promise<void>;
	title: () => Promise<any>;
	clickCanvas: () => Promise<void>;
}

/** New tab + console/page error collectors + convenience helpers. */
export async function openTab(cdp: CDP, shotsDir?: string): Promise<TabKit> {
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
		writeFileSync(`${shotsDir}/${name}`, Buffer.from(data, "base64"));
	};
	const key = (code: string, vk: number, down: boolean) =>
		tab.send("Input.dispatchKeyEvent", down
			? { type: "keyDown", code, key: code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
			: { type: "keyUp", code, key: code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
	const tap = async (code: string, vk: number) => { await key(code, vk, true); await key(code, vk, false); };
	const hold = async (code: string, vk: number, ms: number) => { await key(code, vk, true); await sleep(ms); await key(code, vk, false); };
	const title = async () => await evaluate("document.title");
	const clickCanvas = async () => {
		for (const type of ["mousePressed", "mouseReleased"]) {
			await tab.send("Input.dispatchMouseEvent", { type, x: 640, y: 360, button: "left", clickCount: 1 });
		}
	};
	return { tab, consoleErrors, pageErrors, evaluate, shot, key, tap, hold, title, clickCanvas };
}

/** Wait until the title bridge shows T<digits> (engine rendered its first frame). */
export async function waitBoot(t: TabKit, timeoutMs = 60_000): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (/T\d+/.test(String(await t.title()))) return true;
		await sleep(250);
	}
	return false;
}
