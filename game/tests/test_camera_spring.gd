extends RefCounted

var _checks := 0

func check_count() -> int: return _checks

static func _ok(out: PackedStringArray, cond: bool, name: String) -> void:
	if not cond:
		out.append(name)

func run() -> PackedStringArray:
	var out := PackedStringArray()
	var s := CameraSpring.new()
	s.reset(6.0)
	var peak := 6.0
	var dt := 1.0 / 60.0
	# converge to 8 within 1.5 s
	for i in 90:
		peak = maxf(peak, s.step(8.0, dt))
	_checks += 1; _ok(out, absf(s.pos - 8.0) < 0.05, "converge to goal (%.3f)" % s.pos)
	# overshoot bounded (< 25 % of step)
	_checks += 1; _ok(out, peak - 8.0 < 0.5, "overshoot %.3f too large" % (peak - 8.0))
	# monotone from below: starting under goal, first steps increase
	var s2 := CameraSpring.new()
	s2.reset(0.0)
	var prev := -1.0
	var monotone := true
	for i in 20:
		var v := s2.step(1.0, dt)
		if v < prev:
			monotone = false
		prev = v
	_checks += 1; _ok(out, monotone, "no dip before goal")
	# goal switch mid-flight stays bounded
	for i in 600:
		s.step(5.0 if (i / 60) % 2 == 0 else 9.0, dt)
		_checks += 0
	_checks += 1; _ok(out, s.pos > 4.0 and s.pos < 10.0, "oscillation stays bounded (%.2f)" % s.pos)
	return out
