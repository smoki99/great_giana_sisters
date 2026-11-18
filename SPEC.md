# Spec: Giana-like Sisters 3D — one-level browser platformer demo

Status: **DRAFT — awaiting approval** · Scope decisions locked 2026-11-18: flat spec, Mia playable / Lina = reskin, full classic level loop, static zip deliverable. Reference: `CAPABILITY-MAP.md`.

## Objective

A playable **3D low-poly "Giana-style" platformer demo** — one overworld level — running in a desktop browser as a static Web (WASM) build made with Godot 4. Feel target: Mario-64-style analog 3D movement + Giana-1 level structure (gems, timer, spring pads, a diamond power-up, one checkpoint, goal gate). All figures original and generated in Blender 4.5 LTS via headless Python scripting.

User story: *As a browser player, I open `index.html`, press Enter, and within seconds I am running/jumping/double-jumping as Mia through Sugarwood Glade, collecting gems, stomping two enemy kinds, grabbing the diamond for a short invincible dash, and reaching the goal gate before the 200s timer ends.*

## Tech Stack

- **Godot 4.6-stable** (Linux headless, `~/.local/bin/godot` wrapper bakes `LD_LIBRARY_PATH`) + Web export templates; GDScript only; no C#, no addons.
- **Blender 4.5.16 LTS** headless (`-b -P`, `~/.local/bin/blender` wrapper) for all model/animation/preview generation; assets ship as `.glb`.
- **Bun ≥ 1.4** for tooling TS scripts (extract/export-zip/preview server).
- **npm deps (repo root node_modules): `fflate`, plus MCP server packages only** — no others.
- MCP: `godot-mcp` (`@coding-solo/godot-mcp`) registered via `scripts/mcp-line-framing.ts` (it speaks JSON-lines). `blender-mcp` stays **disabled** (addon refuses headless); scripted `blender -b -P` is the canonical asset path. Acceptance never depends on MCP.
- Browser target: desktop Chrome/Firefox (WASM, threads preferred, `web_nothreads` fallback).

## Commands

```sh
# One-time host setup (installs outside the repo):
sh scripts/setup-toolchain.sh        # Godot 4.5.x -> ~/.local/bin/godot + Web templates;
                                     # Blender 4.5.16 (JS-unpacked) -> ~/.local/bin/blender;
                                     # registers MCP servers; verifies all four
bun run --cwd tools npm-install      # (xzh unpack uses tools/node_modules; run inside tools/)

# Assets:
~/.local/bin/blender -b -P tools/blender/build_assets.py   # -> assets/glb/*.glb + assets/preview/*.png

# Game:
~/.local/bin/godot --headless --path game --import         # (re)import assets
~/.local/bin/godot --headless --path game -s res://tests/run_tests.gd        # unit tests
~/.local/bin/godot --headless --path game --quit-after 600 # boot smoke, 600 frames

# Ship:
~/.local/bin/godot --headless --path game --export-release "Web" build/web/index.html
bun scripts/zip-web.ts               # -> build/giana3d-web-<ver>.zip (fflate)
bun scripts/serve-web.ts build/web 8060   # COOP/COEP static server for local play

# Tests (all levels in one shot):
bun scripts/ci.ts                    # blender build -> godot import -> unit -> export -> e2e smoke
```

## Project Structure

```
game/            → Godot project (git root)
  project.godot / icon.svg / export_presets.cfg
  scenes/        → main.tscn, level_01_sugarwood.tscn, player/, enemies/, props/, ui/
  src/           → *.gd: state-machine player controller, spring-arm follow cam,
                   gem/timer/lives/power-up managers, SFX synth
  tests/         → run_tests.gd + test_*.gd (pure-logic SceneTree scripts)
assets/glb/      → 19 rigged/textured .glb figures (imported into game/)
assets/blend/    → generated master .blend (regenerable)
assets/preview/  → Cycles CPU stills used for visual acceptance
tools/blender/   → build_assets.py + per-figure modules
scripts/         → Bun TS: setup-toolchain.sh, serve-web.ts, zip-web.ts, ci.ts
tasks/           → plan.md, todo.md (Phase 2/3 outputs)
build/           → gitignored export output + zip
docs/            → controls.md
```

