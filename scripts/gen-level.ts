// gen-level.ts — deterministic Sugarwood Glade (T16-T24) builder.
// usage: bun scripts/gen-level.ts   -> game/scenes/levels/sugarwood.tscn
// ASCII legend (cell = 4 units, 30x10 grid = 120x40 m):
//  . grass tile   - gap        1..3 brick column (N tall, walkable top)
//  c candy shelf  g gem        d diamond powerup
//  w walker       h hopper     s spring pad
//  K checkpoint   G goal gate  P player spawn
//  T tree  t candy tree  B bush  b candy bush  C cloud
const CELL = 4;
const GY = 0.79; // grass top surface y
const MAP = [
	"C....c.....TT.......c........c",
	"..g....g.......TT....g........",
	"P.g.s....--...K...--..s..211.G",
	"....b....--.......--......1...",
	"..w..11..w.g.h..2..b...111..b.",
	"..T......B.......C........T..",
	"....g.g....d.......g..........",
	"...b......T....w.......B...g.",
	"C.......b..g...C......T....g..",
	"....T.......b.....T...........",
];
for (let i = 0; i < MAP.length; i++) MAP[i] = MAP[i].padEnd(30, "."); // hand-written rows tolerate short tails

const GLB: Record<string, string> = {
	grass: "res://assets/models/terrain/terrain_grass.glb",
	brick: "res://assets/models/props/block_brick.glb",
	candy: "res://assets/models/props/platform_candy.glb",
	tree: "res://assets/models/scenery/tree.glb",
	tree_candy: "res://assets/models/scenery/tree_candy.glb",
	bush: "res://assets/models/scenery/bush.glb",
	bush_candy: "res://assets/models/scenery/bush_candy.glb",
	cloud: "res://assets/models/scenery/cloud.glb",
};
const ENT: Record<string, string> = {
	g: "res://scenes/entities/gem.tscn",
	d: "res://scenes/entities/diamond.tscn",
	w: "res://scenes/entities/walker.tscn",
	h: "res://scenes/entities/hopper.tscn",
	s: "res://scenes/entities/spring.tscn",
	K: "res://scenes/entities/checkpoint.tscn",
	G: "res://scenes/entities/gate.tscn",
};
const ENT_Y: Record<string, number> = { g: 0, d: 0, w: 0.55, h: 1.05, s: -0.05, K: 0, G: 1.3 };

const T = (x: number, y: number, z: number) => `Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, ${x}, ${y}, ${z})`;
const RY = (a: number, x: number, y: number, z: number) =>
	`Transform3D(${Math.cos(a).toFixed(6)}, 0, ${Math.sin(a).toFixed(6)}, 0, 1, 0, ${(-Math.sin(a)).toFixed(6)}, 0, ${Math.cos(a).toFixed(6)}, ${x}, ${y}, ${z})`;

const extIds = new Map<string, string>();
let extCount = 0;
function ext(path: string): string {
	let id = extIds.get(path);
	if (!id) { id = `e${++extCount}`; extIds.set(path, id); }
	return id;
}
const nodes: string[] = [];
let spawn: [number, number] | null = null;
let n = 0;
const uniq = (p: string) => `${p}_${n++}`;

for (let row = 0; row < MAP.length; row++) {
	for (let col = 0; col < 30; col++) {
		const ch = MAP[row][col];
		const x = col * CELL, z = row * CELL;
		const rot = ((row * 7 + col * 13) % 4) * (Math.PI / 2); // stable scenery variety
		if (ch !== "-") { // solid ground under tiles AND under every entity/spawn cell
			nodes.push(`[node name="${uniq("tile")}" parent="Terrain" instance=ExtResource("${ext(GLB.grass)}")]\ntransform = ${T(x, 0, z)}`);
			nodes.push(`[node name="${uniq("tcol")}" type="CollisionShape3D" parent="Terrain"]\ntransform = ${T(x, 0.145, z)}\nshape = SubResource("grass_shape")`);
		}
		if (ch === "1" || ch === "2" || ch === "3") {
			const tall = Number(ch);
			for (let i = 0; i < tall; i++)
				nodes.push(`[node name="${uniq("brick")}" parent="Terrain" instance=ExtResource("${ext(GLB.brick)}")]\ntransform = ${T(x, GY + 0.5 + i, z)}`);
			nodes.push(`[node name="${uniq("bcol")}" type="CollisionShape3D" parent="Terrain"]\ntransform = ${T(x, GY + tall / 2, z)}\nshape = SubResource("brick_col_${tall}")`);
		} else if (ch === "c") {
			nodes.push(`[node name="${uniq("shelf")}" parent="Terrain" instance=ExtResource("${ext(GLB.candy)}")]\ntransform = ${T(x, GY + 2.2, z)}`);
			nodes.push(`[node name="${uniq("scol")}" type="CollisionShape3D" parent="Terrain"]\ntransform = ${T(x, GY + 2.2, z)}\nshape = SubResource("candy_shape")`);
		} else if ("TtBbC".includes(ch)) {
			const key = ({ T: "tree", t: "tree_candy", B: "bush", b: "bush_candy", C: "cloud" } as Record<string, string>)[ch];
			const y = ch === "C" ? GY + 6.5 + (row % 3) * 1.3 : GY - (ch === "T" || ch === "t" ? 0.85 : 0.4);
			nodes.push(`[node name="${uniq(key)}" parent="Scenery" instance=ExtResource("${ext(GLB[key])}")]\ntransform = ${RY(rot, x, y, z)}`);
		} else if (ch === "P") {
			spawn = [x, z];
		} else if (ch !== "." && ch !== "-") {
			const scene = ENT[ch];
			if (!scene) throw new Error(`bad map char '${ch}' at ${row},${col}`);
			nodes.push(`[node name="${uniq("e_" + ch)}" parent="Entities" instance=ExtResource("${ext(scene)}")]\ntransform = ${T(x, GY + ENT_Y[ch], z)}`);
		}
	}
}
if (!spawn) throw new Error("no spawn P in map");
ext("res://src/entities/kill_plane.gd");
ext("res://src/player.gd");

