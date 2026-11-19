# Rigged character builder: chibi mesh rigid-bound to 8 bones, 5 actions.
import bpy
import math
BONES = [
    # name, head(xyz), tail(xyz), parent
    ("hips", (0, 0, 0.85), (0, 0, 1.0), None),
    ("spine", (0, 0, 1.0), (0, 0, 1.22), "hips"),
    ("head", (0, 0, 1.22), (0, 0, 1.6), "spine"),
    ("arm.L", (0.24, 0, 1.16), (0.24, 0, 0.88), "spine"),
    ("arm.R", (-0.24, 0, 1.16), (-0.24, 0, 0.88), "spine"),
    ("leg.L", (0.11, 0, 0.85), (0.11, 0, 0.4), "hips"),
    ("leg.R", (-0.11, 0, 0.85), (-0.11, 0, 0.4), "hips"),
    ("root", (0, 0, 0), (0, 0, 0.85), None),
]


def _mesh_parts(C, s):
    hair = C.mat("hair_" + s["id"], s["colors"]["hair"], 0.55)
    dress = C.mat("dress_" + s["id"], s["colors"]["dress"], 0.6)
    skin = C.mat("skin_" + s["id"], s["colors"]["skin"], 0.65)
    eye = C.mat("eye_" + s["id"], (0.12, 0.08, 0.15), 0.3)
    parts = []  # (obj, bone)
    head = C.sph("head", 0.23, (0, 0, 1.44), skin, 16, 12)
    cap = C.sph("hair", 0.245, (0, 0, 1.5), hair, 16, 10, (1, 1, 0.85))
    bang = C.cube("bang", (0.4, 0.14, 0.1), (0, -0.18, 1.55), hair)
    pony = C.sph("pony", 0.12, (0, 0.24, 1.5), hair, 10, 8, (1, 1.4, 1.4))
    dress_c = C.cone("dress", 0.3, 0.5, (0, 0, 0.98), dress, rot=(math.pi, 0, 0), verts=12, r2=0.17)
    nose = C.sph("nose", 0.03, (0, -0.23, 1.42), skin, 8, 6)
    eyes = [C.sph(f"ey{i}", 0.035, (x, -0.205, 1.47), eye, 8, 6) for i, x in enumerate((-0.09, 0.09))]
    arms = [C.cyl(f"arm{v}", 0.05, 0.28, (x, 0, 1.0), skin) for v, x in (("L", 0.24), ("R", -0.24))]
    hands = [C.sph(f"ha{i}", 0.06, (x, 0, 0.85), skin, 8, 6) for i, x in enumerate((0.24, -0.24))]
    legs = [C.cyl(f"leg{v}", 0.055, 0.62, (x, 0, 0.4), skin) for v, x in (("L", 0.11), ("R", -0.11))]
    shoes = [C.cube(f"sh{i}", (0.13, 0.22, 0.09), (x, -0.03, 0.05), hair) for i, x in enumerate((0.11, -0.11))]
    parts += [(head, "head"), (cap, "head"), (bang, "head"), (pony, "head"), (nose, "head")]
    parts += [(e, "head") for e in eyes]
    parts += [(dress_c, "spine")]
    parts += list(zip(arms + hands, ["arm.L", "arm.R", "arm.L", "arm.R"]))
    parts += list(zip(legs + shoes, ["leg.L", "leg.R", "leg.L", "leg.R"]))
    return parts


def _bind(C, obj, bone):
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")


def _armature(C, name):
    arm = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, arm)
    C._link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    edit = arm.edit_bones
    made = {}
    for bname, head, tail, parent in BONES:
        b = edit.new(bname)
        b.head, b.tail = head, tail
        if parent:
            b.parent = made[parent]
            b.use_connect = parent != "root"
        made[bname] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def _key(action, bone, path, idx, keys):
    cur = action.fcurves.new(f'pose.bones["{bone}"].{path}', index=idx)
    for fr, v in keys:
        kp = cur.keyframe_points.insert(fr, v)
        kp.interpolation = "LINEAR"
    return cur


def _act(name, frames):
    a = bpy.data.actions.new(name)
    a.frame_range[0] = 1
    a.frame_range[1] = frames
    return a