## Code Style

GDScript 4, tabs, static typing everywhere, scene script at root. Player logic as a
pure state machine so it is unit-testable without rendering:

```gdscript
class_name PlayerStateMachine extends RefCounted

enum State { GROUNDED, AIRBORNE, COYOTE, DYING }
var state: State = State.AIRBORNE

func decide(delta_velocity: Vector3, grounded: bool, jumped: bool, can_double: bool) -> void:
	if jumped:
		state = State.GROUNDED if grounded else State.AIRBORNE
		return
	match state:
		State.GROUNDED:
			if not grounded:
				state = State.COYOTE
		State.COYOTE:
			state = State.AIRBORNE
```

Conventions: `snake_case` funcs/vars, `PascalCase` nodes/scenes, `SCREAMING_SNAKE` consts,
`_private` prefix. Bun scripts: TS strict, no framework, `Bun.file`/`Bun.write` only.

## Testing Strategy

| Level | Tool | What it proves |
|---|---|---|
| Asset pipeline | `blender -b -P …` + check in `ci.ts` | 19 `.glb` produced, each >5 KB, `godot --import` exits 0 and imports every glb |
| Unit (pure logic) | `godot -s tests/run_tests.gd` | jump arc height 1.4 m ±0.1 at JUMP_VELOCITY=8/g=22, coyote 0.1 s window, double-jump once-then-lock, gem counter, timer countdown+death-at-0, diamond 10 s expiry, 3→0 lives flow |
| Scene boot | `--quit-after 600` headless run | Level01 instantiates, player spawns, no errors in output |
| E2E smoke | `bun scripts/ci.ts` final stage: serve `build/web` + omp `browser` tool on port 8060 | page loads, canvas present, **0 console errors**, screenshots at t=2 s/t=10 s saved to `build/shots/`; scripted key input (hold D, then Space) → screenshot shows moved pose; perf readout ≥ 30 fps on local GPU (swiftshader smoke only checks no-errors) |

Manual check by you: unpack the zip, run the bundled server line, play the level.

## Boundaries

- **Always:** typed GDScript; run unit tests + export before declaring done; keep `export_presets.cfg` without credentials; regenerate assets by script only (never hand-edit `assets/glb/`); previews committed so visual state is reviewable.
- **Ask first:** any dependency beyond the three npm packages; any Godot addon; engine/version change; adding image textures; scope beyond one level.
- **Never:** copy any Nintendo/Rainbow Arts asset, name, or music (incl. the Giana 1 theme — SFX only, original tones); commit `build/`, `.godot/`, or binaries; edit files in `~/.local` installs by hand.

## Success Criteria

1. `sh scripts/setup-toolchain.sh` ends green: `godot --version`, `blender --version`, both MCP servers listed by `omp /mcp list`.
2. `assets/glb/` holds the 19 figures; `assets/preview/` a PNG each; a human check accepts the set (screenshot sheet).
3. Unit suite: all green (`run_tests.gd` prints `ALL PASS`).
4. Exported `build/web/` + zip exist; zip < 120 MB.
5. E2E smoke passes: loads in browser with 0 console errors; screenshots show the level with HUD (gems/timer/lives), Mia idle, run, and mid-double-jump spin; a full playthrough to the goal gate is possible (checkpoint + timer + power-up + both enemies + stomp + death/respawn verified).
6. Delivered to you as **`build/giana3d-web-<ver>.zip`** + one serve line.

## Open Questions

1. Title: placeholder **"Giana-like Sisters 3D"**? (rename = 1 string)
2. Palette: high-saturation candy (cyan sky `#4ec9ff`, grass `#57c93e`, pink/purple props)? A reference board comes with the asset previews.
3. Music: original 20 s chiptune loop (bundled with synth SFX) — yes/no? (default: yes)
4. Any hard build-size ceiling below the default 120 MB (e.g. hosting limits)?
