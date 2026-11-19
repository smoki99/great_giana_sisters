extends Area3D
## Goal gate (T24): touching it ends the level; Main shows the win overlay.

signal reached


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node3D) -> void:
	if not body is CharacterBody3D or not GameState.playing:
		return
	if body.sm.state == body.sm.State.DYING:
		return
	reached.emit()
