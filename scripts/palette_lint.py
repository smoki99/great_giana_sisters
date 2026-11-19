#!/usr/bin/env python3
"""palette_lint.py — color gates for the shot gallery (SPEC v0.3 §Visual QA).

Rules (all on build/shots/gallery/):
  saturation  mean HSV saturation of 02..08 >= 0.35
  contrast    |L(playfield) - L(sky)| >= 0.25   on 08_scene.png
  fog-wall    horizon band within 0.12 delta-L of sky (no visible seam) on 08_scene.png

Exit 0 all pass, 1 any fail, 2 inputs missing. Prints one `PASS/FAIL rule :: detail`
line per rule (consumed by scripts/shots.ts and humans).
"""
import os
import sys

import numpy as np
from PIL import Image

GALLERY = sys.argv[1] if len(sys.argv) > 1 else "build/shots/gallery"


def load(name):
    p = os.path.join(GALLERY, name)
    if not os.path.exists(p):
        return None
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.float64) / 255.0


def hsv_srgb(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(-1)
    mn = rgb.min(-1)
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return s, lum


def sky_mask(rgb):
    """Rows contiguous from the top matching the top-line dominant color -> sky."""
    h = rgb.shape[0]
    top = rgb[: max(8, h // 40)]
    ref = np.median(top.reshape(-1, 3), axis=0)
    dist = np.abs(rgb - ref).max(-1)
    close = dist < 0.06
    # keep only rows connected to the top edge
    keep = np.zeros_like(close)
    for y in range(h):
        if close[y].mean() < 0.5:
            break
        keep[y] = close[y]
    return keep, ref


results = []


def rule(name, ok, detail):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'} {name} :: {detail}")


# --- saturation over gameplay shots (title card is intentionally dim) ---
GAMEPLAY = [f"0{n}_{'idle run jump gem damage respawn scene'.split()[n - 2]}.png" for n in range(2, 9)]
sats = []
for name in GAMEPLAY:
    img = load(name)
    if img is None:
        rule("saturation", False, f"missing {name}")
        break
    s, _ = hsv_srgb(img)
    sats.append(float(s.mean()))
else:
    mean_sat = float(np.mean(sats))
    rule("saturation", mean_sat >= 0.35, f"mean S {mean_sat:.3f} (>= 0.35) over {len(sats)} shots, min {min(sats):.3f}")

# --- contrast + fog wall on the wide scene shot ---
scene = load("08_scene.png")
if scene is not None:
    sky, _ = sky_mask(scene)
    h = scene.shape[0]
    sky_frac = float(sky.mean())
    if sky_frac < 0.01:
        rule("contrast", False, f"no sky region detected in 08_scene (coverage {sky_frac:.3f})")
        rule("fog-wall", False, "skipped with no sky region")
    else:
        _, lum = hsv_srgb(scene)
        l_sky = float(lum[sky].mean())
        # playfield: bottom band well below the horizon, sky excluded
        bottom = lum[int(h * 0.65):, :]
        l_field = float(bottom.mean())
        rule("contrast", abs(l_field - l_sky) >= 0.25,
             f"|L_field {l_field:.3f} - L_sky {l_sky:.3f}| = {abs(l_field - l_sky):.3f} (>= 0.25)")
        # horizon band = last sky rows + first non-sky rows around the seam
        rows_sky = np.where(sky.any(1))[0]
        seam = int(rows_sky.max()) if rows_sky.size else 0
        band = lum[max(0, seam - h // 30): seam + h // 30, :]
        l_band = float(band.mean())
        rule("fog-wall", abs(l_band - l_sky) < 0.12,
             f"horizon band L {l_band:.3f} vs sky {l_sky:.3f}: delta {abs(l_band - l_sky):.3f} (< 0.12)")
else:
    rule("contrast", False, "missing 08_scene.png")
    rule("fog-wall", False, "missing 08_scene.png")

sys.exit(0 if all(results) else 1)
