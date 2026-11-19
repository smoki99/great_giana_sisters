class_name GameState
extends RefCounted
## Global run state (static container; rules live in src/logic/ and are unit-tested).

const START_LIVES := 3
const LEVEL_TIME := 200.0

static var playing := false
static var gems := 0
static var lives := START_LIVES
static var time_left := LEVEL_TIME
static var powerup_active := false
static var respawn_point := Vector3.ZERO
static var selected_character := "mia"

## Sound event bus: AudioManager assigns a Callable; emitters never touch audio code.
static var on_sfx: Callable


static func reset_run() -> void:
	gems = 0
	lives = START_LIVES
	time_left = LEVEL_TIME
	powerup_active = false
	respawn_point = Vector3.ZERO


static func fx(name: String) -> void:
	if on_sfx.is_valid():
		on_sfx.call(name)
