extends Area3D
## Enemies (T22): walker = ground patrol, hopper = hovering bob.
## Stomp (or any touch while powered) kills it; side contact kills the player.

enum Kind { WALKER, HOPPER }
@export var kind := Kind.WALKER
@export var patrol_range := 3.0
@export var patrol_speed := 1.6

var _dir := 1.0
var _t := randf() * TAU
var _home := Vector3.ZERO
var _dead := false
@onready var _model: Node3D = get_node_or_null(^"Model")


func _ready() -> void:
	_home = position
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	if _dead:
		return
	if kind == Kind.WALKER:
		var r := RunRules.patrol(position.x, _dir, _home.x, patrol_range, patrol_speed, delta)
		position.x = r[0]
		_dir = r[1]
		if _model:
			_model.rotation.y = PI / 2.0 if _dir > 0.0 else -PI / 2.0
			_model.position.y = absf(sin(_home.x + position.x)) * 0.06
	else:
		_t += delta * 2.2
		position.y = _home.y + sin(_t) * 0.4
		if _model:
			_model.rotation.y += delta * 1.5


## World-space head height used for the stomp test.
func top_y() -> float:
	return global_position.y + (0.53 if kind == Kind.WALKER else 0.73)


func _on_body_entered(body: Node3D) -> void:
	if _dead or not body is CharacterBody3D or not GameState.playing:
		return
	if body.sm.state == body.sm.State.DYING:
		return
	# player capsule bottom floats 0.55 above the node origin
	var feet_y := body.global_position.y + 0.55
	var stomp := RunRules.is_stomp(body.velocity.y, feet_y, top_y())
	if stomp or GameState.powerup_active:
		_die()
		if stomp:
			body.stomp_bounce()  # plays the stomp blip
		else:
			GameState.fx("stomp")
	else:
		GameState.fx("hurt")
		body.die()


func _die() -> void:
	_dead = true
	set_deferred("monitoring", false)
	var tween := create_tween()
	tween.tween_property(self, "scale", Vector3(1.3, 0.05, 1.3), 0.18)
	tween.tween_callback(queue_free)
