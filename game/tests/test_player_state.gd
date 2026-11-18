extends RefCounted

var _checks := 0

func check_count() -> int: return _checks

static func _ok(out: PackedStringArray, cond: bool, name: String) -> void:
	if not cond:
		out.append(name)

func run() -> PackedStringArray:
	var out := PackedStringArray()
	var SM := PlayerStateMachine

	# jump apex ~1.4 m ±0.1 at v=8, g=22
	var apex := SM.jump_apex(SM.JUMP_VELOCITY, SM.GRAVITY)
	_checks += 1; _ok(out, absf(apex - 1.4) < 0.1, "apex %.3f not 1.4±0.1" % apex)

	# start grounded stays grounded without input
	var sm := PlayerStateMachine.new()
	sm.reset(true)
	sm.advance(1.0 / 60.0, true, false)
	_checks += 1; _ok(out, sm.state == SM.State.GROUNDED, "grounded persists")

	# walking off a ledge -> coyote, jump inside window still jumps
	sm.advance(1.0 / 60.0, false, false)
	_checks += 1; _ok(out, sm.state == SM.State.COYOTE, "ledge -> COYOTE")
	var a: int = sm.advance(0.05, false, true)
	_checks += 1; _ok(out, a == SM.Action.JUMP, "coyote jump allowed")

	# coyote window is exactly COYOTE_TIME (0.1 s)
	sm = PlayerStateMachine.new()
	sm.reset(true)
	sm.advance(1.0 / 60.0, false, false)
	sm.advance(0.06, false, false)
	_checks += 1; _ok(out, sm.state == SM.State.COYOTE, "0.06s still coyote")
	sm.advance(0.05, false, false)
	_checks += 1; _ok(out, sm.state == SM.State.AIRBORNE, "0.11s coyote expired")
	a = sm.advance(1.0 / 60.0, false, true)
	_checks += 1; _ok(out, a == SM.Action.DOUBLE, "airborne jump = double")

	# double jumps once, then locked until landing
	a = sm.advance(1.0 / 60.0, false, true)
	_checks += 1; _ok(out, a == SM.Action.NONE, "double locked midair")
	sm.advance(1.0 / 60.0, true, false)
	a = sm.advance(1.0 / 60.0, true, true)
	_checks += 1; _ok(out, a == SM.Action.JUMP and not sm.double_used, "landing recharges double")

	# dying blocks everything and needs reset
	sm.kill()
	a = sm.advance(1.0 / 60.0, true, true)
	_checks += 1; _ok(out, a == SM.Action.NONE and sm.state == SM.State.DYING, "DYING blocks input")
	sm.reset(true)
	_checks += 1; _ok(out, sm.state == SM.State.GROUNDED, "reset revives")
	return out
