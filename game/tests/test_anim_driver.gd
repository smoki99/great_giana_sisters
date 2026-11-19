extends RefCounted

var _checks := 0

func check_count() -> int: return _checks

static func _ok(out: PackedStringArray, cond: bool, name: String) -> void:
	if not cond:
		out.append(name)

func run() -> PackedStringArray:
	var out := PackedStringArray()
	var d := AnimDriver.new()
	d.reset()
	# grounded, slow -> idle
	var r := d.update(true, 0.0, 0.0, false)
	_checks += 1; _ok(out, r["name"] == "idle", "grounded slow -> idle, got %s" % r["name"])
	# first clip change crossfades
	_checks += 1; _ok(out, r["fade"] > 0.0, "first change fades")
	# same clip again -> no fade
	r = d.update(true, 0.0, 0.1, false)
	_checks += 1; _ok(out, r["name"] == "idle" and r["fade"] == 0.0, "no fade on same clip")
	# grounded, fast -> run with speed-scaled playback
	r = d.update(true, 0.0, 6.0, false)
	_checks += 1; _ok(out, r["name"] == "run" and absf(r["speed_scale"] - 1.0) < 0.01, "run at ref speed 1.0x, got %.2f" % r["speed_scale"])
	r = d.update(true, 0.0, 3.0, false)
	_checks += 1; _ok(out, absf(r["speed_scale"] - 0.6) < 0.01, "slow run clamped to 0.6x, got %.2f" % r["speed_scale"])
	r = d.update(true, 0.0, 12.0, false)
	_checks += 1; _ok(out, absf(r["speed_scale"] - 1.4) < 0.01, "fast run clamped to 1.4x, got %.2f" % r["speed_scale"])
	# rising -> jump
	r = d.update(false, 6.0, 2.0, false)
	_checks += 1; _ok(out, r["name"] == "jump", "rising -> jump, got %s" % r["name"])
	# falling -> fall (incl. near-apex)
	r = d.update(false, 0.2, 2.0, false)
	_checks += 1; _ok(out, r["name"] == "fall", "near-apex vy -> fall, got %s" % r["name"])
	# double-jump flash overrides rising clip
	r = d.update(false, 7.0, 2.0, true)
	_checks += 1; _ok(out, r["name"] == "double_jump", "flash -> double_jump, got %s" % r["name"])
	# flash expires back to jump/fall while airborne
	r = d.update(false, 7.0, 2.0, false)
	_checks += 1; _ok(out, r["name"] == "jump", "flash expired -> jump, got %s" % r["name"])
	# clip names must match the imported glb library
	var d2 := AnimDriver.new()
	for call in [[true, 0.0, 0.0, false], [true, 0.0, 5.0, false], [false, 6.0, 0.0, false], [false, -6.0, 0.0, false], [false, 6.0, 0.0, true]]:
		r = d2.update(call[0], call[1], call[2], call[3])
		_checks += 1; _ok(out, r["name"] in ["idle", "run", "jump", "double_jump", "fall"], "clip name valid: %s" % r["name"])
	return out
