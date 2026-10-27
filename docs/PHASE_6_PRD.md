# Phase 6 PRD: Desert and Snow arenas

- **Product:** The Tower Deal
- **Status:** Implemented in the prototype; physical phone playtesting and final animation polish remain
- **Platform:** Desktop and phone browsers
- **Match format:** One round, player versus computer; all four existing weapon modes

## Summary

Phase 6 adds two selectable maps without changing the duel's bank geometry, weapon rules, or Tower behavior. **Desert** is a yellow sandy battlefield split by a deep crack in the ground. It has a sweeping sandstorm, eagle attacks, quicksand, and a heat mirage that lures fighters toward a scorpion. **Snow** surrounds an impassable frozen river with falling snow, an avalanche, sliding ice patches, and hail squalls.

Both maps need their own original arcade pixel art and readable sprite animations. Their hazards should change sight and movement while preserving the game's fast, dodgeable combat and equal opportunity for both fighters.

## Agreed design decisions

- The Desert fighters stand on **level sandy ground**, not elevated plateaus. A deep crack occupies the current river channel. Mountains and rock formations may form the outer map boundaries. Cacti and sparse palms establish the setting; an eagle may perch in a visible palm at the edge.
- The Desert sun is visibly hot. Before a mirage event, sunlight intensifies and heat shimmer becomes noticeable. The sunlight itself does not drain health.
- A Desert sandstorm enters from **outside the top or bottom edge** and travels across the arena. It is a dense top-layer visibility hazard.
- The eagle attacks fighters. The eagle and scorpion are **non-shootable**: bullets and beams do not hit, stop, or damage them. Their attacks can be escaped by movement or dodge.
- The mirage is a **fake weapon or healing syringe**, not a duplicate fighter. A nearby fighter sees it break into a scorpion ambush. A scorpion bite deals **8 HP** and briefly slows movement; its emergence and tail windup allow a dodge. The scorpion burrows away after the attempt.
- The Snow channel is a **frozen river**. Snow falls over both banks. Scattered ice patches make walking slide briefly. The other Snow hazards are an avalanche and a hail squall. Ice spikes erupting from bare ground are excluded.

## Goals

1. Make Desert and Snow visually distinct from Riverside, Storm, and Magma at phone size without changing the playable bank depth or Tower center.
2. Give Desert four different decisions: sight through sand, reacting to an aerial swoop, escaping soft ground, and weighing a tempting pickup against a possible trap.
3. Give Snow three different decisions: avoiding a sweeping avalanche, controlling momentum on ice, and moving between hail impacts.
4. Keep hazards legible and escapable. No fighter should be pinned against cover or a bank boundary by a map event.
5. Apply equivalent hazard timing and strength to both banks and make the computer obey the same sight, movement, and damage rules.
6. Preserve all four weapon modes, crate loot, Tower drops and retaliation, pause, sound controls, and result flow on both new maps.

## Map selection and shared layout

- Add **Desert** and **Snow** to Choose Map alongside Riverside, Storm, Magma, and Random Map. Random Map includes both new maps. Replay retains a manually selected map and rerolls Random Map as it does today.
- Preserve the existing logical channel width, equal playable bank bounds, spawn positions, cover formation rules, pickup landing areas, and Tower center. The channel is a crack in Desert and frozen water in Snow; it remains impassable on both maps.
- Desert crack walls and Snow ice banks must visibly match the movement boundary. Neither fighter can stand inside a wall, under a decorative mountain, or on the central channel. Mountains, palms, cacti, snow-covered rocks, and trees placed inside a bank must have collision and depth ordering that match their art; otherwise place them outside the playable area.
- The Tower needs map-specific contact art: a stable foundation over the Desert crack and a reinforced opening through the frozen river. Its hatch, rising shaft, launchers, shield, fire vents, and weapon arcs must remain visually coherent and mechanically unchanged.
- All map and weapon-mode combinations remain playable. A fixed weapon selection also governs any **fake weapon image** used by a Desert mirage, so the lure does not reveal an impossible weapon type.

## Desert arena

### Visual setting

Warm yellow sand covers both level banks. Dry stone and mountain faces close the outer edges. Cacti, scattered stones, and sparse palms add landmarks without hiding fighters or pickups. The central crack shows depth through darker walls and a floor far below, while the Tower stays anchored at the same center. Ambient heat shimmer remains subtle; the event-specific sunlight pulse is noticeably stronger and short enough to avoid eye strain.

### Sandstorm

