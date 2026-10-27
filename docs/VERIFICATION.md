# The Tower Deal verification

## Magma smoke and burning rock — 2026-10-27

- Smoke rises from each volcanic vent, crosses its respective bank, and exits the screen before its 8.5-second cycle ends. Enemy concealment follows the moving cloud.
- Lava projectiles, lava pools, airborne burning rocks, and grounded burning rocks use six-frame pixel-art sheets. A landed rock burns for 3.5 seconds with a 40-unit damage area, absorbs shots during that interval, then cools into shootable solid cover for roughly 15 seconds.
- The computer treats burning rocks as hazards. The existing burn sound includes their active flames.
- All 69 model and smoke-path tests pass, and the Vite production build succeeds. A 390 × 844 Chrome visual pass checked the rock and lava animations plus the smoke rising, crossing, and exiting with no runtime exceptions.

## Paired Storm lightning waves — 2026-10-27

- Each Storm lightning event now schedules two strikes on each bank. Wave two telegraphs 0.55 seconds after wave one and hits 0.55 seconds later, with separate landing sites.
- The model check confirms four strikes in bank-paired order, spacing between same-bank impact points, first-wave damage and dodge protection, then second-wave damage.
- A 390 × 844 Chrome run captured the first warnings, both warnings, the first paired strike, and the second paired strike. The second bolts hit about 0.53 seconds after the first in that run, and no runtime errors occurred.

## Storm hazard refinement — 2026-10-27

- Entering a tornado's active pull now emits one short wind-tug sound cue. It does not repeat each frame; leaving and re-entering or ending a dodge inside the pull can cue again. The sound uses the existing Howler mute and pause controls.
- The tornado pulls from a 118-unit radius, up from 82. Pull strength rises toward its center. The computer begins avoiding it farther away, and the warning shows broken wind arcs around the expanded reach.
- A new model test checks a meaningful pull near the outer edge, no pull beyond the radius, and no pull during a dodge. The full suite now has 68 passing tests.
- The lightning strike plays six distinct pixel-art frames with a fixed impact point instead of blinking one still image. The generated sheet is 6 × 112 × 195 pixels per frame.
- A frame check confirms all six lightning frames differ and their bottom impact rows remain anchored. Phone-sized Chrome captures show the animated strike and expanded tornado wind arcs with no runtime errors.

## Storm and Magma visual refinement — 2026-10-27

- Mud now reduces walking speed by 45%; a model check compares wet and dry movement directly and confirms that dodge distance stays intact.
- The Storm lightning uses a transparent pixel-art strike sprite with a longer visible flash. The tornado now plays eight distinct pixel-art frames at 12 frames per second: cloud bands circulate while its funnel stays planted. Its warning and pull timing are unchanged.
- The tornado sheet is 8 × 160 × 169 pixels per frame. A frame check confirms all adjacent frames differ and the bottom ten rows remain identical; two phone-sized Chrome captures show its appearance changing in play without runtime errors.
- Magma now has two visible volcanic vents. Rocks and lava projectiles arc from the corresponding vent for each bank. A lava projectile becomes a burning ground-pool sprite at its marked landing point.
- Ash smoke sprites begin at both vents, rise and drift over portions of the banks, and keep a smaller visible plume at their source. Enemy HUD concealment follows the actual dense cloud area.
- Phone-sized Chrome captures checked the strike, tornado, both vents, airborne lava, burning pool, and traveling ash. No runtime exceptions occurred.

## Phase 5: Storm and Magma arenas — 2026-10-26

- All 67 model tests pass. New cases cover equal bank geometry, mud movement and dodge distance, paired lightning, rock cover and projectile blocking, volcanic fire, ash timing, overlapping ground damage, and seeded matches on both new maps.
- The Vite production build succeeds. Storm and Magma background art is served as WebP at roughly 0.74 MB and 0.84 MB; original full-resolution PNGs remain in `docs/art-source/phase5/`.
- A 390 × 844 Chrome run showed Riverside, Storm, Magma, and Random Map in the new selection panel. Both new arenas loaded with no runtime exceptions. Separate captures checked rain and mud, lightning warning, tornado, rock warning, volcanic fire, and ash at phone size.
- The Choose Fixed Weapon path selected a nuclear weapon before Storm. Random Fixed Weapon revealed a random weapon after Magma selection and started automatically. Random Same Weapon started on Riverside. A paused match's simulation time stayed unchanged across 450 ms.
- Physical iOS and Android tests, longer balance sessions, and listening on device speakers remain open.

## Phase 4: crate loot and modes — 2026-10-26

