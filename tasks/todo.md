# TODO — Giana-like Sisters 3D

Mirror of `tasks/plan.md`. Check off only when the task's verification passed.

## Phase 0 — Repo foundation
- [ ] T1 Web export preset + package.json scripts
- [ ] T2 serve-web.ts / zip-web.ts / ci.ts skeleton
- [ ] T3 check-gd.ts static check
- [ ] Checkpoint 0: ci import+export+zip green; page loads in Chromium

## Phase 1 — Asset pipeline (parallel after T4)
- [ ] T4 build_assets.py framework (+determinism check)
- [ ] T5 Mia rig + 5 anims; Lina reskin
- [ ] T6 terrain tiles, platforms, brick/question block, spring, flag, gate
- [ ] T7 gem + diamond
- [ ] T8 walker + hopper
- [ ] T9 tree, cloud, bush (+variants)
- [ ] T10 preview contact sheet — **human visual gate**
- [ ] Checkpoint 1: 19 glb >5KB, godot --import clean

## Phase 2 — Player & camera (grey boxes, parallel to Phase 1)
- [ ] T11 input map, autoloads, main.tscn boot
- [ ] T12 player state machine + movement (tests first)
- [ ] T13 spring-arm camera (+math test)
- [ ] T14 animation driver
- [ ] T15 character select Mia/Lina
- [ ] Checkpoint 2: blockout playable, unit+boot green

## Phase 3 — Level & game loop
- [ ] T16 Sugarwood Glade tile level + kill-plane
- [ ] T17 gems + HUD counter
- [ ] T18 200s timer (test)
- [ ] T19 lives + respawn + game over (test)
- [ ] T20 checkpoint flag
- [ ] T21 diamond power-up 10s (test)
- [ ] T22 enemy placement + stomp/hit
- [ ] T23 spring pads
- [ ] T24 goal gate + win overlay
- [ ] Checkpoint 3: full loop playable, all tests green

## Phase 4 — Presentation & audio
- [ ] T25 lighting/sky/fog/scenery pass
- [ ] T26 SFX synth
- [ ] T27 music loop (if approved)
- [ ] T28 HUD art, title screen, controls overlay

## Phase 5 — Ship
- [ ] T29 ci.ts full pipeline
- [ ] T30 E2E browser smoke (screenshots, input probe, fps)
- [ ] T31 perf + zip-size pass
- [ ] T32 README, final zip, tag, push
- [ ] Final: SPEC success criteria 1–6 verified
