# Drift Drive V5.1 — JDM Nights

A Three.js / Web Audio driving game with free roam, local split-screen, engine
swaps, drift tuning, and custom road races. Locations are fictional and inspired
by Japanese landscapes.

## V5 — JDM Nights

Choose **Solo**, **Split Screen**, or **Quick Race** before entering the world,
then choose your cars and tune them. Press **1/2/3** to select a mode and
**Enter** to launch; the mode cards also work with a mouse.

The curated garage contains only four JDM legends: **Nissan Silvia S14**,
**Nissan Skyline GT-R R34**, **Toyota Supra A80** and **Mazda RX-7 FD**.
Each uses its own original lightweight body silhouette and signature lighting/
spoiler treatment. These are procedural interpretations, not OEM CAD assets.
They share the existing arcade contact chassis; choosing a GT-R does not add
a separate factory AWD simulation. Player 1's car choice selects a matching
gameplay engine profile and approximate weight; split-screen shares the
session's engine/handling tune. Each car/slot remembers its own appearance.

The pre-start garage offers paint, wheels, spoilers, front/rear bumper options,
smoke colour, Street/Drift setups and the full engine/gearbox tuning panel.
Custom body/smoke options remain solo effects, following the V4.1 graphics
budget. Old player builds/tunes remain readable. Choosing another body does
not delete exploration progress.

**Quick Race** supports solo time trials or local split-screen. Pick the Aoi
Expressway Sprint, Fujimi Mountain Circuit, Shiosai Coastal Sprint or Shiosai
Tunnel Run, or open the race builder before starting. Saved/custom routes
continue to work. An incomplete custom route stays in the setup/builder and
shows a message instead of starting a broken race.

Every selected route builds its starting arch, intermediate gates and finish/
lap gate before the countdown. Intermediate spacing is approximately 120 m,
with extra gates at chosen waypoints. All gates remain in the scene throughout
the race; normal camera range, fog and terrain occlusion still apply. The map
shows the checkpoint sequence. An always-on HUD arrow and distance point at the
next checkpoint independently for each player, including when the racing line
is hidden. Arrows stop on finish/exit.

Chase cameras sit closer and higher and keep a fixed follow distance at speed.
Hood/cockpit views follow heading and filtered road grade without suspension
roll. View changes reset their framing; terrain/tunnel clearance remains.

Four default audio voices use original crank-angle pulse synthesis and the
MIT-licensed exhaust response/audio approach from Ange Yaghi's Engine Simulator.
The older short field-recording loops have been replaced. These are lightweight
synthesized approximations, not factory recordings or the complete simulator.
Lossless loops retain crank phase through RPM changes; a single load-dependent
filter handles acceleration and overrun. See `Drift Drive/audio/jdm/CREDITS.md`
and `tools/prepare-sim-audio.py` for attribution and reproducible generation.
Historical engine tuning remains readable; deprecated older sound choices stay
hidden unless currently selected. Sound quality still needs a listening test
on the player's device.

Radio starts automatically on the first user-initiated mode entry. **J → Cruise
radio** changes station or turns it off. An explicit Off choice is respected
when pausing/resuming that session. Browsers require a user gesture, so the
initial unclicked loading/menu screen stays silent.

## Desktop app for Mac and Windows

The desktop edition bundles the complete game for offline play with a custom
icon, native menus, fullscreen controls, photo-save dialogs and automatic local
saves. Intel Mac, Apple Silicon Mac and Windows x64 installers are configured.
See [DESKTOP.md](DESKTOP.md) for downloads, installation, controls and building.

Developers: `npm ci`, then `npm run desktop:start`.
Native installers: `npm run desktop:mac` or `npm run desktop:win`.
The GitHub **Desktop installers** workflow builds all three architectures.

## Play

Extract the entire folder and open `Drift Drive/index.html`. The game needs an
internet connection to load Three.js. Physics, profiles and navigation helpers
are embedded in the HTML, preserving direct-file startup compatibility.

