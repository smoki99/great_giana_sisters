class_name CameraSpring
extends RefCounted
## 1-D critically-damped-ish spring used for camera distance/height smoothing.

const STIFFNESS := 26.0
const DAMPING := 9.0

var pos := 0.0
var vel := 0.0


func reset(at: float) -> void:
	pos = at
	vel = 0.0


func step(goal: float, delta: float) -> float:
	vel += ((goal - pos) * STIFFNESS - vel * DAMPING) * delta
	pos += vel * delta
	return pos
