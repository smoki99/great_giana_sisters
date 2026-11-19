class_name Chiptune
extends RefCounted
## Pure chiptune DSP (T26/T27): square/tri/noise voices with fast-decay
## envelopes, mixed into PCM buffers. No engine/audio deps -> unit-testable.
## All tones are generated here; nothing is sampled from existing recordings.

const SAMPLE_RATE := 22050
const MUSIC_SECS := 20.0


## Duty-cycle square wave (duty in 0..1), `phase01` in [0,1).
static func square(phase01: float, duty := 0.5) -> float:
	return 1.0 if fmod(phase01, 1.0) < duty else -1.0


## Triangle from phase in [0,1): 0->1->-1->0.
static func tri(phase01: float) -> float:
	var p := fmod(phase01, 1.0)
	return 4.0 * p if p < 0.25 else (2.0 - 4.0 * p if p < 0.75 else 4.0 * p - 4.0)


## Per-voice envelope: instant attack, exponential decay toward sustain.
static func env(t: float, dur: float, decay := 6.0, sustain := 0.25) -> float:
	if t < 0.0 or t > dur:
		return 0.0
	var release := clampf(dur - t, 0.0, 1.0)
	var fade := clampf(release / 0.02, 0.0, 1.0)  # 20 ms anti-click tail
	return (sustain + (1.0 - sustain) * exp(-decay * t / dur)) * fade