For reliable loading of the optional Street recording, serve the folder:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/Drift%20Drive/ and choose **Solo Run** or **Split Screen**. Startup now reports
its current stage and terrain percentage while building the larger world.

## V4.1 — Solo Style

The new additions are available in **Solo Run**:

- **Grass dust and clippings:** grounded rear tyres kick up muted brown dust and
  small green clippings on unpaved, grassy ground when moving or spinning.
  Emission follows tyre position, speed and wheelspin; it stops on asphalt,
  in water, in the air and on the snowy highlands. It shares the existing
  900-particle pool and reduces emission in the lower solo graphics tier.
- **Redline backfires:** held throttle at the rev limiter produces repeated
  restrained exhaust pops/flames, capped at roughly four per second. Limiter
  hits are latched by physics so a short cut between rendered frames is not
  missed. Audio and flame share the same event timestamp; gear shifts retain
  their existing drivetrain behavior.
- **Spoilers:** clean trunk, factory wing, painted ducktail or GT wing.
- **Separate bumpers:** factory, street lip/spats or deeper drift front bumper
  and rear diffuser. Choose the front and rear independently.
- **Tyre-smoke colour:** choose any colour with a live colour picker. Grass
  dust/clippings keep their natural colours.

Open **J → Your build** (or **P → Wheels, paint & personal build**) for these
appearance options. Changes preview immediately and save with the existing
V4 build on this device. Old builds load with sensible defaults; other saved
V4 settings and exploration progress are preserved. Bodywork choices are
cosmetic and do not alter grip, power or collision dimensions.

Split-screen uses the factory wing/bumpers and neutral tyre smoke; the new
grass particles and redline flames/pops are disabled. Returning to solo
restores the saved appearance. All body variants are built once and switched
by visibility, with no model downloads or per-change geometry rebuilding.

## V4 — Cruise Life

Press **J** while driving to open the Cruise Life hub. Driving pauses while
browsing, including in split-screen. Core features are available from the start.

| Addition | What to try |
| --- | --- |
| Time and weather | Day, golden sunset or night, plus optional light rain. Solo headlights illuminate the road; split-screen uses cheaper beam effects. Rain changes appearance and ambience, preserving tyre grip. |
| Scenic stops | Sakura Konbini, Aoi Fuel & Rest, Shiosai Sunset Meet, Fujimi Lookout and Valley Works Garage. Each has a paved pull-off connected to the road. Discover them while driving, use Tab for navigation, or travel through J. |
| Optional runs | A clean mountain route, five accumulated seconds of controlled drifting, and a coastal cruise. No countdown or time limit. Player 1 leads; Player 2 can cruise along. K cancels and U retries the last completed run. |
| Small car meets | Parked, solid JDM-inspired coupes at the seaside and garage, quiet nearby music and occasional slow arrivals. A shared fleet of at most nine uses six instanced draws; split-screen displays at most six nearby cars. |
| Personal builds | Per-player paint, three wheel styles, three visual ride heights, body kits, exhaust character, interior trim and windshield banners. Live build preview; C cycles through chase and cockpit cameras. Builds save locally. |
| Cruise radio | Three original instrumental stations: lo-fi, ambient and jazz-inspired. Radio starts off. Import a local audio file for your own music; imports stay on your device and must be selected again after reloading. Independent engine, music and ambience sliders. |
| Photo mode | O pauses the world and hides the HUD. Drag to orbit, right-drag or WASD to pan, Q/E to lift, wheel to zoom and arrows to orbit. Choose a lens and filter, then Space or Save PNG to download a photo. Esc returns to driving. |
| Relaxed progression | Collect five location postcards, three optional-run postcards and explored distance. Discovering three stops unlocks a club banner; five kilometres and run postcards add quick paint swatches. Custom paint and the main build options remain free. No currency, streaks or daily tasks. |

**F** opens the hub when stopped near a destination. Traditional timed races
remain available through B/G; finish or leave one before opening the hub or
photo mode. Resetting or travelling cancels an optional run without removing
earned postcards. Exploration distance counts driving, not fast travel.

