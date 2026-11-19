class_name AnimDriver
extends RefCounted
## Pure clip-selection table for the player model — no nodes; unit-tested.
## Mirrors PlayerStateMachine states; the glue in player.gd only feeds it.

const IDLE_SPEED := 0.2      # below this horizontal speed = idle
const RUN_REF_SPEED := 6.0   # speed at which the run clip plays 1.0x
const RISE_EPS := 0.5        # vy above this = still rising
const FADE := 0.12           # crossfade between clips, seconds
const DOUBLE_FLASH := 0.3    # keep the spin clip after the DOUBLE action


var _prev := ""


## Reset on respawn so the first clip change crossfades cleanly.
func reset() -> void:
	_prev = ""


## grounded/vy/speed from the body, double_flash = double-jump still in effect.
func update(grounded: bool, vy: float, speed: float, double_flash: bool) -> Dictionary:
	var clip := "idle"
	if not grounded:
		clip = "double_jump" if double_flash else ("jump" if vy > RISE_EPS else "fall")
	elif speed > IDLE_SPEED:
		clip = "run"
	var fade := FADE if clip != _prev else 0.0
	_prev = clip
	var sp := 1.0
	if clip == "run":
		sp = clampf(speed / RUN_REF_SPEED, 0.6, 1.4)
	return {"name": clip, "fade": fade, "speed_scale": sp}