- Random Same Weapon was checked at 390 × 844: all four mode choices fit on screen, and selecting it starts immediately. A model test confirms each Tower launch draws one type shared by both banks, redraws for the next launch, and keeps landing positions independent.
- The Random Fixed Weapon reveal was checked at 390 × 844: the art cycled, settled on the match's fixed weapon, showed a three-count with no Start or Back button, and launched the match automatically. The header Menu button was unavailable during the reveal and restored when play began.
- All 62 simulation tests pass. Checks cover all four mode rules, single-roll crate loot at full break, explosion fan-out, syringe health cap and slot independence, and the computer seeking healing.
- The Vite production build succeeds. A 390 × 844 browser run checked the mode menu, random weapon reveal, six-weapon chooser, all four start paths, and replay behavior. Random Fixed Weapon returns to a new reveal; Choose Fixed Weapon preserves the chosen type.
- Phone-sized captures checked the new syringe pickup at ground scale and its green +20 number beside the fighter. Collecting it raised the fighter from 75 to 95 HP.
- Physical iOS and Android playtesting, sound mixing, and longer mode balance sessions remain open.

## Matching weapon ammo — 2026-10-26

- A matching pickup adds its full starting ammo without a cap for either fighter, including laser and nuclear weapons. A different weapon remains unavailable while one is carried.
- The opponent pursues matching drops. The HUD number shows total ammo, while its ring tracks the fraction of all collected ammo still available; pickup toasts show the amount added.
- All 55 simulation tests pass, including repeated stacking for every weapon, the ammo-meter state after firing and restacking, and opponent pickup targeting. The production build succeeds.

## Phase 3 closeout — 2026-10-26

- Reviewed the combat model, render lifecycle, pointer and keyboard controls, HUD, audio, and Phase 3 documentation. The complete 52-test simulation suite, source syntax checks, production build, and `git diff --check` pass.
- Removed redundant weapon-icon style resets and made a paused, menu, or result screen redraw its HUD after viewport resize. The latter keeps weapon badge fitting and HUD scale current after phone rotation.
- A 360 × 728 to 390 × 844 browser resize while paused updated the opponent HUD scale from 0.75 to 0.8125. A two-contact input check then moved the fighter while firing two pistol shots. Both arena widths filled the viewport.
- Both soldiers' death poses were inspected in phone-sized captures and scaled to stay close to their standing size.

## Damage feedback — 2026-10-25

- All 48 simulation tests pass. Direct and lethal hits report the health actually lost; fire and nuclear waste report grouped integer damage without per-frame clutter.
- The production build succeeds, and a 360 × 728 phone preview shows the floating number beside a fighter without covering the HUD.

## Portrait phone width — 2026-10-25

- At a 360 × 728 viewport, the arena spans the full 360-pixel width with no side gutters. The menu, both fire controls, and the health footer remain visible.
- The portrait arena uses the available viewport height; pointer coordinates continue to map independently across the arena's width and height.

## Phase 3 — 2026-10-25

- All 47 simulation tests pass. New checks cover one-weapon capacity, independent pistol and Tower-weapon cooldowns, and an empty special-fire action.
- The Vite production build succeeds, and the changes pass `git diff --check`.
- Headless Chrome renders the menu and active match at 390 × 844 portrait and 844 × 390 landscape viewports. The arena, both transparent fire buttons, and health bar remain visible.
- A two-contact browser input check moved the fighter while the pistol fired twice. The special-fire button shows an empty state before a pickup.
- The expanded world is 480 × 940 units. Both fighters have 280 units of movement depth. The lower fighter reaches the foot of the river wall; the upper fighter stops before the taller upper wall. Both stop before the outer barriers.

## Phase cleanup — 2026-10-25

- All 46 simulation tests pass, including tower cycles, projectile interactions, navigation around cover, hazards, death, and a seeded autonomous match.
- The Vite production build succeeds.
- The generated site includes the active art and audio assets. Superseded death and crate studies are retained in `docs/art-archive/` instead of being deployed.
- HUD icon fitting now avoids repeated layout reads and style writes while the weapon and viewport stay the same.
- Starting a new round clears transient sprites and pickup toasts from the previous round.

## Earlier desktop checks

- Local preview responded with HTTP 200. In-app browser checks covered menu and Settings, match start, movement, firing, inventory pickup and selection, HUD positions, tower, shield, and flame effects.
- The generated sprite atlas has RGBA transparency. `prototype-preview.png` is a screenshot of the running prototype, while `public/art/visual-target.png` is the earlier art target.

Physical iOS and Android playtesting remains to be done, particularly native two-finger input, browser audio unlock, device performance, safe areas, and orientation changes. Balance and animation quality still need playtesting across longer matches.