Parking areas use the same authoritative asphalt and terrain contact system as
the roads, with boolean cutouts to avoid overlapping road surfaces and unbounded
loading work. Parked vehicles and destination props have solid horizontal
contacts. These remain simplified, inexpensive representations, not pedestrian
or full vehicle-body simulation.

Progress, builds and weather save in this browser on this device. Clearing site
data can remove them. Split-screen shares the environment and exploration
journal, while each player has a separate visual build. Ride height changes the
body visually and preserves tyre/contact physics. Exhaust character filters
the existing engine bank rather than claiming to be a new recording.

Radio music is original procedural synthesis, embedded for direct-file playback.
See `Drift Drive/audio/radio/CREDITS.md` and its reproducible manifest.
Regeneration uses `tools/generate-cruise-radio.py` with NumPy and FFmpeg.
Night/rain use bounded particle pools, no rain physics and no headlight shadows.
The existing automatic graphics and traffic fallbacks remain active.

## V3.1 adjustments

The garage now starts with two large setup buttons and collapsible groups for
grip/drift, engine power, gearbox, engine response and camera/audio. Controls
have units and short explanations. **Drift spin prevention** adds bounded yaw
torque to catch an increasing drift angle; it fades during strong steering,
handbrake use and clutch kicks. It never sets the car's position or sideways
velocity. This is an original assist inspired by drift-game behavior, not
CarX's proprietary physics. **T** still disables assists.

Solo smoke is denser, lasts longer and has a larger pool. After roughly eight
seconds of sustained high tyre heat/wheelspin, up to three brief stylized tyre
flame bursts can appear. Cooling resets the effect; there is no fire/damage
simulation. Split-screen retains lighter smoke and omits heat flames.

The chase camera uses a damped spring, velocity look-ahead, drift-aware framing,
faster yaw response and a gentle acceleration/shift FOV effect. Adjust
**Camera intensity**; reduced-motion/minimal-motion settings suppress extra
roll and jolts. Tunnel camera height and lateral travel are constrained.

Solo detail adds a subtle JDM aero/side-skirt package, bonnet vents, tow strap,
windshield banner, wheel lug details and a refined paint response. These details
are merged into a small number of meshes and hidden in split-screen or the
reduced solo graphics tier.

Two new **real recorded** sound options are listed first in Engine swap & sound:
**Nissan 350Z** and **Mustang recorded blend**. New installs start with the
recorded Nissan option; existing saved engine choices are preserved. These are
edited real-car excerpts with approximate playback RPM references, not a full
dyno capture or verified S14/SR20 recordings. The Mustang bank combines two
Mustang recordings. Source identities, licenses, edit windows and hashes are
in `Drift Drive/audio/CREDITS.md` and `audio/recorded/manifest.json`.

Approximately **4.5 km of new roads** open the west side of the existing world:
a wider coastal road, an industrial link and **Shiosai Covered Tunnel**. The
covered tunnel has an arched concrete roof, solid side boundaries, batched
ceiling fixtures, portal signs and a darker engine filter. It is a constructed
covered tunnel/gallery, not an excavated subterranean terrain layer. Use
**Tab → Shiosai Coastal Loop / Minato Industrial Link / Shiosai Covered Tunnel
→ Travel**. Roads use the same clipped pavement, graded verges and climbable
height limits as the rest of the map.

## V3 modes and instruments

The retro arcade menu opens after loading. Choose **1** for solo or **2** for
split-screen, or use the mode buttons. **Esc** ends an active race; otherwise
it returns to the menu and pauses the run. **Enter / Resume Run** resumes the
selected mode. Both players have analog speedometers and RPM dials, a gear
indicator and a digital speed readout. Gauge faces are cached and needles
redraw at up to 30 Hz.

Under **P → Base handling setup**, choose:

| Setup | Handling |
| --- | --- |
| Street Racing | More rear grip, 42° steering lock, stronger anti-spin support and milder clutch kicks for stable corner exits. |
| Drifting | 58° lock, balanced grip, spin prevention, slide support and stronger clutch kicks for controllable drift angle. |

