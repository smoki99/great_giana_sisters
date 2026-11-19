extends Node
## Boot + run flow: title overlay -> ENTER -> playing. Death/respawn (T19),
## timer, game over and win overlays (T16/T20/T24). Character select (T15)
## persists via GameState and survives respawns/level reloads.

const TITLE_TXT := "MIA IN CANDY LAND\n\npress ENTER to start\n\n1 = Mia   2 = Lina  (current: %s)\n\nWASD / arrows move - SPACE jump & double-jump"
const PLAYER_PATH := "World/Level/Player"

@onready var _title: Label = $UI/Title
var _hud: Label
var _player: CharacterBody3D
var _epoch := 0            # invalidates pending respawn timers across restarts
var _dying := false

func _ready() -> void:
	GameState.reset_run()
	_refresh_title()
	_title.show()
	_hud = Label.new()
	_hud.position = Vector2(16, 10)
	_hud.add_theme_font_size_override("font_size", 22)
	_hud.add_theme_color_override("font_color", Color(1, 1, 1))
	_hud.add_theme_color_override("font_outline_color", Color(0.1, 0.05, 0.2))
	_hud.add_theme_constant_override("outline_size", 6)
	$UI.add_child(_hud)
	_player = get_node(PLAYER_PATH)
	_player.died.connect(_on_died)
	GameState.respawn_point = _player.global_position
	for gate in get_tree().get_nodes_in_group("gate"):
		gate.reached.connect(_on_gate_reached)


func _process(delta: float) -> void:
	if GameState.playing and not _dying:
		GameState.time_left = maxf(0.0, GameState.time_left - delta)
		if GameState.time_left <= 0.0:
			_player.die()
	_hud.text = "GEMS %d   TIME %d   LIVES %d%s" % [
		GameState.gems, ceili(GameState.time_left), GameState.lives,
		"   POWER!" if GameState.powerup_active else ""]


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("start"):
		if GameState.playing:
			return
		GameState.playing = true
		_title.hide()
		get_viewport().set_input_as_handled()
	elif not GameState.playing and event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				_pick_character("mia")
			KEY_2:
				_pick_character("lina")


func _on_died() -> void:
	_dying = true
	GameState.lives -= 1
	var epoch := _epoch
	await get_tree().create_timer(1.2).timeout
	if epoch != _epoch:
		return
	_dying = false
	if GameState.lives <= 0:
		_end_run("GAME OVER\n\npress ENTER for title")
		return
	_player.respawn(GameState.respawn_point)


func _on_gate_reached() -> void:
	_end_run("YOU WIN!\n\ngems %d - time left %d\npress ENTER for title" % [GameState.gems, ceili(GameState.time_left)])


func _end_run(msg: String) -> void:
	_epoch += 1
	_dying = false
	GameState.playing = false
	_title.text = msg
	_title.show()


func _pick_character(id: String) -> void:
	if _player:
		_player.apply_character(id)
	_refresh_title()


func _refresh_title() -> void:
	_title.text = TITLE_TXT % GameState.selected_character.capitalize()
