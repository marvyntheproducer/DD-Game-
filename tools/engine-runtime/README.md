# Live Engine Simulator integration

Drift Drive V6.5 runs the original Engine Simulator combustion and gas-flow core live in WebAssembly. It is used for sound; Drift Drive remains responsible for vehicle motion and drivetrain RPM. One 2JZ inline-six configuration is included, within Marvyn's limit of three engines.

## Source and changes

- Original: AngeTheGreat / Ange Yaghi, https://github.com/ange-yaghi/engine-sim, MIT.
- Portable source checkpoint: https://github.com/Talhasarac/engine-sim-sound-exporter/tree/a548360a33c6ddcc28265ac08b71b8a5f514ed3c .
- Minimal rigid-body interfaces: https://github.com/ange-yaghi/simple-2d-constraint-solver/tree/e009f4ff1c9c4c5874e865e893cdb62e208fb2b3 , MIT.
- The requested Community Edition repository distributes binaries and documentation, and points to the original open-source core. No proprietary binary is reverse engineered here.

`vendor/` retains combustion chambers, gas systems, fuel and flame propagation, intake/exhaust flow, cams and valve flow functions, ignition, crank/piston component data, and delay/DC/low-pass/leveling filters. `upstream-adaptation.patch` records changes to copied upstream files.

Removed runtime components include the original UI, renderer and graphics dependencies; script compiler/parser; vehicle, transmission and mechanical constraint solver; dyno/starter interface; Discord; video; export tools and unrelated engines. Only a few solver body/state interface types remain because the original combustion classes use them. The compiled core is approximately 61 KB, excluding its small loader.

`runtime.cpp` maps the JZ2Tour bore/stroke, rod length, firing order 1-5-3-6-2-4, harmonic cams, port flow tables and runner/exhaust geometry into C++ objects. Analytic slider-crank kinematics follow game RPM. Original combustion, heat transfer, fuel burning and compressible gas flow compute exhaust runner pressure. The pressure/dynamic-pressure/delay path follows upstream `PistonEngineSimulator::writeToSynthesizer`; original DC, low-pass and leveling filters produce bounded float PCM. Existing game EQ, reverberation, BOV and backfire remain separate. This is an acoustic simulation approximation, not a certified factory recording or complete turbocharger simulation.

The adapter removes Engine::createSimulator's duplicate vehicle system, makes the unused pressure-to-force callback inert, exposes intake supply pressure for game boost/load, and applies C++ portability fixes. It does not replace combustion with an oscillator or prerecorded waveform.

## Runtime budget and lifecycle

The core uses 16 kHz physical updates with two gas-flow substeps, then interpolates to the AudioContext sample rate. A dedicated Worker renders 1024-frame blocks. An AudioWorklet only plays two independent mono queues, connected to each player's existing audio bus/pan. The queue targets three blocks (about 64–70 ms at 48/44.1 kHz), bounded to four. No SharedArrayBuffer or cross-origin isolation is required.

Only active human player slots are simulated. The second slot primes a shorter initial history to avoid blocking player one's PCM queue during a mode change. Removing a player destroys that engine instance. Suspending AudioContext naturally stops new worklet demand. Buffer starvation fades the last sample rather than repeating or emitting non-finite samples; repeated underruns switch smoothly to the existing simulator-capture bank. Unsupported Worker/AudioWorklet/WASM environments also use that bank, with a status message. BOV, backfire and solo flame triggers remain active in either audio path.

The source game still supports opening its complete folder directly: an encoded copy of the exact laptop GLB avoids file-fetch CORS restrictions. Desktop and HTTP launches use the binary model LODs. Live workers require a suitable secure origin; packaged desktop uses the secure offline drift protocol.

## Build and provenance

Install/activate Emscripten **4.0.20**, then run:

```sh
EMXX=/path/to/emsdk/upstream/emscripten/em++ npm run engine:build
npm run game:bundle
npm test
npm run desktop:prepare
```

`build-manifest.json` records normalized hashes of C++ inputs, compiler settings, generated loader and WASM. Tests verify them. The desktop CI rebuilds with pinned Emscripten and compares checked-in outputs before tests and installer packaging. Ordinary Mac/Windows packaging uses the same portable checked-in WASM and needs no native compiler.

The offline Electron smoke test runs with the real desktop asset handler, CSP and renderer sandbox, confirms both player channels are live, and measures nonzero engine output. Its headless Linux software-renderer timing is not a Mac/Windows performance guarantee. Target hardware still needs hands-on performance validation.

## Validation

Tests cover fuel consumption and cylinder pressure; independent RPM for both players; ignition-cut decay; redline/boost sweeps and malformed inputs; bounded finite output; queue starvation and channel isolation; source/binary manifest matching; model arches/pivots/calipers, appearance independence, LOD bounds and shared geometry; offline GLB/WASM delivery and CSP. Existing world/race/AI and synchronized BOV/backfire tests remain in the suite.

MIT notices are copied into desktop engine-sim assets and included in THIRD_PARTY_LICENSES.txt. Keep those notices with redistributed builds.
