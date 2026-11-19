# Spec: v0.3 — Mario-64-grade look & feel ("Candy 64")

Status: **user pre-approved execution** (instruction 2026-11-19: spec + act in 15 steps / 5 betas in-session). Living document — update when decisions change.
Research pack: `docs/refs/NOTES.md` + images.

## Capability map (build order)

| Module id | Responsibility | Depends on |
|---|---|---|
| visual-qa | state-shot gallery, palette/contrast lint, perf budget gate | — |
| world-art | merged/beveled meshes, vertex-color palette, toon shader, sky/fog/light | visual-qa (for measurement) |
| camera | follow-lag spring v2, lookahead, speed-reactive framing, wall push-in | — |
| character | model v2, squash&stretch, blink/eye-track, secondary motion | — |
| juice | particles, gem magnet/pop, hit-stop, shake, damage blink | character |
| logic-feel | air control, coyote, input buffer, stomp/slide bonuses, momentum purity | — |
| audio-juice | pitch-ladder pickups, stingers, low-time pressure | logic-feel |
| ship | betas b1–b5: zips, tags, e2e gates, docs | all |

Build order: visual-qa → world-art → camera → character → juice → logic-feel → audio-juice → ship gates interleaved.

## Objective

Players say Mia in Candy Land "doesn't look good" yet. Target: a Mario-64-grade 3D collectathon feel — camera that reads like a character, momentum-first movement, saturated candy world with readable platforms, expressive chunky character, juice on every interaction. Shipped as five playable betas (v0.3.0-beta1..beta5), each measured against screenshot + perf gates, each a tagged, zipped web build.

Reframed success criteria (measurable):
- Palette lint: mean screenshot saturation ≥ 0.35, value contrast between playfield and sky ≥ 0.25 luminance delta; no fog wall (horizon band ΔL to sky < 0.12). (Today: grey box world fails all three.)
- Draw calls in L3 ≤ 260 (767 static boxes today — measured baseline at step 1) and swiftshader e2e fps ≥ current baseline (1.19 s/title tick).
- Camera: heading→boom yaw 90% settle within 0.5–1.2 s on scripted route (unit, pure math); zero rigid-attach frames in recorded trace.
- Feel: coyote 0.12 s, input buffer 0.15 s, jump preserves horizontal velocity exactly (e2e asserts X-velocity continuity across the jump frame).
- e2e 11/11 green after every step; stability 2× back-to-back before each beta tag.

## Tech stack

Godot 4.7 (GL Compatibility) · GDScript · bun/TypeScript tooling (`scripts/ci.ts` stages import/check/unit/export/zip/serve) · puppeteer+CDP e2e (`scripts/e2e.ts`, `--url` supported) · headless godot unit tests (`tests/*.gd`, SceneTree runners) · PIL/numpy image lint (`~/.local/opt/py/bin/python3`, pillow 13, numpy 2.5 — bash-invoked; eval-py unavailable on this host).

## Commands

```
bun scripts/ci.ts --stages=check,unit,export        # full validate+export
bun scripts/e2e.ts --full                           # local playthrough suite (11 checks)
bun scripts/e2e.ts --full --url=<public-origin>     # hosted verification
bun scripts/shotgallery.ts                          # NEW step 1: 8 canonical PNGs -> build/shots/gallery/
bun scripts/shots.ts lint                           # NEW step 1: palette/contrast/perf lint -> PASS/FAIL
bun scripts/zip-web.ts <ver>                        # web zip
sh -lc 'git tag -a v0.3.0-beta<k> -m … && git push gitea main --tags'
```

## Project structure

```
game/scenes/    → player.tscn, sugarwood.tscn (generated), main.tscn
game/scripts/   → player.gd, camera_spring.gd (pure), run_rules.gd (pure), anim_driver.gd (pure), chiptune.gd, gen_level meshes
scripts/        → ci.ts, e2e.ts, gen-level.ts (bun gen pipeline), shotgallery.ts (new), shots.ts lint ext (new), zip-web.ts
tests/          → test_*.gd SceneTree runners (headless, deterministic)
docs/refs/      → research pack (this spec's evidence)
build/web/      → exported wasm build; build/shots/gallery/ → state shots
```

