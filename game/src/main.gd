extends Node
## Boot flow: title overlay -> ENTER -> playing (level runs behind the overlay).

@onready var _title: Control = $UI/Title


func _ready() -> void:
	GameState.reset_run()
	_title.show()


func _unhandled_input(event: InputEvent) -> void:
	if not GameState.playing and event.is_action_pressed("start"):
		GameState.playing = true
		_title.hide()
		get_viewport().set_input_as_handled()
