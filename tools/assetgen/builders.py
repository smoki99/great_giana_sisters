# Static (unrigged) asset builders. Each takes (C, spec) and returns the joined object.
import math


def terrain(C, s):
    top = C.mat("top_" + s["id"], s["colors"]["top"], 0.8)
    side = C.mat("side_" + s["id"], s["colors"]["side"], 0.8)
    base = C.cube("base", (4.0, 4.0, 1.0), (0, 0, -0.5), side)
    cap = C.cube("cap", (4.0, 4.0, 0.18), (0, 0, 0.06), top)
    # lollipop bumps on grass / crystals on ice
    if s["id"] == "terrain_grass":
        bumps = [C.sph(f"b{i}", 0.18, (x, y, 0.2), top, 10, 6, (1, 1, 0.5))
                 for i, (x, y) in enumerate([(-1.3, -1.1), (0.9, 1.4), (1.6, -0.7)])]
        return C.finish(C.join([base, cap] + bumps, s["id"]), s["id"])
    spikes = [C.cone(f"sp{i}", 0.22, 0.7, (x, y, 0.45), top, verts=6)
              for i, (x, y) in enumerate([(-1.2, -1.2), (1.1, 1.2)])]
    return C.finish(C.join([base, cap] + spikes, s["id"]), s["id"])


def platform(C, s):
    base = C.mat("candy_" + s["id"], s["colors"]["base"], 0.4)
    stripe = C.mat("stripe_" + s["id"], s["colors"]["stripe"], 0.4)
    parts = [C.cube("p", (2.0, 1.0, 0.4), (0, 0, 0.2), base)]
    parts += [C.cube(f"s{i}", (0.25, 1.02, 0.42), (-0.75 + i * 0.5, 0, 0.2), stripe)
              for i in range(4)]
    return C.finish(C.join(parts, s["id"]), s["id"])


def block(C, s):
    b = C.mat("blk_" + s["id"], s["colors"]["base"], 0.5)
    ln = C.mat("ln_" + s["id"], s["colors"]["line"], 0.5)
    parts = [C.cube("b", (1.0, 1.0, 1.0), (0, 0, 0.5), b)]
    # seam lines
    parts += [C.cube("h", (1.02, 1.02, 0.04), (0, 0, z), ln) for z in (0.34, 0.67)]
    parts += [C.cube(f"v{z}{i}", (0.04, 1.02, 0.3), (x, 0, z), ln)
              for i, (x, z) in enumerate(((-0.25, 0.17), (0.25, 0.17), (0.0, 0.5),
                                          (-0.25, 0.83), (0.25, 0.83)))]
    if s.get("qmark"):
        parts += [C.cube(f"stem{z}", (0.14, 0.14, 0.14), (0.0, 0, z * 0.14 + 0.32), ln)
                  for z in range(4)]
        parts += [C.cube("qt", (0.42, 0.14, 0.14), (0, 0, 0.86), ln),
                  C.cube("qc", (0.14, 0.14, 0.16), (0.14, 0, 0.72), ln),
                  C.cube("qd", (0.28, 0.14, 0.14), (0.0, 0, 0.6), ln),
                  C.cube("qdot", (0.14, 0.14, 0.14), (0, 0, 0.36), ln)]
        # corner rivets
        parts += [C.sph(f"r{i}", 0.07, (x, y, 1.0), ln, 8, 6)
                  for i, (x, y) in enumerate([(-0.42, -0.42), (0.42, -0.42), (-0.42, 0.42), (0.42, 0.42)])]
    return C.finish(C.join(parts, s["id"]), s["id"])


def spring(C, s):
    base = C.mat("spr_" + s["id"], s["colors"]["base"], 0.45)
    plate = C.mat("spl_" + s["id"], s["colors"]["plate"], 0.35)
    parts = [C.cyl("foot", 0.45, 0.12, (0, 0, 0.06), base)]
    for i in range(3):
        parts.append(C.torus(f"co{i}", 0.3, 0.055, (0, 0, 0.22 + i * 0.16), base))
    parts.append(C.cyl("top", 0.42, 0.12, (0, 0, 0.78), plate))
    return C.finish(C.join(parts, s["id"]), s["id"])


def flag(C, s):
    pole = C.mat("pole_" + s["id"], s["colors"]["pole"], 0.35)
    cloth = C.mat("cloth_" + s["id"], s["colors"]["cloth"], 0.7)
    parts = [C.cyl("shaft", 0.06, 2.6, (0, 0, 1.3), pole, verts=10),
             C.sph("knob", 0.11, (0, 0, 2.66), pole, 10, 8),
             C.cube("cloth", (0.85, 0.04, 0.55), (0.47, 0, 2.3), cloth)]
    return C.finish(C.join(parts, s["id"]), s["id"])


def gate(C, s):
    frame = C.mat("fr_" + s["id"], s["colors"]["frame"], 0.4)
    portal = C.mat("po_" + s["id"], s["colors"]["portal"], 0.2)
    parts = [C.cyl("l", 0.14, 3.4, (-1.0, 0, 1.7), frame, verts=12),
             C.cyl("r", 0.14, 3.4, (1.0, 0, 1.7), frame, verts=12),
             C.cube("lintel", (2.35, 0.3, 0.32), (0, 0, 3.5), frame)]
    parts += [C.sph(f"k{i}", 0.16, (x, 0, 3.5), frame, 10, 8) for i, x in enumerate((-1.0, 1.0))]
    parts.append(C.cyl("portal", 0.85, 0.06, (0, 0, 2.15), portal, rot=(math.pi / 2, 0, 0), verts=24))
    return C.finish(C.join(parts, s["id"]), s["id"])


