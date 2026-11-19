extends SceneTree
## Headless unit runner: godot --headless --path game -s res://tests/run_tests.gd

const TEST_SCRIPTS := [
	"res://tests/test_player_state.gd",
	"res://tests/test_camera_spring.gd",
	"res://tests/test_anim_driver.gd",
	"res://tests/test_run_rules.gd",
	"res://tests/test_chiptune.gd",
]

func _init() -> void:
	var failures := 0
	var total := 0
	for path: String in TEST_SCRIPTS:
		if not ResourceLoader.exists(path):
			print("skip missing %s" % path)
			continue
		var scr: GDScript = load(path)
		if scr == null or not scr.can_instantiate():
			failures += 1
			print("FAIL %s :: load/parse error" % path.get_file())
			continue
		var test: RefCounted = scr.new()
		var failed: PackedStringArray = test.run()
		for f: String in failed:
			failures += 1
			print("FAIL %s :: %s" % [path.get_file(), f])
		total += test.check_count()
		print("%s: %d checks" % [path.get_file(), test.check_count()])
	if failures == 0:
		print("ALL PASS (%d checks)" % total)
		quit(0)
	else:
		print("%d FAILURES of %d checks" % [failures, total])
		quit(1)
