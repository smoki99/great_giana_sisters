extends Node
## Boot + run flow: title overlay -> ENTER -> playing. Death/respawn (T19),
## timer, game over and win overlays (T16/T20/T24). Character select (T15)
## persists via GameState and survives respawns/level reloads.

const TITLE_TXT := "MIA IN CANDY LAND\n\npress ENTER to start\n\n1 = Mia   2 = Lina  (current: %s)\n\nWASD/arrows move - SPACE jump & double-jump\nENTER start - M music on/off"
const PLAYER_PATH := "World/Level/Player"

@onready var _title: Label = $UI/Title
var _dim: ColorRect
var _hud: Label
var _player: CharacterBody3D
var _epoch := 0            # invalidates pending respawn timers across restarts
var _dying := false
var _last_title := ""
var _stats_acc := 0.0
func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("e2e"):
			# swiftshader renders ~1 fps; let physics catch up to real time so browser tests
			# see deterministic distances (still fixed 1/60 steps, just up to a full second
			# of them per frame; 5 m/s * 1/60 = 0.08 m/step, no tunneling risk)
			Engine.max_physics_steps_per_frame = 60
		elif a.begins_with("slowmo"):
			# gallery captures: sim runs ~real time, so one screenshot pause walks the
			# player ~10 m — cap physics at 1 step/frame (~0.37x wall) so key holds and
			# snapshot latency stay in the sub-metre range
			Engine.max_physics_steps_per_frame = 1
	GameState.reset_run()
	_refresh_title()
	_title.show()
	_dim = ColorRect.new()
	_dim.color = Color(0.08, 0.05, 0.2, 0.4)
	_dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$UI.add_child(_dim)
	$UI.move_child(_dim, 0)
	_title.add_theme_font_size_override("font_size", 28)
	_title.add_theme_color_override("font_color", Color(1.0, 0.82, 0.4))
	_title.add_theme_color_override("font_outline_color", Color(0.35, 0.15, 0.45))
	_title.add_theme_constant_override("outline_size", 10)
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
	# E2E bridge: page <title> mirrors run state for browser-side assertions
	var st := "%d G%d T%d L%d%s X%.0f Z%.0f" % [1 if GameState.playing else 0, GameState.gems,
		ceili(GameState.time_left), GameState.lives, "P" if GameState.powerup_active else "",
		_player.global_position.x, _player.global_position.z]
	if st != _last_title:
		_last_title = st
		DisplayServer.window_set_title("Mia in Candy Land - %s" % st)
	# Visual-QA bridge (web): draw calls + fps for scripts/shotgallery.ts perf budget
	if OS.has_feature("web"):
		_stats_acc += delta
		if _stats_acc > 0.25:
			_stats_acc = 0.0
			var ri := RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
			JavaScriptBridge.eval("window.__game_stats=%s" % JSON.stringify(
				{"dc": ri, "fps": Engine.get_frames_per_second(), "prims": RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_PRIMITIVES_IN_FRAME)}))


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("start"):
		if GameState.playing:
			return
		GameState.playing = true
		_title.hide()
		_dim.hide()
		GameState.fx("select")
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
	GameState.fx("win")
	_end_run("YOU WIN!\n\ngems %d - time left %d\npress ENTER for title" % [GameState.gems, ceili(GameState.time_left)])


func _show_overlay(msg: String) -> void:
	_title.text = msg
	_title.show()
	_dim.show()


func _end_run(msg: String) -> void:
	_epoch += 1
	_dying = false
	GameState.playing = false
	_show_overlay(msg)


func _pick_character(id: String) -> void:
	if _player:
		_player.apply_character(id)
	_refresh_title()


func _refresh_title() -> void:
	_title.text = TITLE_TXT % GameState.selected_character.capitalize()
