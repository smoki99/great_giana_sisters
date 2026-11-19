extends Area3D
## Kill plane (T16/T19): anything falling below the level dies.


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node3D) -> void:
	if body is CharacterBody3D and body.sm.state != body.sm.State.DYING:
		body.die()