const px = spawn[0], pz = spawn[1];
const SUBS = 11; // sky_mat, sky, env, grass_shape, brick_col_1/2/3, candy_shape, kill_shape, body_shape
const loadSteps = extIds.size + SUBS + 1;
const extLines = [...extIds.entries()].map(([p, id]) =>
	`[ext_resource type="${p.endsWith(".gd") ? "Script" : "PackedScene"}" path="${p}" id="${id}"]`).join("\n");

const out = `[gd_scene load_steps=${loadSteps} format=3]

${extLines}

[sub_resource type="ProceduralSkyMaterial" id="sky_mat"]
sky_top_color = Color(0.25, 0.72, 1, 1)
sky_horizon_color = Color(0.82, 0.95, 0.92, 1)
ground_bottom_color = Color(0.34, 0.52, 0.42, 1)
ground_horizon_color = Color(0.82, 0.95, 0.92, 1)

[sub_resource type="Sky" id="sky"]
sky_material = SubResource("sky_mat")

[sub_resource type="Environment" id="env"]
background_mode = 2
sky = SubResource("sky")
tonemap_mode = 1
tonemap_white = 1.35
ambient_light_source = 2
ambient_light_color = Color(0.85, 0.88, 1, 1)
ambient_light_energy = 0.35
fog_enabled = true
fog_light_color = Color(0.82, 0.95, 0.92, 1)
fog_density = 0.0055
fog_sky_affect = 0.35

[sub_resource type="BoxShape3D" id="grass_shape"]
size = Vector3(4, 1.29, 4)

[sub_resource type="BoxShape3D" id="brick_col_1"]
size = Vector3(1.02, 1, 1.02)

[sub_resource type="BoxShape3D" id="brick_col_2"]
size = Vector3(1.02, 2, 1.02)

[sub_resource type="BoxShape3D" id="brick_col_3"]
size = Vector3(1.02, 3, 1.02)

[sub_resource type="BoxShape3D" id="candy_shape"]
size = Vector3(2, 0.42, 1.02)

[sub_resource type="BoxShape3D" id="kill_shape"]
size = Vector3(240, 1, 80)

[sub_resource type="CapsuleShape3D" id="body_shape"]
radius = 0.4
height = 1.7

[node name="Sugarwood" type="Node3D"]

[node name="WorldEnvironment" type="WorldEnvironment" parent="."]
environment = SubResource("env")

[node name="Sun" type="DirectionalLight3D" parent="."]
transform = Transform3D(0.866025, -0.353553, 0.353553, 0, 0.707107, 0.707107, -0.5, -0.612372, 0.612372, 0, 12, 0)
shadow_enabled = true
directional_shadow_max_distance = 80.0

[node name="Terrain" type="StaticBody3D" parent="."]

[node name="Scenery" type="Node3D" parent="."]

[node name="Entities" type="Node3D" parent="."]

${nodes.join("\n\n")}

[node name="KillPlane" type="Area3D" parent="."]
script = ExtResource("${ext("res://src/entities/kill_plane.gd")}")

[node name="Coll" type="CollisionShape3D" parent="KillPlane"]
transform = ${T(60, -6, 20)}
shape = SubResource("kill_shape")

[node name="Player" type="CharacterBody3D" parent="."]
transform = ${T(px, GY + 0.05, pz)}
script = ExtResource("${ext("res://src/player.gd")}")

[node name="Model" type="Node3D" parent="Player"]

[node name="Coll" type="CollisionShape3D" parent="Player"]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0.95, 0)
shape = SubResource("body_shape")

[node name="Boom" type="Node3D" parent="Player"]
transform = Transform3D(1, 0, 0, 0, 0.965926, 0.258819, 0, -0.258819, 0.965926, 0, 1.6, 0)

[node name="Arm" type="SpringArm3D" parent="Player/Boom"]
spring_length = 6.0

[node name="Cam" type="Camera3D" parent="Player/Boom/Arm"]
current = true
fov = 70.0
`;
await Bun.write("game/scenes/levels/sugarwood.tscn", out);
console.log(`gen-level: ${n} nodes -> sugarwood.tscn (spawn ${px},${pz}, ${extIds.size} ext, load_steps ${loadSteps})`);
