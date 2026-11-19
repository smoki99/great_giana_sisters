# Implementation Plan: v0.3 — Candy 64 look & feel

Supersedes the v0.1 M0–M5 plan (all 32 tasks completed and shipped as v0.1.0-alpha; its mirror lived in `tasks/todo.md`, recoverable from git history). Spec of record: `docs/SPEC-v0.3-look-and-feel.md` — this plan instantiates its 15 steps as acceptance-verifiable tasks. Task list target: `tasks/todo.md`.

## Overview

Players say the game "doesn't look good". Target: M64-grade collectathon feel — saturated candy world, character-camera, momentum-first movement, expressive chunky character, juice everywhere — shipped as five tagged zipped betas (v0.3.0-beta1..5), each gated by the screenshot/perf toolchain (S1).

## Architecture decisions

- **Measure first**: visual QA toolchain (`scripts/cdp.ts` TabKit, `shotgallery.ts`, `shots.ts lint`, `palette_lint.py`, `main.gd` `__game_stats` + title bridges) is the dependency root; today's grey-box red baseline (sat 0.285, contrast 0.148, dc ~1530) is the proof the gates bite.
- **Gallery choreography is condition-driven**: swiftshader renders 1–2 fps under screenshot load while the sim tracks real time (one paused screenshot walks the player ~5 m), so all driving uses ≤600 ms pulses + title-bridge state reads; `?slowmo=1` launch arg caps physics at 1 step/frame for margin.
- Pure logic stays in `*_spring.gd`/`run_rules.gd` static funcs, unit-tested headless; side effects in scene nodes.
- World-art = merged ArrayMesh per tile type (kills per-box draw calls); toon look via half-lambert + rim shader; sky-colored height haze instead of grey fog wall.
- Every beta commit gate: unit tests + `e2e --full` 11/11 + (from b1) `shots.ts lint` trend, hard-green at b4.

## Task List

### Phase A — Measurement (steps 1–2, no beta)

- [x] **S1a: Toolchain** — `cdp.ts` shared TabKit (e2e refactor), `main.gd` stats bridge + `?e2e=1`/`?slowmo=1` args, `shotgallery.ts` 8-state driver, `palette_lint.py` + `shots.ts lint` (dc ≤ 260). Done & individually proven (red baseline recorded).
- [ ] **S1b: Gallery choreography green** — one run where all 8 shots land in their canonical states: 01 title overlay; 02 idle X0 L3 G0; 03 run mid-stride D held, ground; 04 jump mid-air; 05 gem G≥1; 06 damage L2 (exactly one life lost); 07 respawn playing X0; 08 scene X≥14. Accept: run log shows regex-matching title per shot, `errors console=0 page=0`, no WARN lines. Verify: `bun scripts/shotgallery.ts` exit 0; visual eyeball of `build/shots/gallery/*.png`; `bun scripts/shots.ts lint` fails ONLY on color/dc gates (never missing-file/perf-bridge errors). Deps: S1a. Files: `scripts/shotgallery.ts`. Scope S–M.
- [ ] **S2: Commit toolchain + spec + red baselines** — one commit: 4 scripts + `main.gd` args + spec (toolchain section, dc baseline 1530) + `build/shots/gallery` NOT committed (artifacts stay gitignored). Accept: `bun ci --stages=check,unit` green; e2e --full green (main.gd changed). Deps: S1b. Scope S.

**Checkpoint A**: gates demonstrably red on color/perf while toolchain is green; everything committed.

### Phase B — beta1 World (steps 3–5)

- [ ] **S3: World v1 merged meshes** — per-tile-type merged ArrayMesh + edge bevels + vertex-color palette extracted (PIL) from `docs/refs/` screenshots. Accept: dc ≤ 800 (measured by lint, down from ~1530); palette lint saturation trending ≥ 0.30; unit + e2e green. Deps: Checkpoint A. Files: `game/scripts/gen_level*`, new `scripts/extract_palette.py`. Scope L→split on mesh-gen + color-map tasks if >5 files.
- [ ] **S4: Toon material** — half-lambert ramp + rim + vertex-color modulate ShaderMaterial; fog replaced by sky-colored height haze. Accept: no grey horizon band (fog-wall ΔL < 0.12 passes); renders under swiftshader (gallery run works); contrast gate measured. Deps: S3. Files: `game/src/*` material/shader + gen hookup. Scope M.
- [ ] **S5: Sky + relight + tag b1** — gradient sky shader, sun tint, drifting cloud billboards; light relight; gallery re-render; commit; `git tag -a v0.3.0-beta1` + push gitea; zip. Accept: lint contrast ≥ 0.25 green-or-near (documented); tag pushed; zip builds (`bun scripts/zip-web.ts`). Deps: S4. Scope M.

