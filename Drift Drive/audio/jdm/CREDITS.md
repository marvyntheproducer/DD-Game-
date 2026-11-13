# V5.3 — 2JZ capture bank

Only the 2JZ engine is shipped. Its 14 three-second clips are recordings of full Engine Simulator runs at seven held RPMs (900, 1500, 2300, 3300, 4500, 5800, 7200), each at 0% and 100% throttle. Capture PCM, measured RPM and source hashes are unchanged from V5.2. These are simulated JDM-inspired engine configurations, not recordings of physical factory cars.

Original simulator: AngeTheGreat / Ange Yaghi — https://github.com/ange-yaghi/engine-sim
Headless exporter: Talhasarac — https://github.com/Talhasarac/engine-sim-sound-exporter
Pinned exporter commit: a548360a33c6ddcc28265ac08b71b8a5f514ed3c
License: MIT; full notice in ENGINE-SIM-LICENSE.txt. Configurations and Linux patches: tools/engine-sim-exporter/.

Processing: DC/high-pass cleanup at 30 Hz, mono 32 kHz resampling, conservative headroom and Vorbis encoding. Decoded clips receive cached seam overlap/level matching. Runtime coloration adds a 0.94 pitch/rate factor, a +3.5 dB 240 Hz low shelf and a -3 dB 2.4 kHz high shelf. Independent captured load takes blend between nearby RPM anchors. The simulator does not run in-game.

BOV: original Drift Drive filtered-noise whoosh, shaped by boost, throttle lift, envelope and cooldown; no third-party recording.
Backfire: existing Mert Studio Car Sound System samples (MIT), unchanged; see sounds-LICENSE.txt. Their playback triggers and synchronized solo flame events remain.

The raw 3000 RPM MP3 is a +6 dB source audition; the driving MP3 demonstrates runtime coloration and the BOV/backfire sound design. Other engine/rotary banks have been removed.
