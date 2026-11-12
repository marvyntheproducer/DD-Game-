# V5.1 engine audio

The default banks replace V5's short field-recording excerpts with original crank-angle pulse synthesis convolved with the exhaust response from **Engine Simulator**, by **AngeTheGreat (Ange Yaghi)**.

Upstream: https://github.com/ange-yaghi/engine-sim
Commit: 85f7c3b959a908ed5232ede4f1a4ac7eafe6b630
Source response: assets/sound-library/smooth/smooth_39.wav (included as engine-sim-smooth39.wav).
License: MIT; full notice in ENGINE-SIM-LICENSE.txt.

`tools/prepare-sim-audio.py` adapts the DC removal, pressure/derivative blending and exhaust convolution approach in `src/synthesizer.cpp`, especially `initializeImpulseResponse` and `renderAudio`. The periodic cylinder-pressure excitation, engine voicing, filtering and bank generation are original Drift Drive work. No upstream C++ executable or third-party engine scripts are included. The Community Edition release linked by the user distributes a Windows application; its README points to this original open-source version. This is **not the complete Engine Simulator combustion/gas-flow model**, a live integration, a recording from that app, or verified factory engine audio.

Four voices: even-firing six-cylinder 1JZ, RB26 and 2JZ-inspired configurations; two-rotor 13B-inspired voice (four exhaust events per 720 degrees). Eight complete cycles per loop; exact reference RPMs account for integer sample lengths. Steady pulses avoid accidental field-recording misfires, guessed RPM references and background noise. Pressure decay and exhaust mix differ per voice. Muted layers retain crank phase, layers start together, and linear blending avoids doubling correlated waveforms. A single load-dependent low-pass signal path avoids parallel-filter combing. These loops use lossless PCM WAV and runtime playback-rate interpolation, so they remain an approximation rather than a factory sound match.

Rebuild: `python tools/prepare-sim-audio.py` (NumPy and SciPy required). Inputs are included; no network access required. `manifest.json` records hashes and upstream commit. The earlier `tools/prepare-jdm-audio.py` remains a historical V5 recording utility and is not the generator for the shipped default banks.
