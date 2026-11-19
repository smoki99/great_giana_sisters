# Research pack: what makes Mario 64 feel/look right

Sources gathered 2026-11-19 (text via search/reader; images downloaded to this dir, mariowiki `mario.wiki.gallery` CDN).

## Camera ("Lakitu")

- M64's camera is a *character*: follows at distance+angle, collides with the world, and lives in **volumetric per-area zones** (Bob-omb Battlefield analysis PDF): each zone picks height/pitch/distance; transitions snap-blend.
- Known failure cases the game accepted: narrow corridors (can't keep distance), wall clipping, rotating geometry → disorientation. Modern fixes: camera-collision raycasts + wall-avoidance vertical drift (Ratchet/Spyro lineage), which we adopt (M64-era purity stops at smoothing + zone presets).
- Follow lag is the feel: camera lerps toward target instead of rigid attach; heading-change cornering lag reads as weight.
- Ref: bosnan.net "The Third Person's Eye"; avclub "camera as friend and foe"; 947a5246…pdf BoB level-design analysis.

## Movement/physics feel (community consensus)

- r/casualnintendo: "The movement is sublime… **momentum carries over into other moves**" — jump inherits run velocity exactly; landings keep slide; no velocity resets except hard stops.
- GameTheorists physics thread + TASVideos/ukikipedia: acceleration is a *pair of constants* (accel 0.06, friction 0.915-ish per frame, terminal ~8.3 units/30fps); the famous BLJ exists because **the speed cap applied asymmetrically** — a reminder: cap forward speed, keep deceleration smooth, never teleport velocity.
- r/gamedesign (ixaoej): team prototyped *only movement* for months before any level existed — movement constants ARE the product.
- Giles Goddard interview (pixelatron): **animations were authored before gameplay code existed**; character animation drives perceived physics (stretch on jump, squash on land).
- Speedrun layer (Long Jump, koopa cancel): jump-out-of-slide, held-direction at landing = speed bonuses → "input buffer + directional intent" window (~1-2 frames) worth emulating lightly: our double-jump + slide should grant small velocity bonuses for correct timing.

## Look (N64 aesthetic that still works)

- Flat/vertex-color shading, **bright saturated palette, high value** (videocue.io N64 look; polylusion history): low-poly + bevel-rounded silhouettes, strong object/ground contrast.
- Unity n64-lighting thread: emulate with **half-lambert + tiny color quantization + vertex color modulate**, no speculars; fog = *height/sky-colored* haze, never a grey wall.
- Palette extraction targets (see images): BoB (grass green #6CB038-ish, dirt tan, sky cyan), Tall Tall Mountain (warm browns + vivid green), Whomp's Fortress (stone grey + candy red/gold accents), Rainbow (high-sat gradient). We extract exact bands with PIL (`~/.local/opt/py/bin/python3`, pillow+numpy installed).
- Characters: chunky primitives + huge head/eyes ratio (Mario ~ 1:2 head:body), visible blink/face (Long_Jump artwork ref).

## Downloaded references

| file | use |
|---|---|
| mw_SM64_Screenshot_Bob-omb_Battlefield.png | daylight palette bands, platform readability |
| mw_SM64_Screenshot_TallTall.png / Cool__Cool_Mountain.png | warm/cool alt palettes, fog color against sky |
| mw_SM64_Screenshot_Whomp's_Fortress (Whomp.png) | stone + accent color scheme |
| mw_SM64_Screenshot_Circular_Rainbow.png / Rainbow_Ride.png | high-sat gradient sanity |
| mw_SM64_Screenshot_Big_Boo's_Haunt.png | dark-level lighting contrast |
| mw_SM64-Mario_Long_Jump_Artwork_Alt.png | silhouette proportions |

## Translated design rules for Mia in Candy Land v0.3

1. Fixed-boom camera with exponential follow lag + cornering yaw lag + speed-reactive distance/FOV + lookahead; wall-ray push-in.
2. Momentum is sacred: velocity passes through jump/land/slide unmodified (except intentional bonuses); cap speed smoothly.
3. Squash & stretch on every state change; blink + eye track; secondary motion on pigtails.
4. World: merged per-tile-type meshes, beveled silhouettes, vertex-color candy palette extracted from refs, half-lambert toon shader, sky-colored height fog, gradient sky + sun + drifting clouds.
5. Juice: dust, sparkles, pop-scale, pitch-ladder pickup sound, pickup magnet, hit-stop + shake on damage, blink-invincibility.
6. Every visual change measurable: state-shot gallery + palette/contrast lint + perf budget in CI.
