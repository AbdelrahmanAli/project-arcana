# Phase 2: Volatile arena

Implemented in the playable prototype. The values below are the current balance pass.

## Direction

Keep the current single-round player-versus-computer duel. Add one new weapon and a small set of destructible arena objects. Online play is deferred. The Tower remains the source of paired weapon drops, and fighters remain on separate banks.

## Confirmed behavior

- **Nuclear launcher:** Fires a green-glowing grenade that leaves radioactive waste on the ground. Waste damages either fighter standing in it. A projectile will normally land on the opposing bank, but the hazard rule does not exempt its shooter.
- **Breakable crates:** Solid cover. They block movement and shots, crack on the first direct shot, and break on the second. Explosions destroy them immediately. Low debris no longer blocks movement or shots.
- **Oil barrels:** Fighters can pass behind or through their ground position. A shot makes a barrel explode immediately, damaging either fighter in its radius regardless of who fired. The red ground zone shows the blast area after detonation.
- **Randomized arena:** Group three or four crates in a T, L, or square formation near the river on each bank. Place one or two barrels independently anywhere on the open sand. Mirror the layout across the river so both fighters face the same cover, while keeping spawn points and routes to weapon drops clear.

## First balance pass to test

These values are the current starting point for playtesting, not locked rules:

| Element | Proposed behavior |
| --- | --- |
| Nuclear launcher | 2 rounds, arcing flight over the Tower and shield, 10 initial damage, 1.4-second cooldown |
| Waste | About 48 world units wide, stays for the round, 6 health per second while a fighter stands inside |
| Crate | Absorbs two direct shots: first cracks, second breaks. Later shots pass through. An explosion breaks it immediately. |
| Oil barrel | First hit triggers one explosion, 65-unit radius and 22 damage at the center; destroyed wreck remains as a visual battle trace |

Area attacks destroy crates and ignite barrels. A barrel triggers only once, even if several pellets or a laser hit in one simulation tick. No randomized placement may overlap a fighter, the river, the Tower base, or an active drop route. Only crates have a solid walking footprint; barrel art can overlap a fighter without stopping movement.

## Art prepared

These transparent, original pixel-art assets are loaded by the current game:

| File in `public/art/phase2/` | Frames | Intended use |
| --- | --- | --- |
| `nuclear-launcher.png` | 1 | Pickup and equipped weapon icon |
| `nuclear-grenade.png` | 1 | Arcing projectile |
| `nuclear-waste-frames.png` | 4 horizontal | Looping ground hazard |
| `breakable-crate-horizontal-frames.png` | 3 horizontal | Screen-aligned intact, cracked, and destroyed crate |
| `oil-barrel-frames.png` | 3 horizontal | Intact, impact, wreck |

Sprite sheets use equal-width cells. The waste sheet is 4 × 543 by 724 pixels; crate and barrel sheets are 3 × 724 by 724 pixels. The single sprites are 1536 by 1024 pixels. Crop frames and scale them in PixiJS at runtime; the transparent margins keep their alignment stable. The original diagonal crate sheet remains in the folder as an unused art study.

The exact generation prompts are recorded in [`PHASE_2_ART_PROMPTS.md`](PHASE_2_ART_PROMPTS.md).

## Verification

The simulation tests cover mirrored placement, clear supply landings, solid crate cover, barrel chain reactions, the nuclear grenade arc, and the waste hazard. The browser build and desktop-size visual rendering were checked. Balance, AI behavior across longer matches, and performance on physical phones need playtesting as the prototype evolves.

Possible later arena elements include oil slicks ignited by the Tower's flames or short-lived electrical faults. Keep the first implementation to crates and barrels so their effect on aim and movement can be judged clearly.