These presets change chassis/assist settings and preserve the selected engine,
power and gearing. Individual sliders remain editable. Applying a preset
re-enables driving assists; **T** still toggles them. Tuning is shared between
players in split-screen.

Solo mode adds a small exhaust flame with each backfire sound. Lift-off after
high-RPM throttle, loaded upshifts and limiter transitions can trigger a pop;
a cooldown limits repeated bursts. Sound and flame use the same AudioContext
timestamp. The visual is disabled in split-screen. Subtle speed streaks, a
corner vignette, impact pulses and a small shift FOV response add motion cues.
Choose **P → Solo micro effects → Minimal motion** to suppress those cues;
the operating system's reduced-motion preference is also respected.

Solo lighting uses a more neutral sky, warm directional light, atmospheric
haze, existing PBR car materials and a small procedural asphalt normal map.
Split-screen omits realtime shadows, road normal detail and solo micro effects.
The renderer caps its drawing buffer at 2.8 million pixels. Sustained solo
frame times above 35 ms reduce resolution and disable realtime shadows,
road normal detail and speed streaks; sustained faster frames restore them.
This is an automatic safeguard, not a measured browser FPS guarantee.

Traffic has solid oriented collision boxes. Contacts separate overlapping
cars and stop inward motion each physics tick without vertical impulses.
Traffic brakes and waits briefly after a collision. Its population still
reduces automatically on slow frames and stays off during races.

## Explore

The map is **14 × 14 km**. The **Aoi Skyline Expressway** is approximately **13.2 km**, with sweeping
curves, foothill climbs, coastal views, four lanes, guardrails and connected
exits. Its route rises from roughly 15 m to 150 m. Driving time is approximately
3–4 minutes at motorway speeds; acceleration, climbs and driving style change
the actual time.

| Place | Landscape |
| --- | --- |
| Sakura Town | Original valley roads, village houses, pink blossom trees and torii |
| Aoi Coast | Western expressway terminus and coastal plain |
| Hikari Harbour | Eastern terminus, harbour inlet, approach road, quays and cranes |
| Kiso Rice Terraces | Farming basin with patterned rice paddies and raised earth banks |
| Take Bamboo Village | Bamboo groves, blossom trees and country roads |
| Akane Autumn Pass | Orange/red woodland and hillside roads |
| Fujimi Snow Ridge | Snow-covered high ground and mountain passes |
| Mizuki Lake | Inland lake and highland roads |
| Expressway Service Area | Central foothill highway exit and parking area |

Press **Tab** for the map. Use the wheel or ＋/− to zoom and **Shift-drag** to pan.
Select a named location and press **Travel** to reach it. Travel is disabled
while racing; **Esc** ends the race.

## Road and drivetrain corrections

Road rendering and ground contact now use the same clipped pavement polygons.
Overlapping ribbons and folded hairpins are trimmed into a single surface;
junctions and road ends are included in that surface rather than drawn on top.
Soil is cut out of the paved footprint and stitched to the asphalt edges,
removing the raised platforms and vertical retaining strips. Rendered soil
triangles also supply ground contact. Suspension travel and body tilt are
bounded at road edges so a wheel leaving the asphalt cannot stand the car up.
Shared verge vertices are cached during loading, and soil contact uses a finer
10 m lookup grid to avoid scanning large terrain buckets each physics step.

Road profiles are constrained across their full width to at most **14% grade**
on mountain passes, **12%** on other roads and **6.5%** on the expressway. Steep
approaches use longer switchbacks. Factory baseline engines are tested against
a 14% uphill launch load; deliberately underpowered custom gearing/power tunes
can still make climbing harder.

Automatic shifting now checks road-coupled RPM, wheel slip and available
next-gear force. It holds the current gear during a burnout instead of hunting
between 1st and 2nd. A shift has a cooldown and hysteresis, synchronizes RPM to
the new gear, clears the old limiter cut, and restores torque smoothly. Low-speed
clutch slip keeps the engine in a useful launch range. There is no traction-control
power cut based on wheelspin. The actual rev limiter still operates at redline.
Use **M** for manual gears and **E/Q** to select a gear yourself during a burnout.

