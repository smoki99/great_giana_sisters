extends Area3D
## Spring pad (T23): launches a landing player to export apex height.

@export var apex_height := 4.5
var _squash := 0.0
@onready var _model: Node3D = get_node_or_null(^"Model")


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	_squash = maxf(0.0, _squash - delta * 4.0)
	if _model:
		_model.scale = Vector3(1.0 + _squash * 0.3, 1.0 - _squash * 0.5, 1.0 + _squash * 0.3)


func _on_body_entered(body: Node3D) -> void:
	if not body is CharacterBody3D:
		return
	if body.sm.state == body.sm.State.DYING:
		return
	body.velocity.y = RunRules.spring_velocity(apex_height)
	body.launch_from_spring()
	_squash = 1.0
