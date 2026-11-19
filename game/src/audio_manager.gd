extends Node
## AudioManager autoload (T26/T27): turns Chiptune PCM buffers into in-memory
## AudioStreamWAVs (no asset files) and plays them polyphonically. Registers
## itself as GameState.on_sfx so scene code stays decoupled from audio.

const POOL_SIZE := 8

var _pool: Array[AudioStreamPlayer] = []
var _streams: Dictionary = {}
var _music: AudioStreamPlayer
var _music_on := true


func _ready() -> void:
	GameState.on_sfx = _play
	for i in POOL_SIZE:
		var p := AudioStreamPlayer.new()
		p.volume_db = -6.0
		add_child(p)
		_pool.append(p)
	_music = AudioStreamPlayer.new()
	_music.volume_db = -14.0
	add_child(_music)
	# Build buffers while the title screen is up, not on first input.
	_build.call_deferred()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_music"):
		toggle_music()
		get_viewport().set_input_as_handled()


func toggle_music() -> void:
	_music_on = not _music_on
	if _music_on:
		if _music.stream != null and not _music.playing:
			_music.play()
	else:
		_music.stop()


func _build() -> void:
	for name in ["jump", "double", "spring", "stomp", "gem", "power", "hurt", "death", "win", "checkpoint", "select"]:
		_streams[name] = _wav(Chiptune.sfx(name), false)
	var music := _wav(Chiptune.music_loop(), true)
	_music.stream = music


func _wav(buf: PackedFloat32Array, loop: bool) -> AudioStreamWAV:
	var s := AudioStreamWAV.new()
	s.format = AudioStreamWAV.FORMAT_16_BITS
	s.mix_rate = Chiptune.SAMPLE_RATE
	s.stereo = false
	s.data = Chiptune.to_pcm16(buf)
	if loop:
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_begin = 0
		s.loop_end = buf.size()
	return s


func _play(name: String) -> void:
	if _streams.is_empty():
		_build()  # headless/fast-start safety: buffers not ready yet
	if not _streams.has(name):
		return
	for p in _pool:
		if not p.playing:
			p.stream = _streams[name]
			p.play()
			return
