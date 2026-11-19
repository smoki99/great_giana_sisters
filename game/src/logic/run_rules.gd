class_name RunRules
extends RefCounted
## Pure run-level rules (timer, lives, powerup, springs, stomp, score) — unit-tested.

enum Life { RESPAWN, GAME_OVER }

const SPRING_GRAVITY := 22.0     # PlayerStateMachine.GRAVITY (duplicated to stay dep-free)
const POWERUP_SECONDS := 10.0
const STOMP_MIN_VY := -1.0       # must be falling at least this fast for a stomp


## Tick the countdown. Returns [remaining, expired_now] (expired only on the crossing tick).
static func tick_time(time_left: float, delta: float) -> Array:
	if time_left <= 0.0:
		return [0.0, false]
	var t := maxf(0.0, time_left - delta)
	return [t, t == 0.0]


## Spend one life. Returns Life.RESPAWN (lives remain) or Life.GAME_OVER.
static func lose_life(lives: int) -> int:
	return Life.RESPAWN if lives > 1 else Life.GAME_OVER


## Powerup countdown. Returns [remaining, expired_now].
static func tick_power(left: float, delta: float) -> Array:
	if left <= 0.0:
		return [0.0, false]
	var t := maxf(0.0, left - delta)
	return [t, t == 0.0]


## Launch velocity for a spring reaching apex height h (v = sqrt(2gh)).
static func spring_velocity(h: float) -> float:
	return sqrt(2.0 * SPRING_GRAVITY * h)


## Stomp test: player must be falling and above the enemy head plane.
static func is_stomp(player_vy: float, player_y: float, enemy_top_y: float) -> bool:
	return player_vy < STOMP_MIN_VY and player_y >= enemy_top_y - 0.2


## Patrol walk: advance pos within [origin-a, origin+a], flip direction at the ends.
static func patrol(pos: float, dir: float, origin: float, range_: float, speed: float, delta: float) -> Array:
	var p := pos + dir * speed * delta
	var d := dir
	if p > origin + range_:
		p = origin + range_
		d = -1.0
	elif p < origin - range_:
		p = origin - range_
		d = 1.0
	return [p, d]


## Score: gems * 100 + remaining time * 10 (powerups have no bonus).
static func score(gems: int, time_left: float) -> int:
	return int(gems * 100 + floori(time_left) * 10)
