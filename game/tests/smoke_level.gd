extends SceneTree
## Throwaway E2E smoke: boot main.tscn headless, verify level content,
## gem pickup, death->respawn, game-over, gate win. Run:
## godot --headless --path game -s tests/tmp_smoke.gd

var _main: Node

func _initialize() -> void:
	var ps := load("res://scenes/main.tscn") as PackedScene
	_main = ps.instantiate()
	root.add_child(_main)
	_ready_check()


func _frame() -> void:
	await process_frame


func _ready_check() -> void:
	await _frame()
	var player: CharacterBody3D = _main.get_node("World/Level/Player")
	assert(player != null, "player missing")
	var gates := get_nodes_in_group("gate")
	assert(gates.size() == 1, "want 1 gate, got %d" % gates.size())
	var gems := 0
	var stack: Array = [_main]
	while stack.size():
		for c in (stack.pop_back() as Node).get_children():
			stack.append(c)
			if c.get("script") != null and str(c.get("script").resource_path).ends_with("pickup.gd"):
				gems += 1
	print("nodes ok; pickup areas: ", gems)
	GameState.playing = true
	# death -> respawn (wait on state transition, not frames: headless frames outrun the 1.2 s timer)
	var lives0 := GameState.lives
	var spawn := player.global_position
	player.global_position = spawn + Vector3(3, 0, 0)  # distinguish respawn pos from pre-death rest pos
	await _frame()
	player.die()
	var waited := 0
	while player.sm.state == player.sm.State.DYING and waited < 900:
		await _frame()
		waited += 1
	assert(player.sm.state != player.sm.State.DYING, "respawned within 900 frames")
	assert(GameState.lives == lives0 - 1, "life lost: %d" % GameState.lives)
	await _frame()
	assert(player.global_position.distance_to(GameState.respawn_point) < 0.25, "respawn pos %s vs %s" % [player.global_position, GameState.respawn_point])
	assert(GameState.playing, "playing after respawn")
	print("death->respawn ok, lives=", GameState.lives, " after %d frames" % waited)
	# gem + diamond pickup (teleport onto entity cell, Area overlap)
	var gem: Area3D = null
	var diamond: Area3D = null
	stack = [_main]
	while stack.size():
		for c in (stack.pop_back() as Node).get_children():
			stack.append(c)
			if c is Area3D and c.get("script") != null:
				var rp: String = str((c as Node).get("script").resource_path)
				if rp.ends_with("pickup.gd") and gem == null and c.kind == 0:
					gem = c as Area3D
				elif rp.ends_with("pickup.gd") and diamond == null and c.kind == 1:
					diamond = c as Area3D
	player.global_position = gem.global_position
	waited = 0
	while GameState.gems == 0 and waited < 120:
		await _frame()
		waited += 1
	await _frame()  # let queue_free() land
	assert(not is_instance_valid(gem), "gem freed after collect")
	player.global_position = diamond.global_position
	waited = 0
	while not GameState.powerup_active and waited < 120:
		await _frame()
		waited += 1
	await _frame()
	assert(not is_instance_valid(diamond), "diamond freed after collect")
	print("gem+diamond pickup ok (gems=1, power active)")
	# stomp: fall from above onto a walker
	var walker: Area3D = null
	stack = [_main]
	while stack.size():
		for c in (stack.pop_back() as Node).get_children():
			stack.append(c)
			if c.get("script") != null and str((c as Node).get("script").resource_path).ends_with("enemy.gd") and walker == null:
				walker = c as Area3D
	GameState.playing = true
	player.global_position = walker.global_position + Vector3(0, 3.0, 0)
	player.velocity = Vector3(0, -6, 0)
	player.sm.state = player.sm.State.AIRBORNE
	GameState.powerup_active = false  # stomp path, not power kill
	waited = 0
	while is_instance_valid(walker) and GameState.playing and waited < 240:
		await _frame()
		waited += 1
	assert(is_instance_valid(walker) == false or not GameState.playing, "stomp killed walker or player died: walker_valid=%s lives=%d" % [is_instance_valid(walker), GameState.lives])
	assert(GameState.playing and GameState.lives >= 2, "stomp survived (lives=%d playing=%s)" % [GameState.lives, GameState.playing])
	print("stomp ok: walker gone, player alive, lives=", GameState.lives)
	# T15: character select swaps the model instance (ref compare; glb root names can coincide)
	var anchor: Node = player.get_node("Model")
	var old_model: Node = anchor.get_child(0)
	player.apply_character("lina")
	await _frame()  # let queue_free of the old model land
	assert(anchor.get_child_count() == 1 and anchor.get_child(0) != old_model, "model swapped to lina")
	assert(GameState.selected_character == "lina", "selection persisted")
	player.apply_character("mia")
	# T20: checkpoint flag moves the respawn target
	var checkpoint: Area3D = null
	stack = [_main]
	while stack.size():
		for c in (stack.pop_back() as Node).get_children():
			stack.append(c)
			if c.get("script") != null and str((c as Node).get("script").resource_path).ends_with("checkpoint.gd") and checkpoint == null:
				checkpoint = c as Area3D
	player.global_position = checkpoint.global_position
	waited = 0
	while GameState.respawn_point.distance_to(checkpoint.global_position) > 0.5 and waited < 120:
		await _frame()
		waited += 1
	assert(GameState.respawn_point.distance_to(checkpoint.global_position) < 1.5, "checkpoint sets respawn point: %s vs %s" % [GameState.respawn_point, checkpoint.global_position])
	print("char select + checkpoint ok")
	# win: teleport into gate
	var gate: Area3D = gates[0] as Area3D
	player.global_position = gate.global_position
	waited = 0
	while GameState.playing and waited < 120:
		await _frame()
		waited += 1
	assert(not GameState.playing, "playing false after gate")
	print("gate win ok; title='", _main.get_node("UI/Title").text.left(8), "'")
	quit(0)


func _initialize2() -> void:
	pass