## Swept square note, e.g. jump 300->700 Hz.
static func sweep(dur: float, f0: float, f1: float, amp: float = 0.5, duty: float = 0.5) -> PackedFloat32Array:
	var n := int(dur * SAMPLE_RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var phase := 0.0
	for i in n:
		var t := float(i) / float(n)
		var f := lerpf(f0, f1, t)
		phase += f / SAMPLE_RATE
		out[i] = amp * square(phase, duty) * env(t * dur, dur)
	return out


## Fixed-pitch note burst (layered interval gives the "coin" feel).
static func note(dur: float, freq: float, amp: float = 0.4, duty: float = 0.5, interval := 1.0) -> PackedFloat32Array:
	var n := int(dur * SAMPLE_RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var p1 := 0.0
	var p2 := 0.0
	for i in n:
		var t := float(i) / float(n)
		p1 += freq / SAMPLE_RATE
		p2 += freq * interval / SAMPLE_RATE
		out[i] = amp * (0.65 * square(p1, duty) + 0.35 * square(p2, duty)) * env(t * dur, dur)
	return out


## Filtered-ish noise thud for stomps: random sign * decay.
static func thud(dur: float, amp: float = 0.6, seed_val: int = 7) -> PackedFloat32Array:
	var n := int(dur * SAMPLE_RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var rnd := RandomNumberGenerator.new()
	rnd.seed = seed_val
	for i in n:
		var t := float(i) / float(n)
		out[i] = amp * (1.0 if rnd.randf() < 0.5 else -1.0) * env(t * dur, dur, 14.0, 0.0)
	return out


## Mix voice buffers placed at (start-sample, gain) tuples: [[buf, at, gain], ...].
static func mix(total_samples: int, parts: Array) -> PackedFloat32Array:
	var out := PackedFloat32Array()
	out.resize(total_samples)
	for part in parts:
		var buf: PackedFloat32Array = part[0]
		var at: int = part[1]
		var gain: float = part[2]
		for i in buf.size():
			var j := at + i
			if j >= 0 and j < total_samples:
				out[j] += buf[i] * gain
	normalize_peak(out)
	return out


static func normalize_peak(buf: PackedFloat32Array, peak := 0.85) -> void:
	var m := 0.0
	for v in buf:
		m = maxf(m, absf(v))
	if m > peak:
		var s := peak / m
		for i in buf.size():
			buf[i] *= s


## 20 s original loop @120 BPM, A-minor pentatonic (A C D E G).
## Lead: eighth-note square melody; bass: beat roots. Bars are 2 s, 10 bars -> seamless.
static func music_loop() -> PackedFloat32Array:
	var beat := 0.5
	var total := int(MUSIC_SECS * SAMPLE_RATE)
	var lead_notes := [
		# [semitone offset over A3=220*2^(st/12), beat start, beats]
		[0.0, 0.0, 1.0], [3.0, 1.0, 0.5], [5.0, 1.5, 0.5], [7.0, 2.0, 1.0], [5.0, 3.0, 1.0],
		[3.0, 4.0, 1.0], [0.0, 5.0, 0.5], [3.0, 5.5, 0.5], [5.0, 6.0, 2.0],
		[7.0, 8.0, 1.0], [8.0, 9.0, 0.5], [7.0, 9.5, 0.5], [5.0, 10.0, 1.0], [3.0, 11.0, 1.0],
		[0.0, 12.0, 2.0], [7.0, 14.0, 0.5], [8.0, 14.5, 0.5], [10.0, 15.0, 1.0], [8.0, 16.0, 1.0],
		[7.0, 17.0, 1.0], [5.0, 18.0, 1.0], [3.0, 19.0, 1.0],
	]
	var bass_roots := [0.0, 0.0, 5.0, 5.0, 3.0, 3.0, 7.0, 7.0, 5.0, 0.0]  # per 2 s bar, -12 oct
	var parts: Array = []
	for n in lead_notes:
		var f := 220.0 * pow(2.0, n[0] / 12.0)
		var dur: float = n[2] * beat
		parts.append([note(dur * 0.94, f, 0.28, 0.5, 1.0), int(n[1] * beat * SAMPLE_RATE), 1.0])
	for bar in bass_roots.size():
		for b in 4:
			var f := 55.0 * pow(2.0, bass_roots[bar] / 12.0)
			parts.append([bass_note(beat * 0.8, f, 0.34), int((bar * 4 + b) * beat * SAMPLE_RATE), 1.0])
	return mix(total, parts)


static func bass_note(dur: float, freq: float, amp: float) -> PackedFloat32Array:
	var n := int(dur * SAMPLE_RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var p := 0.0
	for i in n:
		var t := float(i) / float(n)
		p += freq / SAMPLE_RATE
		out[i] = amp * tri(p) * env(t * dur, dur, 4.0, 0.5)
	return out


## One-shots used by AudioManager (name -> buffer). Kept here for unit tests.
static func sfx(name: String) -> PackedFloat32Array:
	match name:
		"jump":
			return sweep(0.14, 300.0, 720.0, 0.5)
		"double":
			return sweep(0.16, 520.0, 1040.0, 0.45, 0.25)
		"spring":
			return sweep(0.24, 240.0, 960.0, 0.5)
		"stomp":
			var a := thud(0.14, 0.6)
			var b := sweep(0.1, 180.0, 90.0, 0.4)
			return mix(a.size() + b.size(), [[a, 0, 1.0], [b, 0, 1.0]])
		"gem":
			return mix(int(0.2 * SAMPLE_RATE), [[note(0.06, 988.0, 0.4, 0.5, 2.0), 0, 1.0], [note(0.14, 1319.0, 0.4, 0.5, 2.0), int(0.06 * SAMPLE_RATE), 1.0]])
		"power":
			var o := PackedFloat32Array()
			for f in [440.0, 554.0, 659.0, 880.0]:
				var s := note(0.09, f, 0.4, 0.5, 2.0)
				var at := o.size()
				o.resize(at + s.size())
				for i in s.size():
					o[at + i] = s[i]
			return o
		"hurt":
			return sweep(0.35, 440.0, 110.0, 0.5, 0.125)
		"death":
			return sweep(0.8, 660.0, 80.0, 0.5, 0.125)
		"win":
			var o := PackedFloat32Array()
			for f in [523.0, 659.0, 784.0, 1047.0, 1319.0]:
				var s := note(0.14, f, 0.45, 0.5, 2.0)
				var at := o.size()
				o.resize(at + s.size())
				for i in s.size():
					o[at + i] = s[i]
			return o
		"checkpoint":
			return mix(int(0.3 * SAMPLE_RATE), [[note(0.25, 1047.0, 0.4), 0, 1.0], [note(0.25, 1568.0, 0.25), int(0.07 * SAMPLE_RATE), 1.0]])
		"select":
			return note(0.06, 700.0, 0.35)
		_:
			return PackedFloat32Array()


## PCM16 mono bytes for AudioStreamWAV.data.
static func to_pcm16(buf: PackedFloat32Array) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(buf.size() * 2)
	for i in buf.size():
		var v := clampi(int(buf[i] * 32767.0), -32768, 32767)
		out.encode_s16(i * 2, v)
	return out
