# DD Game V6.5.1 development handover

Owner: Marvyn De Sousa. Updated 27 November 2026.

## Implemented

The approved Silvia blueprint model is the playable Silvia in the s14 garage slot. Runtime detail and laptop/split-screen LODs derive from the approved Blender source, with separate wheel steering/spin, stationary calipers, shared geometry, independent paint, working lights, factory spoiler and appearance options. Physics, camera and other JDM car models retain their existing behavior.

Live 2JZ sound runs Engine Simulator combustion, fuel burning, gas flow and pressure-derived audio in WebAssembly inside a dedicated Worker. An AudioWorklet plays bounded per-player PCM queues through the existing EQ/pan/reverb buses. Game RPM, throttle, load, boost and ignition cuts control the simulation. BOV, backfire and synchronized solo flames remain. There are no engine recordings, sample loops or alternate engine playback paths. Errors are reported and the live system retries.

Only one engine configuration is enabled. The original simulator UI, graphics dependencies, parser, duplicate vehicle/transmission/constraint solver, dyno/starter interface, Discord and video are excluded. The MIT core is used because Community Edition provides documentation/distribution binaries rather than source.

## Continue from these files

- `Drift Drive/index.html`: game integration, bundled runtime adapters and asynchronous model preload.
- `Drift Drive/silvia-model.js`: canonical model factory, wheel/material mapping and detail switching.
- `Drift Drive/models/`: detail/laptop GLBs and direct-file compatibility data.
- `design/silvia-approved/`: immutable approved source archive, checksum and previews. No reapproval is required.
- `tools/export-silvia-runtime.py`: reproducible Blender derivation of runtime LODs.
- `tools/engine-runtime/README.md`: full source provenance, scope, build and performance notes.
- `tools/engine-runtime/runtime.cpp`, `vendor/`, `upstream-adaptation.patch`: live core and documented adaptations.
- `Drift Drive/engine-sim/`: compiled core, dedicated Worker and PCM AudioWorklet.
- `Drift Drive/live-engine-audio.js`: game-side lifecycle, channel routing and fallback.
- `scripts/bundle-game-modules.mjs`: keeps canonical adapters bundled in HTML for the existing direct-file launch path. Run `npm run game:bundle` after adapter edits.

Original source: https://github.com/ange-yaghi/engine-sim . Portable checkpoint: Talhasarac/engine-sim-sound-exporter `a548360a33c6ddcc28265ac08b71b8a5f514ed3c`. Minimal solver interfaces: `e009f4ff1c9c4c5874e865e893cdb62e208fb2b3`. Preserve all MIT notices.

## Verification and packaging

Build with Emscripten 4.0.20 using `npm run engine:build`. The source/binary manifest and CI rebuild comparison detect stale outputs. Run `npm test`, `npm run desktop:prepare`, and the real offline Electron integration check `npm run desktop:smoke` on Linux.

Version is 6.5.1. The desktop workflow packages Windows x64, Mac Intel and Apple Silicon using the portable checked-in WASM. Installer availability must be confirmed from successful workflow artifacts, not inferred from source updates. Headless Linux tests do not establish target Mac/Windows runtime performance.

Keep V4 camera behavior, the V6.4 physics-aware AI, 40% trailing-racer catch-up, slipstream up to +30 km/h within 60 m, checkpoint route behavior, careers/traffic, per-player gauges and maps, and no overhead player labels. Do not remove BOV/backfire when improving engine audio.

Before future edits, fetch latest main and current integration PR, inspect repository instructions and preserve Marvyn's local saves. Leave merging to Marvyn unless he explicitly authorizes it.

## V6.5.1 follow-up

The owner reported the generic live-audio fallback on a Mac and shaking tyres. The old controller permanently reverted to captures after a few underruns and hid the actual error. The new controller uses explicit 44.1 kHz output, adaptive 16/12/8 kHz physical rates, a bounded queue that can grow from three to six blocks, transient-stall recovery, automatic retries (without any recorded-engine fallback) and a manual retry/error message. Low-power profiles start lighter. The exact Mac failure cannot be identified from the old generic message alone.

Tyres were 15 mm above their spin pivot and the approved wheel order did not match the old per-side height array. Geometry is now centred at the source axle, wheel-local geometry keeps a circular scale, and damped visual travel follows each wheel's own surface without counting chassis road tilt twice.

The shared desktop/session.cjs policy is used by the real app and smoke tests. Each platform's package job tests app.asar contents with an injected worker failure and four-thread profile before uploading installers.

Marvyn explicitly required the simulator to be the sole engine source with no fallbacks. All recorded engine banks, loop crossfading/caching code, capture audio files and previews have been removed from the runtime. jdm-audio.js now contains only a live-engine selection descriptor. BOV and backfire remain separate effects.
