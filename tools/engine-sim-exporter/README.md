# Full Engine Simulator recording pipeline

These recordings run the real combustion, gas-flow, crankshaft, dyno and audio code. They do not use the earlier Drift Drive pulse generator. The compatible open-source simulator is an approximation; these captures are not microphone recordings of factory engines or a complete turbocharger model.

Upstream headless exporter: https://github.com/Talhasarac/engine-sim-sound-exporter
Pinned commit: a548360a33c6ddcc28265ac08b71b8a5f514ed3c
Original simulator: AngeTheGreat / Ange Yaghi, https://github.com/ange-yaghi/engine-sim
MIT notice: LICENSE.txt. Credit to Talhasarac for the offline exporter.

The Linux patches fix C++ portability, header/linkage issues and linker order; they also lower the audio leveler's target to 6500 before PCM conversion and log measured RPM during recording. Physical solver formulas are retained. `linux-compat.h` supplies standard headers and MSVC keyword equivalents. Configurations derive from the upstream `assets/engines/atg-video-2/03_2jz.mr`, with different displacement/rod/chamber/exhaust settings. They are JDM-inspired simulations, not certified factory replicas. Each uses the upstream default exhaust response, 20 kHz physics, a limiter above the highest recording anchor, reduced initial jitter and noise.

On Linux, install CMake, Ninja, a C++17 compiler, Flex, Bison, Boost filesystem development headers/libraries and Git. Clone the pinned fork and initialize its csv-io, piranha and simple-2d-constraint-solver submodules. Apply linux-exporter.patch in the root and linux-piranha.patch inside the piranha submodule. Copy linux-compat.h to the root. Place the three configs in `assets/engines/dd/` and create `assets/dd-ENGINE.mr` containing:

```
import "engines/dd/ENGINE.mr"
main()
```

Configure with `cmake -S . -B build-export -G Ninja -DBUILD_APP=OFF -DDISCORD_ENABLED=OFF -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_POLICY_DEFAULT_CMP0167=OLD -DCMAKE_CXX_FLAGS="-include $PWD/linux-compat.h"`, then `cmake --build build-export --target engine-sim-exporter`.

For each ENGINE (`JZ1Street`, `RB26Tour`, `JZ2Tour`), from the exporter root:

```
build-export/engine-sim-exporter --script assets/dd-ENGINE.mr --out CAPTURES/dyno-ENGINE --rpm 900,1500,2300,3300,4500,5800,7200 --throttle 0,100 --duration 3 --warmup 3 --no-startup --no-ignition-off > CAPTURES/dyno-ENGINE.log
```

Keep the raw WAVs and logs. From Drift Drive, run `python tools/prepare-captured-audio.py --captures-root CAPTURES --rotary-source rotary.opus` to create the shipped banks. This validates measured RPM and absence of PCM clipping before editing/encoding, and records raw and delivered hashes. NumPy, SciPy and FFmpeg are needed for preparation.

RX-7 source: https://commons.wikimedia.org/wiki/File:Mazda_RX-7_-_engine_and_exhaust_sound_(YouTube_4z0y1H2REvE).opus — Taz Ringer, CC BY 3.0. It is processed separately, not presented as a Wankel simulator capture. Source windows and estimated RPM/tracking data are retained in the manifest. The real recording's rev sweeps are stabilized by resampling the original waveform against measured periodicity; no synthetic rotary waveform is added.
