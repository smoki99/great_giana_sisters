extends CharacterBody3D
## Player controller: input + gravity, all discrete decisions via PlayerStateMachine.

signal jumped
signal double_jumped

const SPEED := 6.0
const ACCEL_GROUND := 60.0
const ACCEL_AIR := 30.0
const DECEL := 70.0
const TURN_SPEED := 12.0

@export var camera_boom_path: NodePath = ^"Boom"

var sm := PlayerStateMachine.new()
var _jump_held := false
var _heading := 0.0
@onready var _camera_boom: Node3D = get_node_or_null(camera_boom_path)
@onready var _body: MeshInstance3D = get_node_or_null(^"Body")


func respawn(at: Vector3) -> void:
	global_position = at
	velocity = Vector3.ZERO
	sm.reset(true)


func _physics_process(delta: float) -> void:
	var wish := Vector2.ZERO
	if GameState.playing:
		wish = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		# camera-relative: project boom facing onto the ground plane
		if _camera_boom:
			var f := -_camera_boom.global_transform.basis.z
			f.y = 0.0
			f = f.normalized()
			var right := f.cross(Vector3.UP)
			var target := (right * wish.x + f * -wish.y) * SPEED
			var accel := ACCEL_GROUND if is_on_floor() else ACCEL_AIR
			velocity.x = move_toward(velocity.x, target.x, accel * delta)
			velocity.z = move_toward(velocity.z, target.z, accel * delta)
		else:
			var target := Vector3(wish.x, 0.0, wish.y) * SPEED
			var accel := ACCEL_GROUND if is_on_floor() else ACCEL_AIR
			velocity.x = move_toward(velocity.x, target.x, accel * delta)
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
		PlayerStateMachine.Action.DOUBLE:
			velocity.y = PlayerStateMachine.DOUBLE_VELOCITY
			double_jumped.emit()

	if not is_on_floor():
		velocity.y -= PlayerStateMachine.GRAVITY * delta
	move_and_slide()

	var hs := Vector2(velocity.x, velocity.z)
	if hs.length() > 0.2:
		_heading = lerp_angle(_heading, atan2(hs.x, -hs.y), TURN_SPEED * delta)
		rotation.y = _heading


func current_speed() -> float:
	return Vector2(velocity.x, velocity.z).length()
