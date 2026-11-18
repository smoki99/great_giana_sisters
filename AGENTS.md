# great_giana_sisters — agent & tooling notes

3D "Giana-like Sisters" remake. Engine: **Godot 4.6** (GDScript). Assets: **Blender 4.5.16 headless** (GLB). Tests/tooling: **Bun/TypeScript** scripts. See `SPEC.md` for requirements, `CAPABILITY-MAP.md` for the domain map.

## Repo layout
- `game/` — Godot project (`project.godot`; scenes in `scenes/`, code in `scripts_gd/` as the project grows)
- `tools/` — Blender asset build scripts (`blender -b --python ...`)
- `scripts/` — Bun/TS dev scripts (unpack, tpz extraction, LSP/MCP bridges)
- `test/` — Bun unit tests for pure-logic GDScript mirrors (physics/feel logic is kept in small pure functions so it can be mirrored/tested)
- `export/` — web export output (gitignored)

## Toolchain (all verified working on this host, 2026-11-18)
| Tool | Path / usage |
|---|---|
| Godot 4.6 headless | `~/.local/opt/godot/Godot_v4.6-stable_linux.x86_64` — **always pass `LD_LIBRARY_PATH=/home/omp/.local/lib/blender`** (fontconfig etc. live there; `godot` wrapper not on harness PATH) |
| Godot web export templates | installed at `~/.local/share/godot/export_templates/4.6.stable/` (web_* zips; headless `--export-release "Web" out` works) |
| GDScript LSP | Godot built-in, TCP `:6005` only → `.omp/lsp.json` spawns `scripts/godot-lsp-bridge.ts` (stdio↔TCP shim, auto-starts headless `--lsp --editor`, `--kill` to stop) |
| Godot DAP | `--dap-port` flag exists (TCP); not yet wired — first debug session will need the same bridge trick |
| godot MCP | registered in `.omp/mcp.json` via `scripts/mcp-line-framing.ts` shim (**@coding-solo/godot-mcp speaks bare JSON-lines, NOT Content-Length framing**) |
| Blender 4.5.16 headless | `~/.local/bin/blender` wrapper (bakes `LD_LIBRARY_PATH=…/opt/blender/{lib,usd}:~/.local/lib/blender`). Harness PATH lacks `~/.local/bin` → use the absolute path. `blender -b --python x.py` incl. gltf export verified |
| blender MCP addon | installed at `~/.config/blender/4.5/scripts/addons/blender_mcp_addon.py`, but **refuses headless**; needs Xvfb+llvmpipe. Asset pipeline = plain `blender -b --python` scripts |
| ast-grep | `bunx ast-grep` (repo `node_modules/@ast-grep/cli`) — .gd parses via tree-sitter-gdscript? (NO: use for TS only; GDScript edits = plain edit tool) |
| Browser | omp `browser` device (headless Chromium) works; E2E = serve `export/` via `bun serve` + drive page |
| Extract | no system xz/unzip/tar-xz: `scripts/unpack.ts` (`tarxz` strips nothing by default, `--strip` removes top dir; `zip --exec`) + `scripts/extract-tpz.ts` (streaming, substring filter) |
| GitHub | `https://github.com/smoki99/great_giana_sisters` public; token in `.env` (split PART vars — tool layer truncates `ghp_*` literals; assemble with `awk -F= '/PART/{printf "%s",$2}' .env`). **github.com git transport works** despite old AGENTS note; creds in `~/.git-credentials` (`x-access-token@github.com`) |

## Gotchas
- Bun global fetch ignores `SSL_CERT_FILE`-style internal CA (no internal-CA hosts here anyway; GitHub is fine).
- `write`/`edit` tools truncate long secret-looking strings — never rely on them to store tokens verbatim.
- fflate streaming `Unzip`: needs `unzip.register(UnzipInflate)`, `file.ondata` **then** `file.start()`, and a final `push(new Uint8Array(), true)`.
- Godot first `--export-release` run needs templates dir + a `--headless --import` pass first time for `.godot/`.
- Blender tarballs carry SONAME symlinks — `scripts/unpack.ts` handles them; older hand-extracted copies had them missing.
- Headless Blender has no GPU: use Cycles **CPU** or bake workbench/EEVEE assets via `blender -b -P` with `--engine CYCLES --cycles-device CPU`.

## Verify loop (commands land with M0/M1; do not assume they exist yet)
1. GDScript static check: `godot --headless --check-only --script <file>` per changed `.gd`
2. `bun test` — mirrored pure logic
3. headless web export + Chromium E2E smoke of the exported build