- A broad front enters from beyond the top **or** bottom of the screen, crosses both banks and the crack, then leaves the opposite edge. The entry direction may vary by event. Its origin must never appear suddenly in the middle of a bank.
- Blowing sand is a **top-layer visibility effect** over fighters, cover, projectiles, and ground details. It hides distant information for a few seconds but does not deal damage, change shot physics, or move pickups. The player's controls and health HUD stay usable.
- Animate a visible leading edge, a dense moving body, and a trailing edge. Ground-target and imminent impact cues remain readable above the densest sand, or the scheduler avoids starting attacks that cannot be read through it.
- The computer must not track a concealed fighter with perfect information. A storm should also obscure its aim, using the same visibility region as the player's view.
- **Initial tuning proposal:** 1.2–1.5 seconds of approach, about 4–5 seconds of dense passage, and a clear exit. Confirm actual coverage and speed at phone scale.

### Eagle swoop

- Each bank receives one continuous eagle flight with two dives in quick succession. The eagle enters visibly from the left or right, flies across the bank, then descends toward a broad circular shadow that shrinks around the locked landing point. It recovers in view, locks onto the fighter's new position, makes a second dive even if the first missed, and then flies beyond the opposite map edge before disappearing.
- The eagle is **non-shootable** and does not block shots. A fighter can move outside the shrinking shadow or dodge through the attack with existing invincibility frames. One dive can hit a fighter at most once.
- Schedule equivalent dives on both banks. Target positions may vary independently but use the same warning, speed, hit radius, and damage. The computer reacts to the visible shrinking shadow.
- **Initial tuning proposal:** roughly 1 second of shadow warning and 10–12 HP on a direct hit, with no lasting stun. Tune for phone reaction time.

### Quicksand

- A paired event adds one persistent patch to each bank, up to four per side. A patch stays closed on the ground until a fighter steps inside; it opens around them, then closes again when they leave. It does not repeatedly cycle while unoccupied.
- A fighter inside walks more slowly and is gently drawn toward the center. Quicksand causes **no direct damage** and cannot hold a fighter indefinitely. Reversing movement and a dodge roll both allow escape; dodge distance and invincibility remain intact.
- Placement avoids solid cover, pickup piles, spawn points at match start, and bank edges where the pull could make an escape route impossible. The computer routes around active quicksand when practical.
- **Initial tuning:** slowdown begins on entry, the opening takes about half a second, and the pull remains weaker than Storm's tornado. Tune the exact radius and slow by playtesting.

### Mirage and scorpion

- A global sun pulse begins about **2 seconds** before fake items appear: the sand brightens to a warmer gold and local heat shimmer grows. It signals the event without flashing white or hiding real pickups.
- One mirage item appears at a valid, reachable position on each bank. It resembles either a weapon pickup or a healing syringe, with slight heat wavering as a close-range clue. The two banks receive the same event timing; item type and position may vary independently. A fake item has no ownership transfer, ammo, or healing effect.
- In Random Fixed Weapon and Choose Fixed Weapon, a fake weapon displays that match's fixed type. In Random Same Weapon, it must use an eligible type without implying that the Tower has made a new paired launch. Fake items do not alter Tower drops or crate loot odds.
- On close approach, even while carrying a different weapon, the image breaks, a scorpion rises from the sand, and its tail visibly winds up before one bite attempt. The scorpion is **non-shootable** and does not block shots. Moving away or dodging during the windup prevents the bite; a successful hit deals **8 HP**, a brief stagger, and a short movement slow. It then burrows away. Untouched mirages fade after a limited time.
- The computer may be lured by a mirage and uses the same proximity trigger, bite damage, slow, and dodge opportunity. It must not identify fake items from hidden state before the visual clue appears.
- **Initial tuning proposal:** about 0.3 seconds between emergence and bite, around 1 second of slow, and 8–10 seconds before an untouched lure fades. Validate that the tell is readable but the trap remains tempting.

## Snow arena

### Visual setting

Both banks are snow-covered with clear dark paths and cover silhouettes. Snow falls continuously at a soft density; fighters, team colors, weapons, health, and colored area markers retain contrast. The central river is visibly frozen and impassable. Tower movement opens a consistent reinforced aperture in the ice without making the base appear to float or change size.

### Avalanche