**Checkpoint b1**: playable beta1 zip; e2e 2× green; gallery saved; tag on gitea.

### Phase C — beta2 Camera + character (steps 6–8)

- [ ] **S6: Camera v2** — pure `camera_spring.gd` v2: follow-lag/cornering, speed→distance/FOV, lookahead, jump-lead, wall-ray push-in; unit tests incl. 0.5–1.2 s 90% yaw settle on scripted route. Deps: b1. Scope M (2 files + tests).
- [ ] **S7: Character v2** — chunky model rebuild (head/hands/eyes) via `tools/blender`, blink + pupil eye-track, pigtail spring (pure anim math + tests). Accept: regenerated GLBs deterministic; gallery run still green. Deps: b1 (parallel with S6). Scope L → split model-gen vs shader-driven face rig.
- [ ] **S8: Tag v0.3.0-beta2** + zip + push. Deps: S6, S7. Scope XS.

**Checkpoint b2**: feel review (camera trace test green); 0 console errors on hosted run.

### Phase D — beta3 Juice (steps 9–11)

- [ ] **S9: Squash & stretch + dust/puff particles** (land/jump). Accept: gallery 03/04 shots show deformed poses; no fps cliff (< baseline −20%). Deps: b2. Scope M.
- [ ] **S10: Gem magnet + pop-punch + sparkle + HUD counter tween.** Accept: e2e gem pickup still asserts G++; new pure-fn magnet tests. Deps: b2. Scope M.
- [ ] **S11: Tag v0.3.0-beta3** + zip + push. Deps: S9, S10. XS.

### Phase E — beta4 Feel + audio (steps 12–14)

- [ ] **S12: run_rules feel pack** — coyote 0.12 s, input buffer 0.15 s, full air control, jump momentum purity (X-velocity continuity asserted in e2e), slide/double bonuses; hit-stop + camera shake + damage blink; enemy squash/flash. Deps: b3. Scope L → split physics-rules vs feedback-fx.
- [ ] **S13: Audio-juice** — pickup pitch ladder, damage stinger, low-time pressure, land thud (`chiptune.gd` extension + pure note-table tests). Deps: b3 (parallel S12). Scope M.
- [ ] **S14: Tag v0.3.0-beta4; palette lint HARD GREEN** (sat ≥ 0.35, contrast ≥ 0.25, fog wall < 0.12). Deps: S12, S13. Scope S.

**Checkpoint b4**: all three color gates green — the "looks good" proof.

### Phase F — beta5 Ship (step 15)

- [ ] **S15: Stability + CI + docs + ship** — 2× consecutive `e2e --full` green; `shots.ts lint` wired into `ci.ts` as perf gate stage; README/CHANGELOG; zip; tag v0.3.0-beta5; push gitea. Accept: single `bun scripts/ci.ts --stages=…` run green end-to-end incl. lint stage; tag + zip published. Deps: b4. Scope M.

**Final checkpoint**: spec success criteria 1–5 all demonstrated; five tags on gitea; CI includes visual gates.

## Dependency order

S1 → S2 → S3 → S4 → S5(b1) → {S6 ∥ S7} → S8(b2) → {S9 ∥ S10} → S11(b3) → {S12 ∥ S13} → S14(b4) → S15(b5).

## Parallelization

S6/S7, S9/S10, S12/S13 pairs touch disjoint files (`camera_spring.gd` vs blender/anim; fx vs audio) — safe across sessions; tags and `ci.ts`/`main.gd` edits stay sequential (single owner).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Gallery choreography flaky under swiftshader timing | Med | condition-driven pulses + slowmo arg (done); retry-once wrapper; worst case manual-shot mode flag |
| Contrast/saturation gates ungreenable without full re-art | High | S3/S4 measured per step; palette extracted from refs guarantees hues; gate hard deadline only at b4 |
| dc ≤ 260 unreachable with merged meshes + sprites | High | measured baseline now honest (1530); interim ≤ 800 at S3, re-decide 260 with data at S5 (spec correction allowed, not silent) |
| Camera/feel changes break existing 11 e2e checks | Med | check semantics frozen (boundary rule); pure-fn tests first |
| Blender rebuild nondeterminism | Low | byte-compare GLB check exists (T4 determinism) |

## Open questions

1. dc budget 260 — reconfirm at S5 with merged-mesh + clouds numbers (spec line already flags 1530 baseline).
2. Cloud billboards vs sky-mesh painted clouds at b1? (default billboards; decide on fps data)
3. Free-camera (C-stick) stays out of v0.3? (spec default: no)

## Task list target

`tasks/todo.md` holds the live checklist (mirror of above; check only on passing verification).
