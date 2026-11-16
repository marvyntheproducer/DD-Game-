# Valley / After Hours — V6.2 solo guide

## Start or resume

1. Close an older running build, launch V6 and choose **Solo Career**, or press **4** in the main menu.
2. Follow the marked road navigation to Valley Works. Stop near the garage and press **F**.
3. Select **Set start destination** on the career board. Drive to the gold start ring, stop and press **F** to begin.
4. Pass every checkpoint in order. Results explain the objective, medal and next destination. Progress saves after completion.

The main-menu **Settings → Graphics** button switches between Auto and Laptop before you drive. Laptop mode is recommended for older integrated-graphics Macs. The career board's Race Options contains the same setting and a recent frame-rate estimate. This estimate is not a guarantee of sustained frame rate.

## Find events on the map

Press **Tab** in solo. Numbered diamonds show all twelve career starts: **gold = ready**, **green = completed**, **grey = locked**. Click a diamond or use the event list, then choose **GPS to Event Start**. Follow the route to the gold ring, slow below **11 km/h**, and press **F**. Locked starts explain which progression is required. Completed starts offer a rematch. Garage career boards still work.

## Main menu and loading

The home screen contains Career, Free Ride, Quick Race, Split Screen, Garage and Settings. Choose a driving mode to open its setup screen; appearance and driver names are folded away. Garage opens those controls directly. Escape returns to the main screen. The black/olive/yellow street-racing presentation uses original art and typography. Loading shows actual build-stage progress, a driving tip and a retry control if startup fails; reduced-motion settings disable the moving car graphic.

## Twelve-event career

| Chapter | Event | Objective |
|---|---|---|
| Local Reputation · Ren | First Light | Complete the city time trial within the bronze target |
| Local Reputation · Ren | Finding Your Angle | Finish the route with six seconds of controlled road drifting |
| Local Reputation · Ren | Ren's First Run | Beat the pro rival on a city sprint |
| Local Reputation · Ren | Valley Calling | Win one valley circuit lap |
| After Hours · Aya | Salt in the Air | Complete the coastal time trial |
| After Hours · Aya | Afterglow Slide | Finish the harbour/tunnel route with eight seconds of drifting |
| After Hours · Aya | Aya's Invitation | Beat Aya on the coastal sprint |
| After Hours · Aya | Midnight Postcard | Win one coastal circuit lap |
| Highland Invitation · Sora | Into Kurohana | Complete the new ridge time trial |
| Highland Invitation · Sora | Ash and Gold | Finish the descent with eight seconds of drifting |
| Highland Invitation · Sora | Sora's Ridge | Beat Sora through the highlands |
| Highland Invitation · Sora | The Long Way Home | Win the caldera circuit and finish the career |

Complete events in order to unlock the next. Gold rewards a quick, clean run; silver meets the suggested pace; bronze completes the objective within the allowed time. Drift events require the full slide goal even if the timer is fast. Recovering to the road adds five seconds. A lost race, failed drift objective or abandoned run grants no career completion. The result screen offers an immediate retry, so you do not need to drive back after a loss.

After each chapter, **Garage rewards** offers a sponsor livery/wheel/spoiler package. Apply it to your current car; the package and body stripes persist with the build. A chapter trophy appears at Valley Works. Existing free-roam customization remains available. Replaying an event can improve its medal and best time; it does not repeatedly award the initial reputation. Previously discovered career hubs offer optional fast travel.

## Solo rivals and tuning

Quick Race offers **Pro Rival** or **Time Trial / Ghost**. Career events choose the appropriate mode automatically. Rival events use one opponent with your car and current power, gearing, mass and handling tune. Competitive pace comes from its driving decisions, not an artificial power advantage. It uses the available power with tyre-slip traction control, brakes later, carries a faster corner pace, uses gears, collides normally, attempts to pass and takes the same recovery penalty when stuck. The rival builds its own corner line and adjusts its lateral path continuously for the player, road edges, drafting and committed overtakes. Its attack/chase pace is not reduced when leading. Pressure can cause normal physical nudges; a cooldown and closing-speed limit bound that behaviour. It can reverse and rejoin when blocked. Power, grip, position and checkpoint rules stay unchanged. Open tuning before starting; opening tuning during a race ends that run.

Solo rivals and players can draft. The existing 40% catch-up assistance remains exclusive to split-screen races. No rival is created in split screen. Solo keeps only your camera, HUD and minimap. A rival is marked on the map, has no additional engine voice and uses lean visual effects.

## Personal-best ghosts

Time trials can replay a matching personal-best ghost. It is a visual replay with no collision, AI, engine sound or second camera. Your route, car, engine and handling tune must match. Recording is bounded to five samples per second and ten minutes; the latest four best recordings are retained. Recoveries invalidate a recording, but normal career results and best-time records still apply. Ghosts can be disabled in Race Options.

## Kurohana and performance

Kurohana occupies the north-east of the world: dark rock, gold grass, sparse pines, a caldera lake, ridge loop, tighter descent and hot-spring village. Two access roads connect it to the original network. It is available for free driving and custom races as well as the career.

The district reuses the original world bounds and terrain tile count. Scenery is sparse, batched/instanced and hidden when distant. The parked-car fleet remains capped. Ghost playback is one draw and the rival has no extra camera, live shadow casting, interior, engine voice or smoke. Laptop mode lowers the pixel budget and detail without changing the race rules or physics.

## Target-machine play test

- Run a normal solo drive, then an opponent race for at least ten minutes after the laptop warms up. Compare Auto and Laptop and check the recent FPS estimate.
- Start and finish a career event, quit/reopen the app and confirm the result, next event and earned cosmetics remain.
- Lose a rival race or miss a drift goal, retry, then open tuning during a run and confirm it ends cleanly.
- Try a street setup and a high-powered drift setup against the rival on the coast and in Kurohana.
- Beat a time trial, replay its ghost, change tune, recover to the road and confirm ghost matching/invalidation.
- Switch from solo rival racing to split screen; verify there is no AI car, second solo HUD or ghost left behind, and both human assists still work.

Automated tests validate the progression and physics, but cannot establish the actual GPU performance or subjective handling on your MacBook Air.