- An avalanche enters from beyond the left or right edge of each bank and sweeps across it. A distant rumble, falling powder, and a growing edge marker show the approach before the damaging front arrives.
- Equivalent avalanches occur on both banks. Directions and exact paths may be independently random, but exposed travel distance, speed, warning, and force must be comparable. A fighter can leave the sweep lane or dodge through the front.
- Contact pushes a fighter and deals a moderate one-time hit. Push resolution respects cover and bank bounds and never places a fighter in the frozen channel or traps them against a wall. The initial version does not leave permanent snow cover.
- **Initial tuning proposal:** at least 1 second of approach warning and roughly 12–16 HP per hit. Tune width and push strength against the 2.2-second dodge cooldown.

### Sliding ice patches

- Each bank starts with an equivalent number and approximate area of scattered ice patches. Their boundaries and shine read against the snow. Positions may vary by match within safe placement zones; patches do not spread without a cap.
- Walking onto ice preserves some momentum. Releasing or reversing the movement control produces a short, steerable slide rather than an uncontrollable lock. Ice does not cause damage or change bullets. Dodge travel and invincibility remain predictable, and a roll cannot cross a bank boundary or solid cover.
- The computer predicts enough stopping distance to avoid repeatedly sliding into a wall or hazardous landing area. Pickups on ice remain reachable.
- **Initial tuning proposal:** 0.25–0.4 seconds of diminishing slide after leaving a patch. Tune on touch controls so stopping still feels intentional.

### Hail squall

- A cloud and wind cue precede a cluster of hail falling onto **marked locations** on each bank. The cloud moves overhead while individual pellets descend, strike their marks, bounce or shatter, and fade. Hail visibly comes from above rather than erupting from the ground.
- Both banks receive the same number of marked strikes and timing, with independently chosen valid locations. Marks must stay visible over snow and ice. A fighter can walk between the impacts or dodge a cluster.
- A direct hit deals light damage and a brief flinch, shorter than the Stun Launcher effect. Limit repeated hits from one cluster so a fighter cannot lose most of their health from a single squall. Hail does not create permanent blockers.
- **Initial tuning proposal:** around 1 second of warning per cluster, 4 HP per direct pellet, a short 0.2–0.3-second interruption, and an event damage cap to tune in playtesting.

## Event scheduling and combat interactions

- Keep one map-specific environmental event scheduler. Equivalent paired attacks use the same timing on both banks; a continuous sandstorm crosses the whole arena as one traveling front. Initial hazards begin after players have time to move and see an opening Tower launch.
- Avoid overlapping the densest sandstorm with a new eagle, quicksand, or mirage telegraph. Avoid hiding a hail warning behind avalanche powder. Existing Tower cycles continue; critical hazard and Tower impact cues must remain readable.
- When patches or attacks overlap nuclear waste, Tower fire, barrels, crates, or weapon explosions, direct impact damage remains separate. Ongoing ground damage uses the existing highest-rate rule, and dive-roll invincibility applies to hazard damage. Snow sliding and quicksand pull must not bypass bank or cover collision.
- Eagle and scorpion remain non-shootable across every weapon type, including shotgun pellets, continuous laser, grenades, missiles, and explosion splash. Their warning shadows or fake items are visual cues, not solid projectile blockers.
- Mirages do not consume the one-weapon slot or create real ammo. Real Tower and crate pickups keep their existing depth ordering and 12-second lifetime. Fake items have their own event state and cleanup.
- Pause, menu overlays, focus loss, and death freeze or stop map timers, motion, damage, ambient loops, and temporary sprites. No hazard can strike after the round has ended.

## Art and sound requirements

