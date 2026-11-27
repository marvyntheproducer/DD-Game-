# Live physical engine audio

The only engine-sound source is the live WebAssembly integration of Ange Yaghi / AngeTheGreat's MIT Engine Simulator combustion and gas-flow code. No engine recording banks, loop player, oscillator replacement or sample fallback are shipped.

Source: https://github.com/ange-yaghi/engine-sim ; portable checkpoint: https://github.com/Talhasarac/engine-sim-sound-exporter/tree/a548360a33c6ddcc28265ac08b71b8a5f514ed3c . Adapted source and licences: tools/engine-runtime/ in the repository and engine-sim/ licence files in the desktop bundle.

The inline-six configuration derives from JZ2Tour bore/stroke, firing order, cams, port flow and exhaust dimensions. Game RPM drives crank/piston kinematics. Throttle, load, boost and ignition cuts control combustion and gas pressure. This is a physical acoustic approximation rather than a certified factory model or microphone recording.

BOV is the existing filtered-noise release effect. Backfire remains the separately licensed MertStudio CarSoundSystem effect, with synchronized solo flames. These effects do not replace engine combustion audio. Their notices remain in sounds-LICENSE.txt and THIRD_PARTY_LICENSES.txt.

The original simulator UI/renderer, parser, duplicate game vehicle solver, dyno, Discord/video and unrelated engines are excluded. On an error the live system reports it and retries; it never changes to a different engine-sound source.
