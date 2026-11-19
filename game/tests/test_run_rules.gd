extends RefCounted

var _checks := 0

func check_count() -> int: return _checks

static func _ok(out: PackedStringArray, cond: bool, name: String) -> void:
	if not cond:
		out.append(name)

func run() -> PackedStringArray:
	var out := PackedStringArray()
	# --- timer (T18)
	var r: Array = RunRules.tick_time(10.0, 1.0)
	_checks += 1; _ok(out, absf(r[0] - 9.0) < 1e-6 and not r[1], "timer ticks down, not expired")
	r = RunRules.tick_time(0.5, 1.0)
	_checks += 1; _ok(out, r[0] == 0.0 and r[1], "timer expiry flagged on crossing tick")
	r = RunRules.tick_time(0.0, 1.0)
	_checks += 1; _ok(out, r[0] == 0.0 and not r[1], "expired timer does not re-fire")
	# --- lives (T19)
	_checks += 1; _ok(out, RunRules.lose_life(3) == RunRules.Life.RESPAWN, "life 3 -> respawn")
	_checks += 1; _ok(out, RunRules.lose_life(2) == RunRules.Life.RESPAWN, "life 2 -> respawn")
	_checks += 1; _ok(out, RunRules.lose_life(1) == RunRules.Life.GAME_OVER, "last life -> game over")
	# --- powerup (T21)
	r = RunRules.tick_power(RunRules.POWERUP_SECONDS, 1.0)
	_checks += 1; _ok(out, absf(r[0] - 9.0) < 1e-6 and not r[1], "power ticks down")
	r = RunRules.tick_power(0.2, 1.0)
	_checks += 1; _ok(out, r[0] == 0.0 and r[1], "power expiry flagged once")
	# --- spring (T23): apex 4.5 m -> v=sqrt(2*22*4.5) ~= 14.07; apex check h=v^2/2g
	var v := RunRules.spring_velocity(4.5)
	_checks += 1; _ok(out, absf(v * v / (2.0 * RunRules.SPRING_GRAVITY) - 4.5) < 1e-3, "spring apex exact (%.3f)" % v)
	# --- stomp (T22)
	_checks += 1; _ok(out, RunRules.is_stomp(-5.0, 2.4, 2.2), "falling onto head = stomp")
	_checks += 1; _ok(out, not RunRules.is_stomp(3.0, 2.4, 2.2), "rising never stomps")
	_checks += 1; _ok(out, not RunRules.is_stomp(-5.0, 1.0, 2.2), "from below is not a stomp")
	_checks += 1; _ok(out, RunRules.is_stomp(-2.0, 2.05, 2.2), "grazing tolerance -0.2")
	# --- patrol (T22)
	var p: Array = RunRules.patrol(0.0, 1.0, 0.0, 3.0, 10.0, 1.0)
	_checks += 1; _ok(out, p[0] == 3.0 and p[1] == -1.0, "patrol clamps and flips at +end (%.2f,%s)" % [p[0], p[1]])
	p = RunRules.patrol(3.0, -1.0, 0.0, 3.0, 10.0, 1.0)
	_checks += 1; _ok(out, p[0] == -3.0 and p[1] == 1.0, "patrol clamps and flips at -end")
	p = RunRules.patrol(1.0, 1.0, 0.0, 3.0, 1.0, 0.5)
	_checks += 1; _ok(out, absf(p[0] - 1.5) < 1e-6 and p[1] == 1.0, "patrol mid-walk")
	# --- score
	_checks += 1; _ok(out, RunRules.score(10, 42.9) == 10 * 100 + 42 * 10, "score formula")
	return out
