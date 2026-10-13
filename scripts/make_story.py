#!/usr/bin/env python3
"""Render the original story with local eSpeak NG; no remote speech service.

Requires the eSpeak NG shared library and voice data. The output is committed,
so readers and the ordinary site build do not need the speech synthesizer.
"""
import ctypes as c
import ctypes.util
from pathlib import Path
import wave

ROOT = Path(__file__).resolve().parents[1]
lib = c.CDLL(ctypes.util.find_library("espeak-ng") or "libespeak-ng.so.1")
lib.espeak_Initialize.argtypes = [c.c_int, c.c_int, c.c_char_p, c.c_int]
lib.espeak_Initialize.restype = c.c_int
lib.espeak_SetVoiceByName.argtypes = [c.c_char_p]
lib.espeak_SetParameter.argtypes = [c.c_int, c.c_int, c.c_int]
lib.espeak_Synth.argtypes = [c.c_void_p, c.c_size_t, c.c_uint, c.c_int, c.c_uint, c.c_uint, c.c_void_p, c.c_void_p]
rate = lib.espeak_Initialize(2, 0, None, 0)  # synchronous callback output
if rate <= 0:
    raise SystemExit("Could not initialise eSpeak NG voice data")
chunks = []
@c.CFUNCTYPE(c.c_int, c.POINTER(c.c_short), c.c_int, c.c_void_p)
def collect(samples, count, events):
    if samples and count:
        chunks.append(c.string_at(samples, count * 2))
    return 0
lib.espeak_SetSynthCallback(collect)
assert lib.espeak_SetVoiceByName(b"en") == 0
assert lib.espeak_SetParameter(1, 145, 0) == 0  # words per minute
assert lib.espeak_SetParameter(2, 65, 0) == 0   # relative amplitude, not dBA
script = (ROOT / "site/story.txt").read_text().encode("utf-8") + b"\0"
assert lib.espeak_Synth(script, len(script), 0, 1, 0, 1, None, None) == 0
lib.espeak_Synchronize()
lib.espeak_Terminate()
output = ROOT / "docs/assets/pip-and-the-little-light.wav"
with wave.open(str(output), "wb") as wav:
    wav.setparams((1, 2, rate, 0, "NONE", "not compressed"))
    wav.writeframes(b"".join(chunks))
print(f"Wrote {output.name}: {sum(map(len, chunks)) / (rate * 2):.1f}s, mono PCM, {rate} Hz")
