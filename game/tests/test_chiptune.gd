extends RefCounted
## Chiptune DSP checks: buffer shapes, levels, envelopes, loop, PCM conversion.

var _checks := 0

func check_count() -> int: return _checks

static func _ok(out: PackedStringArray, cond: bool, name: String) -> void:
	if not cond:
		out.append(name)

static func _rms(buf: PackedFloat32Array, a: int, b: int) -> float:
	var s := 0.0
	var n := 0
	for i in range(maxi(a, 0), mini(b, buf.size())):
		s += buf[i] * buf[i]
		n += 1
	return sqrt(s / maxi(n, 1))

func run() -> PackedStringArray:
	var out := PackedStringArray()
	# wave shapers
	_checks += 1; _ok(out, Chiptune.square(0.1, 0.5) > 0.0 and Chiptune.square(0.7, 0.5) < 0.0, "square duty")
	_checks += 1; _ok(out, absf(Chiptune.tri(0.25) - 1.0) < 1e-5 and absf(Chiptune.tri(0.75) + 1.0) < 1e-5, "tri peaks")
	# sweep length + decaying envelope
	var sw := Chiptune.sweep(0.14, 300.0, 720.0)
	_checks += 1; _ok(out, sw.size() == int(0.14 * Chiptune.SAMPLE_RATE), "sweep length")
	_checks += 1; _ok(out, _rms(sw, 0, sw.size() / 4) > _rms(sw, sw.size() * 3 / 4, sw.size()), "sweep decays")
	# every named sfx exists and is audible
	for name in ["jump", "double", "spring", "stomp", "gem", "power", "hurt", "death", "win", "checkpoint", "select"]:
		var buf := Chiptune.sfx(name)
		_checks += 1
		_ok(out, buf.size() > 882 and _rms(buf, 0, buf.size()) > 0.02, "%s audible" % name)
		_checks += 1
		var peak := 0.0
		for v in buf:
			peak = maxf(peak, absf(v))
		_ok(out, peak <= 0.86, "%s peak <= 0.86 (got %.2f)" % [name, peak])
	_checks += 1; _ok(out, Chiptune.sfx("nope").is_empty(), "unknown sfx empty")
	# music loop: 20 s, audible, bounded
	var m := Chiptune.music_loop()
	_checks += 1; _ok(out, m.size() == int(20.0 * Chiptune.SAMPLE_RATE), "music 20 s")
	_checks += 1; _ok(out, _rms(m, 0, m.size()) > 0.05, "music audible")
	var mpeak := 0.0
	for v in m:
		mpeak = maxf(mpeak, absf(v))
	_checks += 1; _ok(out, mpeak > 0.4 and mpeak <= 0.86, "music well normalized (%.2f)" % mpeak)
	# PCM16 conversion
	var pcm := Chiptune.to_pcm16(PackedFloat32Array([0.0, 1.0, -1.0, 0.5]))
	_checks += 1; _ok(out, pcm.size() == 8 and pcm.decode_s16(2) == 32767 and pcm.decode_s16(4) == -32767, "pcm16 encode")
	return out
