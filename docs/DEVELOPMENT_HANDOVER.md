# DD Game development handover

Checkpoint: 27 November 2026. Owner: Marvyn De Sousa.

## Current authorized work

1. Integrate the exact Silvia blueprint model approved by Marvyn: “Push it into the game, I approve.” No reapproval is needed.
2. Integrate a live engine simulator for game engine audio, keeping only the needed simulation and sound components. At most three engine configurations; start with the 2JZ, his preferred engine.

The approved model files are preserved in [design/silvia-approved](../design/silvia-approved). **Neither runtime integration is complete in this asset handover commit.** This commit does not update the desktop applications.

## Repository baseline

Main was verified at `282834ac3c7565bd1c67a8a409fc6141f65057a1`, V6.4, with PR 17 merged on 24 November 2026. Fetch latest main before integration. The old local V6.1 checkout is stale and should not be used as the baseline.

The earlier environment was unavailable. It became usable again for this asset upload. Check the current environment and read current repository instructions. Leave merging to Marvyn unless he authorizes a merge.

## Silvia integration

The archive includes `Silvia_Blueprint_Review.glb`, `.blend`, `build_silvia.py`, `model-info.json`, `model-sha256.txt`, README, the supplied blueprint and Third Party licence. Its GLB SHA-256 is `2e41b2ab6b324e787a83a0ec0a2d2ad75aac69620351aada0a0e6ee79c21050a`.

The actual GLB is 10,328,356 bytes, Y-up, front toward negative X, with 43 mesh groups and 361,154 triangles. Bounds are approximately 4.661 m long, 1.261 m tall and 2.085 m wide. Nominal body length is 4.64 m and wheelbase 2.52 m. Blender source axle positions were front X -1.30, rear X +1.22, wheel centre Z .335, width centres Y +/-.79. Tyre radius is approximately .337 m.

Groups distinguish `Body / <material>`, `Front left / <material>`, `Front right / <material>`, `Rear left / <material>` and `Rear right / <material>`. Preserve shape, paint, glass, lights, interior and wheel details. Keep calipers stationary as tyres, rims and rotors rotate. Runtime LOD may be needed for older Intel Macs and split screen. Preserve adaptive nose subdivisions in the generator; earlier geometry folded without them.

The game is primarily `Drift Drive/index.html`. `buildCar(color, vehicle='s14')` returns `{root, body, wheels, tailMat, headMat, windowShell, factorySpoiler, frontPlate, paint}`. Preserve suspension visuals, paint/customization, lighting, effects and camera contracts.

Game forward is positive X. Physics constants at baseline: `A=1.18`, `B=1.345`, `L=2.525`, `TRACK=1.48`, `R=.32`. Wheel entries contain `{pivot, spin, front, rimMaterial, spokeMesh}`. Align visual geometry to existing physics rather than changing handling to fit the asset.

`buildLegendaryCar(color,id)` uses `buildCar(color,'s14')` as its base and clears the body. Avoid replacing every other vehicle inadvertently or disposing shared cached geometry.

## Live engine audio

Requested repository: https://github.com/Engine-Simulator/engine-sim-community-edition

That Community Edition repository contains distribution documentation, not application source. Its README points to the original MIT-licensed implementation at https://github.com/ange-yaghi/engine-sim . Use that source and preserve copyright, permission and dependency notices. Do not assume a closed Community Edition binary can be stripped.

The user wants the simulator running live in the game, not another prerecorded bank or generic oscillator. Feed actual RPM, throttle, load, shifts and boost state to the physical simulation and audio system. Preserve BOV and backfire, including synchronized solo flames. Three engines is a maximum, not a requirement.

Existing headless work is in `tools/engine-sim-exporter/`. Read its README and reuse its patches. It uses https://github.com/Talhasarac/engine-sim-sound-exporter pinned to `a548360a33c6ddcc28265ac08b71b8a5f514ed3c`.

Relevant files:

- `tools/engine-sim-exporter/linux-exporter.patch`
- `tools/engine-sim-exporter/linux-piranha.patch`
- `tools/engine-sim-exporter/linux-compat.h`
- `tools/engine-sim-exporter/configs/JZ2Tour.mr`
- `tools/engine-sim-exporter/LICENSE.txt`

The documented headless build uses CMake, Ninja, C++17, Flex, Bison and Boost filesystem with csv-io, piranha and simple-2d-constraint-solver. It disables the app and Discord. The original core also has Delta Studio dependencies that need deliberate removal and compilation checks. Keep actual combustion, gas flow, exhaust pressure and synthesis, not just filters. `PistonEngineSimulator::writeToSynthesizer` is the physical exhaust-pressure sound path.

Choose native worker, WebAssembly or AudioWorklet architecture after inspecting build dependencies and profiling. Avoid a simulator budget that harms rendering or split screen. Only active player engines need audio simulation by default.

## Existing sound versus requested change

Current shipped audio consists of fourteen three-second offline simulator captures: RPM 900, 1500, 2300, 3300, 4500, 5800, 7200, each at zero and full throttle. These were generated by the real simulator, not microphone recordings. The simulator is not yet running inside the game.

Relevant files: `Drift Drive/jdm-bank-JZ2Tour.js`, `Drift Drive/jdm-audio.js`, `Drift Drive/sounds.js`, `Drift Drive/audio/jdm/manifest.json`, `Drift Drive/audio/jdm/CREDITS.md`, `THIRD_PARTY_LICENSES.txt`.

Current colouring uses .94 playback rate, +3.5 dB low shelf at 240 Hz and -3 dB high shelf at 2.4 kHz. BOV is filtered noise triggered by boost and throttle release with cooldown. Existing backfire uses MIT MertStudio CarSoundSystem samples. Preserve its triggers and flames.

## Preserve and verify

- V4 camera feel and stability.
- Existing careers, traffic, checkpoint path logic and intentional turnarounds.
- Split-screen per-player gauges and mini maps; no overhead names.
- V6.4 physics-aware AI steering and controlled slides.
- Shared 40% trailing-racer catch-up in solo rival and split races, switching roles on overtakes, with AI stability/corner limits.
- Slipstream within 60 m, gradually adding up to 30 km/h; sideways sliding alone does not cancel the human boost.
- Deeper 2JZ character, BOV and backfire.

Recorded pre-integration baseline was 140 automated tests and 406 full-map physics qualification routes with zero resets over 301.522 km. Those are baseline results, not proof that new integration passes. Rerun appropriate checks after code changes.

Check model loading, wheels, materials, customization, lights, camera/effect anchors, audio continuity, mute/pause/resume, both split players, frame time and memory. Relevant paths include `tests/game-harness.mjs`, `desktop/main.cjs`, `scripts/prepare-desktop.mjs`, `electron-builder.yml`, `.github/workflows/desktop.yml`.

After runtime integration, build and verify Windows, Mac Intel and Apple Silicon outputs as supported by current packaging. Check asset paths and simulator dependencies in packaged apps. Do not claim Mac runtime testing based solely on Linux tests. Publish actual installers only once their build jobs succeed.

## Resume sequence

Fetch current main; recover and verify the approved archive; implement model integration and measured LOD; adapt the MIT headless simulator to continuous runtime audio; wire actual car state; preserve effects; run regressions and profile solo/split screen; validate desktop builds; push a reviewable PR with precise results. Do not repeat visual approval or claim pending work is complete.