- Create original arcade pixel-art arena backgrounds for Desert and Snow at the exact current map geometry. Include separate middle-channel treatments: a deep dry crack and a frozen river. Make outer mountain barriers, cliff/ice edges, Tower base interactions, and passable ground visually consistent with collision.
- **Desert sprites:** animated blowing-sand layers with an uneven edge; heat shimmer/sunlight pulse; eagle descent, strike and climb with a shrinking circular shadow; persistent quicksand with occupied opening and closing; full-size fake pickup shimmer; scorpion emerge, tail windup, strike and burrow; dust and impact traces. The eagle and scorpion should be readable at soldier scale.
- **Snow sprites:** falling snow layers, ice patch with movement feedback, avalanche leading edge/body/retreat and powder, hail cloud, falling pellet/impact/shatter, and frosted Tower/ice aperture details.
- Create **dedicated sprite sheets** for every major Phase 6 hazard and transition: the eagle's wingbeats, descent, strike and departure; quicksand opening while occupied and closing afterward; mirage shimmer and scorpion emergence, windup, strike and burrow; the sandstorm's moving uneven front and body; ice sliding feedback; avalanche approach and sweep; and hail descent, impact and shatter. Ambient snowfall and heat shimmer may combine sprite sheets with lightweight particles or shaders, but cannot replace the key hazard animations with a single still image.
- Store the original art, final sheets, frame dimensions, and reproducible preparation scripts in the repository. Keep fighters, Tower, weapons, and hazards separate from static arena backgrounds. Each frame must have a stable anchor, scale, and transparent edge; the eagle shadow, scorpion strike, avalanche front, and hail impact must stay aligned with their simulation hit areas.
- **Smooth animation is a release requirement.** Adjacent frames must show meaningful motion; looping sheets must join cleanly; takeoff, travel, impact, retreat, and idle transitions must not pop, teleport, change size, or detach from their shadows or ground marks. Drive frame selection from game time so pause freezes animation and different frame rates do not change hazard timing. Inspect at phone size during motion, including slower devices; simplify particles before sacrificing the readability of the sprite animation.
- Add restrained, distinct Howler sounds for eagle wings/cry, sandstorm, quicksand, sunlight/mirage cue, scorpion strike, ice slide, avalanche, and hail. Sounds respect mute, pause, and game over; ambient loops stay below weapon and Tower cues.
- Keep phone performance in mind: low-resolution sprites, bounded particle counts, no expensive full-screen blur, and no intense white flash for sunlight or snow.

## Implementation sequence

1. Add Desert and Snow map data, menu cards, Random Map eligibility, background art, channel/base treatment, and collision verification. Check equal bank size and every weapon mode before adding hazards.
2. Create and review the hazard sprite sheets and source art at the intended in-game scale. Establish consistent frame anchors and contact points before wiring damage or movement to the animations.
3. Implement Snow ice movement and AI handling, then paired avalanche and hail with warning, damage, animation, and sound.
4. Implement Desert sandstorm and AI visibility limits, then paired eagle and quicksand events.
5. Implement the sun cue, fake pickup event, scorpion animation and bite, including fixed-weapon mode compatibility and computer bait behavior.
6. Tune event spacing and damage, test all five maps on phone-sized and physical devices, refine assets/audio, and publish after regression checks.

## Acceptance criteria

1. Desert, Snow, and Random Map appear in Choose Map; all four weapon modes, replay, pause, and menu return work on both new maps.
2. Both banks remain equal and fully usable. The Desert crack and frozen river are impassable, while outer boundaries match their mountain/ice art. The Tower remains centered and its shield, launches, retaliation, and projectiles remain correct.
3. A sandstorm enters from a screen edge, travels across both banks, obscures the world as a top-layer effect, then exits. Controls and essential health feedback remain usable; the computer cannot aim perfectly through dense sand.
4. Eagles descend from above toward a shrinking circular shadow before a dodgeable strike. Neither eagle nor scorpion can be hit by any weapon or explosion, and neither blocks a shot.
5. Quicksand clearly forms, pulls and slows without damage, permits escape and dodge, and never traps a fighter against cover or a bank boundary.
6. Sunlight intensifies before mirages appear. A fake weapon or syringe lures either fighter, does not grant ammo or healing, and reveals a dodgeable scorpion strike. A bite deals 8 HP and a short slow; fixed-mode fakes show the correct weapon. The computer can be fooled under the same rules.
7. Snowfall, ice, avalanche, and hail are visually distinct. Ice produces brief controllable sliding; avalanche warns, sweeps, pushes, and respects collision; hail falls from a visible cloud onto clear marked sites with bounded damage.
8. Hazard events affect both banks with comparable warning, counts, duration, and strength. Roll invincibility, sound toggle, pause, death cleanup, and existing combat/loot rules remain intact.
9. Every major new hazard has a real multi-frame sprite sheet. Phone-sized visual checks confirm smooth loops and transitions, stable sprite scale and ground anchors, correct shadow/impact alignment, and no visible frame popping or missing transparency. Pause freezes each animation and resume continues at the correct point.
10. Automated simulation tests and the production build pass. Phone-sized browser visual checks cover every hazard and its animations, while physical phone playtests confirm readability, control feel, audio balance, and acceptable frame rate before Phase 6 is considered complete.

## Out of scope

Online player versus player, crossing the channel, new weapons, character selection, additional rounds, shootable eagle or scorpion, poison damage over time, permanent avalanche cover, and a survival meter for sun or cold are outside Phase 6.
