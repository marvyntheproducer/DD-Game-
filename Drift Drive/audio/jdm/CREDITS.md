# V5.2 engine recordings

## 1JZ, RB26 and 2JZ-inspired simulator captures

42 actual recordings of full Engine Simulator runs: seven held RPMs (900, 1500, 2300, 3300, 4500, 5800, 7200), each at 0% and 100% throttle, three seconds each. The simulator's dynamometer holds RPM while its crankshaft, combustion, gas-flow and exhaust/audio code runs offline. Measured RPM minimum/mean/maximum and raw WAV hashes are in manifest.json. All raw sources were checked for clipping before processing.

Original: AngeTheGreat / Ange Yaghi — https://github.com/ange-yaghi/engine-sim
Offline exporter: Talhasarac — https://github.com/Talhasarac/engine-sim-sound-exporter
Exporter commit: a548360a33c6ddcc28265ac08b71b8a5f514ed3c
License: MIT, full original notice in ENGINE-SIM-LICENSE.txt.

Drift Drive supplied capture configurations, Linux portability fixes, quieter capture levels, RPM verification, preparation and runtime mixing. Reproducible instructions, engine scripts and patches are in tools/engine-sim-exporter/. These are recordings of simulated JDM-inspired configurations, not recordings of physical cars, exact factory replicas or the closed-source Community Edition executable. The earlier simple pulse synthesizer is no longer the shipped audio source.

Processing: DC/high-pass cleanup at 30 Hz, mono 32 kHz resampling, conservative peak headroom, Vorbis encoding. The exporter applies a short seam edit; decoded loops receive a cached runtime seam overlap and level matching. Separate captured throttle-on/off sources mix with player throttle; RPM interpolates only nearby recording anchors. The full simulator never runs inside the game.

## Actual RX-7 recording

Creator: Taz Ringer.
Source: https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus
Original video: https://www.youtube.com/watch?v=4z0y1H2REvE
License: Creative Commons Attribution 3.0 Unported — https://creativecommons.org/licenses/by/3.0/

Four longer excerpts of this real-car recording replace the earlier pulse-synthesized rotary bank. Automatic periodicity tracking selects source windows; time warping stabilizes the recorded rev sweep, followed by the same cleanup/encoding. Source hash, exact windows, estimated reference RPMs and tracking quality are recorded in manifest.json. No separate physical throttle-off takes or verified tachometer data are claimed. RX-7 load response uses one recorded source path per RPM with volume/filter changes, rather than inventing or duplicating an off-load recording. The source's ambience and its estimated RPM calibration remain limitations. Changes do not imply creator endorsement.

## Preview

previews/2jz-3000rpm.mp3 is a +6 dB MP3 audition of the unclipped 3000 RPM / full-throttle simulator capture, with the same MIT provenance. It is not a real-car microphone recording.