## Code style

Pure logic in `*_spring.gd`/`run_rules.gd` static funcs, unit-tested headless (existing convention); side effects stay in scene nodes. TypeScript tooling: top-level await, no deps beyond bun stdlib.

```gdscript
static func follow_step(cur: Vector3, target: Vector3, dt: float, k: float) -> Vector3:
	return cur + (target - cur) * (1.0 - exp(-k * dt))  # exponential, frame-rate safe
```

## Testing strategy

1. Godot headless unit (`tests/`, ~115 tests today — extend for every pure fn).
2. e2e 11 checks (`--full`) after each step.
3. NEW visual QA gates (step 1): 8-state gallery → PIL lint (palette bands, contrast, fog wall) + engine stats dump (draw calls/fps) in CI.
4. Per-beta: 2× consecutive `e2e --full` green + public-URL pass where tunnel live.

## The 15 steps × 5 betas

| # | Step | Beta |
|---|---|---|
| 1 | visual-qa: shotgallery.ts (8 states) + lint (PIL palette/contrast/fog) + perf baseline recorded | — |
| 2 | SPEC committed; lint gates red on current build (proves measurement) | — |
| 3 | World v1: per-tile-type merged ArrayMesh + bevels + vertex-color palette (PIL-extracted from refs) | b1 |
| 4 | Toon material: half-lambert ramp + rim + vertex-color modulate shader; fog → sky-colored height haze | b1 |
| 5 | Sky: gradient shader + sun tint + drifting cloud billboards; relight; **tag v0.3.0-beta1 (world)** | b1 |
| 6 | Camera v2: follow-lag/cornering + speed distance/FOV + lookahead + jump-lead; wall-ray push-in; unit tests | b2 |
| 7 | Character model v2: chunky head/hands/eyes, blink + pupil track, pigtail spring motion | b2 |
| 8 | **tag v0.3.0-beta2 (camera + character)** | b2 |
| 9 | Squash&stretch curves on jump/land/djump + landing dust + jump puff particles | b3 |
| 10 | Gem magnet + pop-punch + sparkle + HUD counter tween | b3 |
| 11 | **tag v0.3.0-beta3 (juice)** | b3 |
| 12 | Logic-feel: coyote/buffer/air-control/jump-momentum-purity/slide+double bonuses (run_rules), hit-stop + shake + damage blink; enemy squash/flash | b4 |
| 13 | Audio-juice: pickup pitch ladder, damage stinger, low-time pressure, land thud | b4 |
| 14 | **tag v0.3.0-beta4 (feel + audio)**; gallery re-render, palette lint must go green | b4 |
| 15 | Stability 2× + perf budget in CI + README/CHANGELOG + zip + **tag v0.3.0-beta5** + push gitea | b5 |

## Boundaries

- **Always**: unit-test every new pure function; `bun ci --stages=check,unit` + `e2e --full` before any commit touching `game/`; shots before/after visual changes.
- **Ask first**: new runtime dependencies (none planned); changing the 11 e2e check semantics; GL features that break swiftshader.
- **Never**: commit secrets; regress e2e to make lint pass; drop GL Compatibility; delete existing tests; commit > 50 MB/binary (zip gate stays ~≤ 15 MB).

## Open questions (defaults chosen; override anytime)

1. Keep Giana homage identity (pink outfit, pigtails) with M64 *treatment*? → assumed yes.
2. Toon ramp vs soft half-lambert only? → half-lambert + rim (N64-authentic, cheap under swiftshader).
3. Free-camera (C-stick equivalent) now? → no; tuned fixed camera first (M64's own default feel), optional later.
