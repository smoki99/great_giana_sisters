extends CharacterBody3D
## Player controller: input + gravity, all discrete decisions via PlayerStateMachine.

signal jumped
signal double_jumped
signal died
const SPEED := 6.0
const ACCEL_GROUND := 60.0
const ACCEL_AIR := 30.0
const DECEL := 70.0
const TURN_SPEED := 12.0

@export var camera_boom_path: NodePath = ^"Boom"

var sm := PlayerStateMachine.new()
var _jump_held := false
var _heading := 0.0
var cam_spring := CameraSpring.new()
const CHAR_SCENES := {
	"mia": "res://assets/models/characters/mia.glb",
	"lina": "res://assets/models/characters/lina.glb",
}
var _driver := AnimDriver.new()
var _double_fx := 0.0
var _power_left := 0.0
var _anim: AnimationPlayer
@onready var _camera_boom: Node3D = get_node_or_null(camera_boom_path)
@onready var _arm: SpringArm3D = get_node_or_null(NodePath("%s/Arm" % camera_boom_path))
@onready var _model_anchor: Node3D = get_node_or_null(^"Model")


func _ready() -> void:
	apply_character(GameState.selected_character)


## T15: swap the character model (Lina = reskin, identical stats).
func apply_character(id: String) -> void:
	GameState.selected_character = id
	_anim = null
	if _model_anchor == null:
		return
	for c in _model_anchor.get_children():
		c.queue_free()
	var inst := (load(CHAR_SCENES.get(id, CHAR_SCENES["mia"])) as PackedScene).instantiate()
	_model_anchor.add_child(inst)
	_anim = inst.find_child("AnimationPlayer", true, false)
	_driver.reset()


func respawn(at: Vector3) -> void:
	global_position = at
	velocity = Vector3.ZERO
	sm.reset(true)
	cam_spring.reset(6.0)
	_double_fx = 0.0
	_power_left = 0.0
	GameState.powerup_active = false


func die() -> void:
	if sm.state == PlayerStateMachine.State.DYING:
		return
	sm.kill()
	velocity = Vector3.ZERO
	died.emit()
	GameState.fx("death")


func launch_from_spring() -> void:
	sm.state = PlayerStateMachine.State.AIRBORNE
	GameState.fx("spring")


func stomp_bounce() -> void:
	velocity.y = 7.5
	sm.state = PlayerStateMachine.State.AIRBORNE
	sm.double_used = false
	GameState.fx("stomp")


func start_power(seconds: float) -> void:
	_power_left = seconds


func _physics_process(delta: float) -> void:
	var pr := RunRules.tick_power(_power_left, delta)
	_power_left = pr[0]
	if pr[1]:
		GameState.powerup_active = false
	if sm.state == PlayerStateMachine.State.DYING:
		return
	var wish := Vector2.ZERO
	var speed := SPEED * (1.35 if _power_left > 0.0 else 1.0)
	if GameState.playing:
		wish = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		# camera-relative: project boom facing onto the ground plane
		if _camera_boom:
			var f := -_camera_boom.global_transform.basis.z
			f.y = 0.0
			f = f.normalized()
			var right := f.cross(Vector3.UP)
			var target := (right * wish.x + f * -wish.y) * speed
			var accel := ACCEL_GROUND if is_on_floor() else ACCEL_AIR
			velocity.x = move_toward(velocity.x, target.x, accel * delta)
			velocity.z = move_toward(velocity.z, target.z, accel * delta)
		else:
			var target := Vector3(wish.x, 0.0, wish.y) * speed
			var accel := ACCEL_GROUND if is_on_floor() else ACCEL_AIR
			velocity.z = move_toward(velocity.z, target.z, accel * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, DECEL * delta)
		velocity.z = move_toward(velocity.z, 0.0, DECEL * delta)

	var jump_pressed := Input.is_action_just_pressed("jump") and GameState.playing
	var action := sm.advance(delta, is_on_floor(), jump_pressed)
	match action:
		PlayerStateMachine.Action.JUMP:
			velocity.y = PlayerStateMachine.JUMP_VELOCITY
			jumped.emit()
			GameState.fx("jump")
		PlayerStateMachine.Action.DOUBLE:
			velocity.y = PlayerStateMachine.DOUBLE_VELOCITY
			_double_fx = AnimDriver.DOUBLE_FLASH
			double_jumped.emit()
			GameState.fx("double")

	if not is_on_floor():
		velocity.y -= PlayerStateMachine.GRAVITY * delta
	move_and_slide()
	if _arm:
		var goal := 6.0 + current_speed() * 0.12 + (0.6 if not is_on_floor() else 0.0)
		_arm.spring_length = cam_spring.step(goal, delta)

	var hs := Vector2(velocity.x, velocity.z)
	if hs.length() > 0.2:
		_heading = lerp_angle(_heading, atan2(hs.x, -hs.y), TURN_SPEED * delta)
		# yaw the MODEL only: Boom/Camera are children of Player, rotating the body would
		# orbit the 3/4 camera on every direction change (input stays camera-relative, so a
		# fixed boom also keeps W/D mapping stable)
		if _model_anchor:
			_model_anchor.rotation.y = _heading

	_double_fx = maxf(0.0, _double_fx - delta)
	if _anim:
		var a := _driver.update(is_on_floor(), velocity.y, current_speed(), _double_fx > 0.0)
		if _anim.current_animation != a["name"]:
			_anim.play(a["name"], a["fade"])
		_anim.speed_scale = a["speed_scale"]

func current_speed() -> float:
	return Vector2(velocity.x, velocity.z).length()
