class_name PlayerStateMachine
extends RefCounted
## Pure player state logic — no engine, no nodes; unit-tested in tests/.

enum State { AIRBORNE, GROUNDED, COYOTE, DYING }
enum Action { NONE, JUMP, DOUBLE }

const COYOTE_TIME := 0.1
const GRAVITY := 22.0
const JUMP_VELOCITY := 8.0          # apex = v^2/(2g) = 1.454 m
const DOUBLE_VELOCITY := 7.4

var state: State = State.AIRBORNE
var coyote_left := 0.0
var double_used := false


func reset(p_start_ground: bool) -> void:
	state = State.GROUNDED if p_start_ground else State.AIRBORNE
	coyote_left = 0.0
	double_used = false


func kill() -> void:
	state = State.DYING


## Advance one physics frame. `grounded` = floor detection this frame,
## `jump_pressed` = jump edge (not held).
func advance(delta: float, grounded: bool, jump_pressed: bool) -> Action:
	if state == State.DYING:
		return Action.NONE
	coyote_left = maxf(0.0, coyote_left - delta)
	match state:
		State.GROUNDED:
			if not grounded:
				state = State.COYOTE
				coyote_left = COYOTE_TIME
		State.COYOTE:
			if grounded:
				state = State.GROUNDED
			elif coyote_left <= 0.0:
				state = State.AIRBORNE
		State.AIRBORNE:
			if grounded:
				state = State.GROUNDED
				double_used = false
	var action := Action.NONE
	if jump_pressed:
		if state == State.GROUNDED or state == State.COYOTE:
			state = State.AIRBORNE
			action = Action.JUMP
		elif state == State.AIRBORNE and not double_used:
			double_used = true
			action = Action.DOUBLE
	return action


static func jump_apex(velocity: float, gravity: float) -> float:
	return velocity * velocity / (2.0 * gravity)