Saved routes retain their waypoints. Use **B → Highway sprint** to load the new
scenic highway route. Personal-best keys include this road-layout revision so
records from the previous geometry are not mixed with new-route times.

## Driving and drifting

| Action | Player 1 | Player 2 (split-screen) |
| --- | --- | --- |
| Accelerate / brake | W / S | Up / Down |
| Steer | A / D | Left / Right |
| Handbrake | Space | Enter / Right Shift |
| Clutch | Left Shift | / |
| Shift up / down | E / Q | . / , |
| Reset / race recovery | R | Backslash |
| Camera | C | ' |

**2** toggles split-screen. **M** toggles automatic/manual gears. **T** toggles
assists. **P** opens tuning. **L** toggles the racing line.

For a clutch kick, hold the clutch briefly while applying throttle, let the
engine rev above the current driveline RPM, then release it. The burst now
increases rear-wheel speed and applies a short engagement torque pulse. It does
not add a sideways impulse or force a drift angle. Handbrake release does not
trigger a clutch kick.

In **P**, adjust **Clutch-kick strength**, **Kick slip window**, **Slide support**,
**Countersteer assistance**, and **High-angle anti-spin**. Slide support reduces
rear grip and lateral resistance while applying throttle in an existing slide.
It fades at low speed and excessive spin angles. Automatic countersteering is
reduced during a kick and when you steer manually. Setting strength/support to
zero disables that effect; **T** disables the slide and steering assists.

## Engine configurations

Engine selection now changes the physical engine and transmission as well as
its sound. Each bank has a torque curve, power/torque limits, rev limit, idle,
boost onset/response, inertia, engine braking, gear ratios and final drive.

| Engine | Baseline character | Gearbox |
| --- | --- | --- |
| RB25DET | 2.5 L turbo inline-six; medium-range boost delivery | 5-speed |
| 2JZ-GTE | 3.0 L twin-turbo inline-six; broad torque | 6-speed |
| 13B-REW / Rotary | 1.3 L twin-rotor; lighter flywheel and higher rev range | 5-speed |
| LS9 | 6.2 L supercharged V8; strong low/midrange and immediate delivery | 6-speed |
| ZB | Custom turbo build; fictional, not a claimed factory engine specification | 6-speed |
| Street | Generic naturally aspirated build; recording vehicle is unidentified | 5-speed |

The configuration selector provides **Your saved tune**, **Factory-inspired
baseline**, **Street drift build**, and **Highway build**. Every engine retains
its own edits when switched away and back. Gear ratios and engine parameters
remain adjustable. The car chassis and weight remain separately tunable.
Changing physics settings during a race ends that run, preserving timing
consistency. Personal bests distinguish engine/tune and tire configurations.

Factory-inspired output and displacement use manufacturer references in
`ENGINE_REFERENCES.md`. Torque-curve shapes, boost pressure, inertia, response,
rev limits and modified-build settings are approximations for gameplay; this is
not a manufacturer-validated vehicle simulator. Audio sources and licensing are
listed in `Drift Drive/audio/CREDITS.md`.

## Race builder

Press **B** to edit a course:

1. Click roads to place ordered waypoints; routing follows the road network.
2. Use right-click, **Backspace**, or **Undo** to remove the last waypoint.
3. Choose **Sprint** or **Circuit**, set laps, or **Reverse route**.
4. Try **Highway sprint** or **Mountain circuit** for a ready-made course.
5. Name and **Save course**; up to 12 courses can be loaded or deleted.
6. Press **G** or **Race** for a three-second countdown.

The course inserts directional checkpoint arches along the chosen roads. Pass
through them in order, within their width and height, in the correct direction.
Swept crossing detection handles high speeds. The next gate is highlighted for
each player's camera. The route-specific racing line forecasts braking through
corners and junctions and adjusts for front-tire grip.

