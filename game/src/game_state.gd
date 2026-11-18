extends Node
## Global run state (thin container; rules live in src/logic/ and are unit-tested).

signal playing_changed
signal gems_changed(count: int)
signal lives_changed(count: int)
signal timer_changed(seconds: float)
signal powerup_changed(active: bool)

const START_LIVES := 3
const LEVEL_TIME := 200.0

var playing := false:
	set(v):
		if playing != v:
			playing = v
			playing_changed.emit()
var gems := 0:
	set(v):
		if gems != v:
			gems = v
			gems_changed.emit(gems)
var lives := START_LIVES:
	set(v):
		if lives != v:
			lives = v
			lives_changed.emit(lives)
var time_left := LEVEL_TIME
var powerup_active := false:
	set(v):
		if powerup_active != v:
			powerup_active = v
			powerup_changed.emit(v)
var respawn_point := Vector3.ZERO
var selected_character := "mia"


func reset_run() -> void:
	gems = 0
	lives = START_LIVES
	time_left = LEVEL_TIME
	powerup_active = false
	respawn_point = Vector3.ZERO
