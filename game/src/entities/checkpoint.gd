extends Area3D
## Checkpoint flag (T20): touch sets the respawn target and marks itself active.

var _active := false
@onready var _model: Node3D = get_node_or_null(^"Model")


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	if _active and _model:
		_model.rotate_y(3.0 * delta)


func _on_body_entered(body: Node3D) -> void:
	if _active or not body is CharacterBody3D:
		return
	if body.sm.state == body.sm.State.DYING:
		return
	_active = true
	GameState.respawn_point = Vector3(global_position.x, global_position.y + 1.0, global_position.z)
	if _model:
		for m in _model.find_children("*", "MeshInstance3D", true, false):
			m.set_surface_override_material(0, _active_material())


static var _mat: StandardMaterial3D


func _active_material() -> StandardMaterial3D:
	if _mat == null:
		_mat = StandardMaterial3D.new()
		_mat.albedo_color = Color(0.2, 0.9, 0.35)
		_mat.emission_enabled = true
		_mat.emission = Color(0.15, 0.8, 0.25)
		_mat.emission_energy_multiplier = 0.6
	return _mat
