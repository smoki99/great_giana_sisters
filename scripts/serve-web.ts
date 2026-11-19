// serve-web.ts — static server with COOP/COEP for Godot Web (threads/SAB).
// usage: bun scripts/serve-web.ts [dir=build/web] [port=8060]
import { serve, file } from "bun";

const dir = Bun.argv[2] ?? "build/web";
const port = Number(Bun.argv[3] ?? 8060);

const MIME: Record<string, string> = {
	".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm",
	".pck": "application/octet-stream", ".png": "image/png", ".svg": "image/svg+xml",
	".json": "application/json", ".css": "text/css", ".ico": "image/x-icon",
	".map": "application/json", ".otf": "font/otf", ".ttf": "font/ttf",
};

const server = serve({
	port,
	fetch: async (req) => {
		const url = new URL(req.url);
		let path = decodeURIComponent(url.pathname);
		if (path.endsWith("/")) path += "index.html";
		const f = file(`${dir}${path}`);
		if (!(await f.exists())) return new Response("not found", { status: 404 });
		const ext = path.slice(path.lastIndexOf("."));
		// the engine only sees args baked into GODOT_CONFIG; forward ?e2e=1 to the wasm
		// (main.gd raises Engine.max_physics_steps_per_frame for these runs)
		if (path === "/index.html" && url.searchParams.has("e2e")) {
			const html = (await f.text()).replace('"args":[]', '"args":["--","e2e"]');
			return new Response(html, { headers: { "content-type": "text/html", "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp", "cross-origin-resource-policy": "same-origin", "cache-control": "no-store" } });
		}
		return new Response(f, {
			headers: {
				"content-type": MIME[ext] ?? "application/octet-stream",
				"cross-origin-opener-policy": "same-origin",
				"cross-origin-embedder-policy": "require-corp",
				"cross-origin-resource-policy": "same-origin",
				"cache-control": "no-store",
			},
		});
	},
});
console.log(`serve-web http://127.0.0.1:${server.port}/ dir=${dir} COOP/COEP=on`);
