extends Area3D
## Gem & diamond pickups (T17/T21). kind: 0 = gem, 1 = diamond.

@export_enum("gem", "diamond") var kind := 0
@onready var _model: Node3D = get_node_or_null(^"Model")


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	if _model:
		_model.rotate_y(2.4 * delta)
		if kind == 1:
			_model.rotate_x(1.2 * delta)


func _on_body_entered(body: Node3D) -> void:
	if not body is CharacterBody3D:
		return
	if body.sm.state == body.sm.State.DYING:
		return
	if kind == 0:
		GameState.gems += 1
	else:
		body.start_power(RunRules.POWERUP_SECONDS)
		GameState.powerup_active = true
	queue_free()