The HUD shows the next gate, distance, race time, wrong-way indication, laps,
penalties and best lap; split-screen also shows live position. **R** / player two's
reset key returns to the last checkpoint with a **5-second penalty**. Finish
results show a personal best. Open the builder to end the current race and edit.

## Performance and validation

Terrain, trees, roads, guardrails and regional props use bounded chunks for
camera culling. Terrain grid size remains bounded despite the larger world.
The camera excludes fully fogged distant scenery. Split-screen retains its
pixel-ratio cap of 1 and disabled dynamic shadow maps, with soft car contact
shadows. Tire physics remains fixed at 240 Hz with surface updates at 60 Hz and
bounded catch-up; map updates remain 10 Hz.

```sh
npm ci
npm test
```

Tests run the actual startup stages, generated road network, physics, engine
switching/persistence, clutch release and slide support, route planning,
directional gate crossing, countdown, penalties, circuit laps, full-width road
coverage, polygon overlap, flush road verges, bounded edge poses, support-plane grades, uphill
launches for every baseline engine, burnout gear holding, limiter recovery, culling bounds
audio lifecycle, lift-off flutter, clutch-energy bounds, traffic fallback and solid contacts, arcade menu transitions,
handling presets, synchronized solo backfire, adaptive solo graphics and analog
instrument updates. V4 checks also cover stop/driveway connectivity, weather budgets,
per-player build persistence, meet collisions/arrivals, optional-run completion,
exploration unlocks, embedded radio lifecycle, personal music and photo-mode
freezing/export. V4.1 additionally checks surface-aware grass emission,
particle limits/colours, sustained limiter backfires, body-option persistence
and solo/split restoration. Three.js geometry/math are real; DOM, Canvas, GPU and Web
Audio nodes are stubbed. Tests do not establish actual browser FPS, rendered
appearance or subjective handling/audio quality. Check those on the target
computer, especially split-screen and mountain approaches.

## S14 body, burnouts, turbo and traffic

The player coupe now has S14 facelift inspired proportions, separate glass,
projector lamps, horizontal rear lights, mirrors, plates and a smaller spoiler.
It remains a lightweight procedural model rather than an OEM vehicle asset.

Clutch kicks transfer a bounded amount of stored flywheel energy. Launch wheel
inertia and RPM response are smoother, rear grip loss is milder, and smoke
builds with tyre heat at a time-based emission rate. The continuous turbo
whistle is muted; loaded throttle release produces a short, decaying flutter.
Use **P → Turbo / flutter volume** to adjust it.

**P → Traffic** offers Auto light traffic or Off. Auto uses up to six vehicles
solo or four in split-screen, with shared 10 Hz decisions and five instanced
draws, no traffic shadows or audio. Traffic brakes for nearby/predicted player
positions and yields at junctions. It avoids tight touge roads and is disabled
during races. Sustained slow frame times reduce it to three/two vehicles and
then zero; it recovers after sustained faster frames. Actual FPS depends on
the device; this budget is a safeguard, not a measured FPS guarantee.

Bundled road-cutout geometry code and its licenses: THIRD_PARTY_LICENSES.txt.

## V5.1 camera, bodies and audio

Chase views use bounded car-relative offsets (5.2 m / 6.5 m) and higher mounts, with restrained FOV changes. They no longer fall farther behind at speed. Mounted cameras use chassis heading and filtered road grade rather than suspension roll; switching views resets their state.

R34, A80 Supra and FD bodies now have separate dimension and silhouette profiles, curved roof/glass, sculpted fenders and wheel lips, revised lighting, bumper surrounds and aerofoil wings. These remain original procedural interpretations, not scanned or manufacturer-provided models.

Default audio uses steady crank-angle pulse synthesis plus Ange Yaghi's MIT-licensed Engine Simulator exhaust response/audio approach. This is not the full simulator or a recording of it. See `Drift Drive/audio/jdm/CREDITS.md`. All layers retain phase through RPM changes; a single filter path handles load and overrun.
