# Engine audio sources

## Current V5 JDM banks

The default/current garage uses the newly edited recordings credited in
[jdm/CREDITS.md](jdm/CREDITS.md). Their manifest records all sources, licenses,
excerpt windows and output hashes. The older banks below are retained only for
legacy saves and attribution history. No CarX sound files are included.


## Street engine (real recording)

- File: `street-idle.wav` (original `loop_0.wav`, unmodified).
- Author: domasx2.
- Source: https://opengameart.org/content/racing-car-engine-sound-loops
- Original download: https://opengameart.org/sites/default/files/loop_0.wav
- License: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/
- Accessed: 11 November 2026.

The author describes this as a loop edited from a public-domain car recording
from pdsounds.org. The other five downloads are pitch variants of that same
recording, so only the original is bundled. This optional preset is a single
recorded idle loop with RPM-controlled pitch, not a multi-RPM performance-car
recording. Select it in the P tuning panel.

## Existing performance engine banks

RB25, 2JZ, ZB, Rotary and LS9 are embedded in `../sounds.js`.
Source verified against https://github.com/MertKalkanci/Unity-Car-Sound-System
(Mert Studio Car Sound System), MIT; full notice in `../sounds-LICENSE.txt`.
The upstream RB25 bank has idle, low, mid and limiter, but no high sample.
The other banks include a separate high-RPM layer. No high-RPM RB25 recording
has been invented or substituted from a different engine.

The player level-matches and smooths loop boundaries at runtime, blends available
RPM layers, and varies filtering and volume with throttle and camera position.

## V3.1 — Nissan 350Z field recording (VQ35Recorded)

- Creator: **KG's Garage** (YouTube).
- Original title: "I ruined the sound of my 350Z. I bought a cheap exhaust off
  marketplace and it doesn't sound good."
- Original: https://www.youtube.com/watch?v=zNpHriHrNl0
- Licensed media/source record:
  https://commons.wikimedia.org/wiki/File:Nissan_350Z_-_engine_and_exhaust_sound_(YouTube_zNpHriHrNl0).opus
- License: **Creative Commons Attribution 3.0 Unported**:
  https://creativecommons.org/licenses/by/3.0/
- Attribution: Nissan 350Z engine/exhaust audio by KG's Garage, CC BY 3.0.
- Changes: short excerpts, mono downmix, 22,050 Hz resampling, 45 Hz high-pass,
  8.5 kHz low-pass, Vorbis encoding; runtime seam crossfade and level matching.
- Files: `recorded/nissan-idle.ogg` (148.3–149.9 s),
  `recorded/nissan-low.ogg` (166.7–167.9 s),
  `recorded/nissan-mid.ogg` (190.4–192.0 s).

These are excerpts from a real modified 350Z, not verified steady dyno RPM
recordings and not an S14/SR20 or 2JZ recording. Layer names and playback RPMs
are approximations for the game. No new high-RPM or limiter recording has been
invented. The VQ35 gameplay tune is representative, not measured source-car data.

## V3.1 — Mustang recorded blend (MustangRecorded)

- **lmbubec**, "Ford Mustang Engine (1985).wav":
  https://freesound.org/people/lmbubec/sounds/119449/
- **FlaxGod**, "Muscle Car Revving" (recorded 1969 Mustang with a 302):
  https://freesound.org/people/FlaxGod/sounds/653226/
- Both recordings: **CC0 1.0**:
  https://creativecommons.org/publicdomain/zero/1.0/
- Source media: the creators' public high-quality MP3 preview files on
  cdn.freesound.org, downloaded 11 November 2026.
- Changes: excerpts, mono downmix/resampling/filtering/Vorbis encoding as above.
- `recorded/mustang-idle.ogg`: 5.0–7.4 s of lmbubec's recording.
- `recorded/mustang-low.ogg`: 0.55–0.95 s of FlaxGod's recording.
- `recorded/mustang-mid.ogg`: 0.12–0.55 s of FlaxGod's recording.

The bank deliberately blends two different Mustang recordings. It is not a
single calibrated engine/RPM capture session, and the 1985 idle source does
not verify an engine variant. Its V8 gameplay tune is not a manufacturer spec.

All six edited Ogg files are also embedded in `sounds.js`, preserving direct
file playback without additional downloads or local-file fetch permissions.
`recorded/manifest.json` contains edit windows and SHA-256 hashes.