def gem(C, s):
    m = C.mat("gem_" + s["id"], s["colors"]["gem"], 0.15)
    top = C.cone("top", 0.28, 0.22, (0, 0, 0.4), m, verts=8)
    bot = C.cone("bot", 0.28, 0.34, (0, 0, 0.12), m, rot=(math.pi, 0, 0), verts=8)
    return C.finish(C.join([top, bot], s["id"]), s["id"])


def diamond(C, s):
    m = C.mat("dia_" + s["id"], s["colors"]["gem"], 0.1)
    top = C.cone("top", 0.4, 0.3, (0, 0, 0.6), m, verts=4)
    bot = C.cone("bot", 0.4, 0.55, (0, 0, 0.17), m, rot=(math.pi, 0, 0), verts=4)
    return C.finish(C.join([top, bot], s["id"]), s["id"])


def walker(C, s):
    body = C.mat("wb_" + s["id"], s["colors"]["body"], 0.6)
    foot = C.mat("wf_" + s["id"], s["colors"]["foot"], 0.6)
    eye = C.mat("we_" + s["id"], (1, 1, 1), 0.4)
    pupil = C.mat("wp_" + s["id"], (0.1, 0.05, 0.1), 0.4)
    parts = [C.sph("hump", 0.5, (0, 0, 0.55), body, 16, 10, (1.15, 1.0, 0.85))]
    parts += [C.sph(f"fe{i}", 0.17, (x, 0, 0.16), foot, 10, 8) for i, x in enumerate((-0.3, 0.3))]
    parts += [C.sph(f"ey{i}", 0.11, (x, -0.42, 0.72), eye, 10, 8) for i, x in enumerate((-0.17, 0.17))]
    parts += [C.sph(f"pu{i}", 0.05, (x, -0.52, 0.71), pupil, 8, 6) for i, x in enumerate((-0.17, 0.17))]
    parts += [C.cube(f"br{i}", (0.16, 0.05, 0.04), (x, -0.47, 0.85), foot,
                     rot=(0, 0, 0.35 if x < 0 else -0.35))
              for i, x in enumerate((-0.17, 0.17))]
    return C.finish(C.join(parts, s["id"]), s["id"])


def hopper(C, s):
    body = C.mat("hb_" + s["id"], s["colors"]["body"], 0.55)
    foot = C.mat("hf_" + s["id"], s["colors"]["foot"], 0.55)
    eye = C.mat("he_" + s["id"], (1, 1, 1), 0.4)
    pupil = C.mat("hp_" + s["id"], (0.1, 0.05, 0.1), 0.4)
    parts = [C.sph("ball", 0.45, (0, 0, 0.62), body, 16, 10, (1.0, 1.0, 0.9))]
    parts += [C.cyl(f"sp{i}", 0.07, 0.35, (x, 0, 0.2), foot) for i, x in enumerate((-0.18, 0.18))]
    parts += [C.sph(f"ft{i}", 0.14, (x, 0, 0.06), foot, 10, 8) for i, x in enumerate((-0.18, 0.18))]
    parts += [C.sph(f"ey{i}", 0.1, (x, -0.38, 0.75), eye, 10, 8) for i, x in enumerate((-0.15, 0.15))]
    parts += [C.sph(f"pu{i}", 0.045, (x, -0.46, 0.75), pupil, 8, 6) for i, x in enumerate((-0.15, 0.15))]
    parts.append(C.cone("horn", 0.09, 0.24, (0, 0, 1.12), foot, verts=8))
    return C.finish(C.join(parts, s["id"]), s["id"])


def tree(C, s):
    trunk = C.mat("tr_" + s["id"], s["colors"]["trunk"], 0.8)
    leaf = C.mat("lf_" + s["id"], s["colors"]["leaf"], 0.7)
    parts = [C.cyl("trunk", 0.22, 1.7, (0, 0, 0.85), trunk, verts=10)]
    if s.get("swirl"):
        parts.append(C.sph("sw", 0.95, (0, 0, 2.5), leaf, 16, 12, (1, 1, 0.8)))
        parts.append(C.sph("sw2", 0.4, (0, 0, 3.4), leaf, 12, 8))
    else:
        parts += [C.sph(f"c{i}", r, (x, y, z), leaf, 14, 10)
                  for i, (r, x, y, z) in enumerate(((0.9, 0, 0, 2.3), (0.6, 0.55, 0.2, 1.9), (0.55, -0.5, -0.3, 2.0)))]
    return C.finish(C.join(parts, s["id"]), s["id"])


def cloud(C, s):
    puff = C.mat("cl_" + s["id"], s["colors"]["puff"], 0.9)
    parts = [C.sph(f"p{i}", r, (x, 0, z), puff, 14, 10, (1, 0.75, 0.75))
             for i, (r, x, z) in enumerate(((0.55, -0.7, 0), (0.8, 0, 0.15), (0.6, 0.75, -0.05), (0.45, 0.3, -0.4)))]
    return C.finish(C.join(parts, s["id"]), s["id"])


def bush(C, s):
    leaf = C.mat("bs_" + s["id"], s["colors"]["leaf"], 0.75)
    parts = [C.sph(f"b{i}", r, (x, y, z), leaf, 12, 8, (1, 1, 0.8))
             for i, (r, x, y, z) in enumerate(((0.5, -0.4, 0, 0.4), (0.6, 0.15, 0.1, 0.5), (0.45, 0.6, -0.15, 0.36)))]
    if s.get("dots"):
        candy = C.mat("bd_" + s["id"], (1, 1, 1), 0.4)
        parts += [C.sph(f"d{i}", 0.09, (x, y, z), candy, 8, 6)
                  for i, (x, y, z) in enumerate(((-0.4, -0.3, 0.75), (0.1, -0.45, 0.9), (0.55, 0.2, 0.7)))]
    return C.finish(C.join(parts, s["id"]), s["id"])
