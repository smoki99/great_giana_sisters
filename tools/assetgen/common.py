# bpy helpers shared by all asset builders. No randomness outside explicit seeds.
import bpy
import math


def clear():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures,
                  bpy.data.actions, bpy.data.images):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def mat(name, rgba, rough=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgba, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    return m


def _link(obj):
    bpy.context.collection.objects.link(obj)
    return obj


def cube(name, size, loc, material, rot=(0.0, 0.0, 0.0)):
    mesh = bpy.data.meshes.new(name)
    s = [v / 2.0 for v in size]
    verts = [(x * s[0], y * s[1], z * s[2]) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    obj.rotation_euler = rot
    _link(obj)
    obj.data.materials.append(material)
    return obj


def cyl(name, r, depth, loc, material, rot=(0.0, 0.0, 0.0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                        location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def sph(name, r, loc, material, segs=16, rings=8, scale=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings,
                                         radius=r, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    return obj


def cone(name, r, depth, loc, material, rot=(0.0, 0.0, 0.0), verts=12, r2=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth,
                                    location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def torus(name, major, minor, loc, material, rot=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                     location=loc, rotation=rot,
                                     major_segments=20, minor_segments=8)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def set_origin(obj, point):
    for v in obj.data.vertices:
        v.co.x -= point[0]
        v.co.y -= point[1]
        v.co.z -= point[2]
    obj.location = point


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    out = bpy.context.active_object
    out.name = name
    return out


def finish(obj, name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.name = name
    return obj

def canonicalize(obj):
    """Rewrite the mesh with vertices/triangles in canonical lex order.

    Blender 4.5's Manifold-based primitive generators emit vertices/faces in a
    process-dependent order, so GLB bytes would not be reproducible otherwise.
    """
    import numpy as np
    me = obj.data
    me.calc_loop_triangles()
    nv = len(me.vertices)
    pos = np.empty(nv * 3, dtype=np.float32)
    me.vertices.foreach_get("co", pos)
    pos = pos.reshape(-1, 3)
    order = np.lexsort((pos[:, 2], pos[:, 1], pos[:, 0]))
    inv = np.empty(nv, dtype=np.int64)
    inv[order] = np.arange(nv, dtype=np.int64)
    nt = len(me.loop_triangles)
    vids = np.empty(nt * 3, dtype=np.int64)
    loops = np.empty(nt * 3, dtype=np.int64)
    me.loop_triangles.foreach_get("vertices", vids)
    me.loop_triangles.foreach_get("loops", loops)
    vids, loops = vids.reshape(-1, 3), loops.reshape(-1, 3)
    smooth = np.empty(nt, dtype=np.bool_)
    me.loop_triangles.foreach_get("use_smooth", smooth)
    matidx = np.empty(nt, dtype=np.int32)
    me.loop_triangles.foreach_get("material_index", matidx)
    newv = inv[vids]
    shift = np.argmin(newv, axis=1)
    sel = (np.arange(3)[None, :] - shift[:, None]) % 3
    newv_r = np.take_along_axis(newv, sel, axis=1)
    loops_r = np.take_along_axis(loops, sel, axis=1)
    ts = np.lexsort((newv_r[:, 2], newv_r[:, 1], newv_r[:, 0]))
    new_me = bpy.data.meshes.new(me.name + "_c")
    new_me.from_pydata(pos[order].tolist(), [], newv_r[ts].tolist())
    for m in me.materials:
        new_me.materials.append(m)
    smooth_s, mat_s = smooth[ts], matidx[ts]
    for i, p in enumerate(new_me.polygons):
        p.use_smooth = bool(smooth_s[i])
        p.material_index = int(mat_s[i])
    old_uv = me.uv_layers.active
    if old_uv:
        o = np.empty(len(old_uv.data) * 2, dtype=np.float32)
        old_uv.data.foreach_get("uv", o)
        nl = new_me.uv_layers.new(name=old_uv.name)
        nl.data.foreach_set("uv", o.reshape(-1, 2)[loops_r[ts].reshape(-1)].reshape(-1))
    weights = {}
    for v in me.vertices:
        if v.groups:
            weights[int(inv[v.index])] = {w.group: w.weight for w in v.groups}
    # Replacing mesh data clears the (mesh-backed) vertex group list; rebuild
    # groups in index order after the swap, then re-apply weights by name.
    gnames = {vg.index: vg.name for vg in obj.vertex_groups}
    old = obj.data
    obj.data = new_me
    bpy.data.meshes.remove(old)
    for idx in sorted(gnames):
        if idx >= len(obj.vertex_groups):
            obj.vertex_groups.new(name=gnames[idx])
    for vg in obj.vertex_groups:
        for i, d in weights.items():
            if vg.index in d:
                vg.add([i], d[vg.index], "REPLACE")


def export(objs, path):
    import os
    if not isinstance(objs, (list, tuple)):
        objs = [objs]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for o in objs:
        if o.type == "MESH":
            canonicalize(o)
    # Export on selection after canonical rebuilds replaced mesh data.
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[-1]
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB",
                              export_apply=False, export_yup=True,
                              export_skins=True, export_animations=True,
                              export_animation_mode="NLA_TRACKS",
                              export_optimize_animation_size=False,
                              export_image_format="NONE", export_extras=False)
