# Capability Map: Great Giana Sisters × Mario-64-style 3D Browser Demo

One playable low-poly 3D platformer stage, Godot 4 → Web (WASM), playable in a
desktop browser. Four independently verifiable capabilities.

| Module id | Responsibility | Depends on |
|---|---|---|
| toolchain | Install Godot 4.5 (+ Web export templates), Blender 4.5 LTS, register `blender-mcp` + `godot-mcp` in `.omp/mcp.json`, COOP/COEP preview server script | — |
| assets | All 3D figures for one demo level, generated procedurally in headless Blender (bpy): 2 sister characters, tileset/platform pieces, props (gems, ?-blocks, springs, goal gate), 2 enemy types, scenery (trees/clouds); exported as `.glb` | toolchain |
| game | Godot project: player controller (run/jump/double-jump, coyote time), third-person spring-arm camera, one overworld level, collectibles/enemies/power-up, HUD (gems, lives, timer), win/lose flow, chiptune SFX | toolchain, assets |
| web-deploy | Headless Web export, threaded + nothreads templates, `scripts/serve-web.ts` static server with COOP/COEP headers, browser smoke test with screenshots | game |

Build order: toolchain → assets → game → web-deploy
(assets and the game's movement/camera blockout can run in parallel once toolchain lands).

## Verified environment facts (2026-11-18 probes)

| Item | Source | Status |
|---|---|---|
| Godot 4.5 stable Linux x86_64 + `export_templates.tpz` | `https://downloads.godotengine.org/release-4.5/…` | HTTP 200 ✓ (github.com is blocked; this host works) |
| Blender 4.5 LTS (`blender-4.5.16-linux-x64.tar.xz`) | `https://download.blender.org/release/Blender4.5/` | HTTP 200 ✓ — only `.tar.xz`; no `xz` binary → extract with npm `xz-decompress` + `tar-stream` (both on npm) |
| `@coding-solo/godot-mcp@0.1.1` (stdio, JS) | registry.npmjs.org | ✓ runs under `bunx` |
| `@glutamateapp/blender-mcp-ts@0.10.0` (TS port of blender-mcp) | registry.npmjs.org | ✓ no Python needed (host has no python3) |
| MCP registration | omp `.omp/mcp.json` stdio entries | ✓ per omp mcp-config docs |
| Fallback asset path (if Blender can't start headless) | PyPI `bpy` wheel (pypi.org + files.pythonhosted.org 200 ✓) + `uv` python from astral.sh | documented fallback |
| Docker Hub registry reachable (last-resort fallback) | `registry-1.docker.io` 401 = token flow works | ✓ |

## Known risks (mitigations)

1. **Blender headless shared libs** — no root/apt here; Blender `-b` still links libGL/libX11 et al.
   Mitigation: unpack missing `.deb`s from Debian mirrors into `~/.local/lib` + `LD_LIBRARY_PATH`
   (`ar`+`tar` only; chrome-libs precedent exists on this host). Fallback: `bpy` wheel via uv.
2. **Web export audio/threads** — Godot 4 Web needs COOP/COEP headers; threaded export additionally
   needs SharedArrayBuffer. Mitigation: `serve-web.ts` always sends COOP/COEP; fall back to the
   `web_nothreads` template if the host browser context misbehaves.
3. **IP safety** — everything original: our own low-poly "Giana-like" characters and level motifs;
   no Nintendo/Rainbow Arts names in code/assets beyond the repo folder name. No ripped assets.

## Naming

- Playable sisters: **Mia** (green top, blonde — Giana-archetype) and **Lina** (pink top, brunette — Rosi-archetype), same rig, material swap.
- Game title in build: **"Mia in Candy Land"** (user decision 2026-11-18).
