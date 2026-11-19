# TODO — Mia in Candy Land

Mirror of `tasks/plan.md`. Check off only when the task's verification passed.

## Phase 0 — Repo foundation
- [X] T1 Web export preset + package.json scripts
- [X] T2 serve-web.ts / zip-web.ts / ci.ts skeleton
- [X] T3 check-gd.ts static check
- [X] Checkpoint 0: ci import+export+zip green; page loads in Chromium (canvas+SAB ok; E2E needs browser flag `--enable-unsafe-swiftshader`)

## Phase 1 — Asset pipeline (parallel after T4)
- [x] T4 build_assets.py framework (+determinism check)
- [x] T5 Mia rig + 5 anims; Lina reskin
- [x] T6 terrain tiles, platforms, brick/question block, spring, flag, gate
- [x] T7 gem + diamond
- [x] T8 walker + hopper
- [x] T9 tree, cloud, bush (+variants)
- [x] T10 preview contact sheet — **human visual gate**
- [x] Checkpoint 1: 19 glb >5KB, godot --import clean

## Phase 2 — Player & camera (grey boxes, parallel to Phase 1)
- [X] T11 input map, autoloads, main.tscn boot
- [X] T12 player state machine + movement (11 unit checks green + browser proof)
- [x] T13 spring-arm camera (+math test)
- [x] T14 animation driver
- [x] T15 character select Mia/Lina
- [x] Checkpoint 2: blockout playable, unit+boot green

## Phase 3 — Level & game loop
- [x] T16 Sugarwood Glade tile level + kill-plane
- [x] T17 gems + HUD counter
- [x] T18 200s timer (test)
- [x] T19 lives + respawn + game over (test)
- [x] T20 checkpoint flag
- [x] T21 diamond power-up 10s (test)
- [x] T22 enemy placement + stomp/hit
- [x] T23 spring pads
- [x] T24 goal gate + win overlay
- [x] Checkpoint 3: full loop playable, all tests green

## Phase 4 — Presentation & audio
- [x] T25 lighting/sky/fog/scenery pass
- [x] T26 SFX synth
- [x] T27 music loop (20 s, M toggle)
- [x] T28 HUD art, title screen, controls overlay

## Phase 5 — Ship
- [ ] T29 ci.ts full pipeline
- [ ] T30 E2E browser smoke (screenshots, input probe, fps)
- [ ] T31 perf + zip-size pass
- [ ] T32 README, final zip, tag, push
- [ ] Final: SPEC success criteria 1–6 verified
