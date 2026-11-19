# TODO — v0.3 Candy 64 look & feel

Mirror of `tasks/plan.md` (v0.3). Check off only when the task's verification passed. Prior v0.1 M0–M5 checklist: complete + shipped as v0.1.0-alpha (see git history of this file).

## Phase A — Measurement (steps 1–2)
- [x] S1a cdp.ts TabKit + e2e refactor (e2e --full 11/11)
- [x] S1a main.gd __game_stats bridge + ?e2e=1/?slowmo=1 launch args
- [x] S1a shotgallery.ts 8-state condition-driven driver — one all-green run 2026-11-19 (0 errors, states 01–08 canonical, frames visually verified: 03 stride, 04 airborne, 06 LIVES 2)
- [x] S1a palette_lint.py + shots.ts lint gates
- [x] S1b red baselines recorded (sat 0.256 FAIL, contrast 0.285 PASS, fog 0.022 PASS, dc 1527–1832 FAIL)
- [ ] S2 commit toolchain + spec + baselines (gate: ci + e2e --full green)

**Checkpoint A** when S2 lands: gates red on color/perf while toolchain green.

## Phase B — beta1 World (steps 3–5)
- [ ] S3 world v1 merged ArrayMesh + bevels + refs-extracted palette — accept: dc ≤ 800, sat ≥ 0.30 trend
- [ ] S4 toon material (half-lambert + rim + vertex-color) + sky-colored height haze — accept: no grey band, renders swiftshader
- [ ] S5 gradient sky + sun tint + clouds; relight; tag v0.3.0-beta1 + push + zip

## Phase C — beta2 Camera + character (steps 6–8)
- [ ] S6 camera_spring v2: follow-lag, speed FOV, lookahead, jump-lead, wall push-in + unit tests
- [ ] S7 character v2: chunky model, blink/eye-track, pigtail spring (+tests)
- [ ] S8 tag v0.3.0-beta2 + zip + push

## Phase D — beta3 Juice (steps 9–11)
- [ ] S9 squash&stretch + landing dust + jump puffs
- [ ] S10 gem magnet/pop-punch/sparkle + HUD tween
- [ ] S11 tag v0.3.0-beta3 + zip + push

## Phase E — beta4 Feel + audio (steps 12–14)
- [ ] S12 run_rules: coyote/buffer/air-control/momentum + hit-stop/shake/blink + enemy squash
- [ ] S13 pitch-ladder pickups, damage stinger, low-time pressure, land thud
- [ ] S14 tag v0.3.0-beta4 — palette lint HARD GREEN (sat ≥ 0.35)

## Phase F — beta5 Ship (step 15)
- [ ] S15 2× stability, lint stage in ci.ts, README/CHANGELOG, zip, tag v0.3.0-beta5, push