def _build(C, s):
    parts = _mesh_parts(C, s)
    for obj, bone in parts:
        _bind(C, obj, bone)
    mesh = C.join([o for o, _ in parts], s["id"])
    rig = _armature(C, s["id"] + "_rig")
    mesh.parent = rig
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    return mesh, rig


# actions: list of (pose_bone, (channel, index, [(frame, value)...]))
RUN = [
    ("leg.L", ("rotation_euler", 0, [(1, 0.6), (7, -0.6), (13, 0.6), (19, -0.6), (25, 0.6)])),
    ("leg.R", ("rotation_euler", 0, [(1, -0.6), (7, 0.6), (13, -0.6), (19, 0.6), (25, -0.6)])),
    ("arm.L", ("rotation_euler", 0, [(1, -0.5), (7, 0.5), (13, -0.5), (19, 0.5), (25, -0.5)])),
    ("arm.R", ("rotation_euler", 0, [(1, 0.5), (7, -0.5), (13, 0.5), (19, -0.5), (25, 0.5)])),
    ("hips", ("location", 2, [(1, 0.0), (4, -0.04), (7, 0.0), (10, -0.04), (13, 0.0), (16, -0.04), (19, 0.0), (22, -0.04), (25, 0.0)])),
]
IDLE = [
    ("arm.L", ("rotation_euler", 1, [(1, 0.06), (24, -0.06), (49, 0.06)])),
    ("arm.R", ("rotation_euler", 1, [(1, -0.06), (24, 0.06), (49, -0.06)])),
    ("head", ("rotation_euler", 1, [(1, 0.04), (24, -0.04), (49, 0.04)])),
    ("hips", ("location", 2, [(1, 0.0), (24, 0.015), (49, 0.0)])),
]
JUMP = [
    ("arm.L", ("rotation_euler", 0, [(1, -2.2), (4, -2.6), (10, -2.2)])),
    ("arm.R", ("rotation_euler", 0, [(1, -2.2), (4, -2.6), (10, -2.2)])),
    ("leg.L", ("rotation_euler", 0, [(1, 0.7), (5, 1.0), (10, 0.5)])),
    ("leg.R", ("rotation_euler", 0, [(1, 0.7), (5, 1.0), (10, 0.5)])),
    ("hips", ("location", 2, [(1, 0.06), (4, 0.09), (10, -0.02)])),
]
DOUBLE = [
    ("root", ("rotation_euler", 2, [(1, 0.0), (7, 3.14159), (13, 6.28319)])),
    ("arm.L", ("rotation_euler", 0, [(1, -1.4), (7, -2.8), (13, -1.4)])),
    ("arm.R", ("rotation_euler", 0, [(1, -1.4), (7, -2.8), (13, -1.4)])),
    ("leg.L", ("rotation_euler", 0, [(1, 0.4), (7, 0.9), (13, 0.4)])),
    ("leg.R", ("rotation_euler", 0, [(1, -0.4), (7, -0.9), (13, -0.4)])),
]
FALL = [
    ("arm.L", ("rotation_euler", 0, [(1, -2.4), (7, -1.9), (13, -2.4)])),
    ("arm.R", ("rotation_euler", 0, [(1, -1.9), (7, -2.4), (13, -1.9)])),
    ("leg.L", ("rotation_euler", 0, [(1, 0.2), (7, -0.15), (13, 0.2)])),
    ("leg.R", ("rotation_euler", 0, [(1, -0.15), (7, 0.2), (13, -0.15)])),
]
ACTIONS = [("idle", 48, IDLE), ("run", 24, RUN), ("jump", 10, JUMP),
           ("double_jump", 12, DOUBLE), ("fall", 12, FALL)]


def build(C, s):
    mesh, rig = _build(C, s)
    rig.animation_data_create()
    for _, _, tracks in ACTIONS:
        for bone, (path, _, _) in tracks:
            if path.startswith("rotation_euler"):
                rig.pose.bones[bone].rotation_mode = "XYZ"
    for aname, frames, tracks in ACTIONS:
        act = _act(aname, frames)
        for bone, (path, idx, keys) in tracks:
            _key(act, bone, path, idx, keys)
        strip_track = rig.animation_data.nla_tracks.new()
        strip_track.name = aname
        strip = strip_track.strips.new(aname, 1, act)
        strip.influence = 1.0
    return rig
