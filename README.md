# Mia in Candy Land

3D candy platformer (Great Giana Sisters spirit), Godot 4.6, original only — no Giana assets,
code or level data. All art is procedural primitives, all audio is synthesized at runtime from
original DSP code (`game/src/logic/chiptune.gd`).

## Layout
```
game/            Godot project (open project.godot in the editor)
  src/logic/     pure-logic classes: player_state_machine, run_rules, chiptune,
                 camera_spring, anim_driver — headless-testable
  src/entities/  pickups, enemies, springs, checkpoints, gate, kill plane
  src/world..    player.gd + scenes under game/scenes/ (level: sugarwood.tscn)
  src/           main.gd (run flow), game_state.gd + audio_manager.gd (autoloads)
  tests/         unit suite (res://tests/run_tests.gd) + headless smoke (smoke_level.gd)
tools/blender/   asset builder (blender -b -P tools/blender/build_assets.py -> game/assets/*.glb)
scripts/         bun toolchain: ci, check-gd, e2e, zip-web, serve-web, gen-level
build/web/       exported Web build; build/shots/ screenshots
docs/            controls.md
```

## Requirements

- Godot 4.6 stable (`~/.local/bin/godot`) + web export templates
- Blender 5.1 (`~/.local/bin/blender`, only for `assets` stage)
- Bun ≥ 1.2; Chromium (auto: `~/.omp/puppeteer/chrome/...`) for e2e
- No network at runtime; build egress only toward the mirrors in AGENTS.md

## One-shot pipeline

```sh
bun scripts/ci.ts                 # import -> check -> unit -> smoke -> export -> zip -> e2e (fail fast)
bun scripts/ci.ts --stages=assets,import,check,unit,smoke,export,zip,e2e   # incl. blender asset rebuild
```

Individual stages: `bun run import|check|unit|export|zip|serve` (package.json) or
`bun scripts/e2e.ts [--full]` (browser suite over raw CDP: boot, input, console/page errors,
swiftshader fps, `--full` = alpha playthrough driven via the page-title state bridge).

## Play

`build/web/index.html` via any static server (`bun scripts/serve-web.ts build/web 8060`) or
run `game/` in the Godot editor (F5). Controls: see [docs/controls.md](docs/controls.md).

## Status

0.2.0-beta: fixed 3/4 camera (body yaw no longer orbits the boom, WASD stays screen-stable),
`?e2e=1` physics catch-up wired into the web shell, deterministic full-playthrough e2e
(11 checks incl. gem/stomp/checkpoint/death/gate via the title bridge).

0.1.0-alpha: full loop playable (3 lives, 40 gems, 200 s, checkpoints, 20-gem gate + flag win
screen, stomp/spring movement, 4 enemy types, chiptune SFX + music with M toggle, fog/shadow
lighting pass). Gameplay values live in `game/src/logic/run_rules.gd` — the only knobs file.
