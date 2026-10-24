# Phase 2: Volatile arena

## Direction

Keep the current single-round player-versus-computer duel. Add one new weapon and a small set of destructible arena objects. Online play is deferred. The Tower remains the source of paired weapon drops, and fighters remain on separate banks.

## Confirmed behavior

- **Nuclear launcher:** Fires a green-glowing grenade that leaves radioactive waste on the ground. Waste damages either fighter standing in it. A projectile will normally land on the opposing bank, but the hazard rule does not exempt its shooter.
- **Breakable crates:** Solid cover. They block movement and shots until destroyed, then leave low debris that no longer blocks either.
- **Oil barrels:** Explode when hit and damage any fighter near the barrel, regardless of who fired. The damaged barrel sprite can flash briefly on impact; the gameplay explosion should occur immediately.
- **Randomized arena:** Choose object positions at the start of each round. Use mirrored layouts across the river, with the same object types and distances on both banks. Keep each fighter's spawn and routes to possible weapon drops clear, and preserve multiple firing lanes.

## First balance pass to test

These values are starting points, not locked rules:

| Element | Proposed behavior |
| --- | --- |
| Nuclear launcher | 2 rounds, arcing flight over the Tower and shield, 10 initial damage, 1.4-second cooldown |
| Waste | About 48 world units wide, lasts 4 seconds, 6 health per second while a fighter stands inside; visible fade before it vanishes |
| Crate | Absorbs the first hit and breaks; shots fired afterward pass through the cleared space |
| Oil barrel | First hit triggers one explosion, about 45-unit radius and 22 damage at the center; destroyed wreck remains as a visual battle trace |

Area attacks should be able to destroy crates and ignite barrels. A barrel should trigger only once, even if several pellets or a laser hit in one simulation tick. No randomized placement may overlap a fighter, the river, the Tower base, or an active drop route.

## Art prepared

These are transparent, original pixel-art assets generated with the built-in image tool. They are saved for phase-two implementation and are not loaded by the current game:

| File in `public/art/phase2/` | Frames | Intended use |
| --- | --- | --- |
| `nuclear-launcher.png` | 1 | Pickup and equipped weapon icon |
| `nuclear-grenade.png` | 1 | Arcing projectile |
| `nuclear-waste-frames.png` | 4 horizontal | Looping ground hazard |
| `breakable-crate-frames.png` | 3 horizontal | Intact, cracked, destroyed |
| `oil-barrel-frames.png` | 3 horizontal | Intact, impact, wreck |

Sprite sheets use equal-width cells. The waste sheet is 4 × 543 by 724 pixels; crate and barrel sheets are 3 × 724 by 724 pixels. The single sprites are 1536 by 1024 pixels. Crop frames and scale them in PixiJS at runtime; the transparent margins keep their alignment stable.

The exact generation prompts are recorded in [`PHASE_2_ART_PROMPTS.md`](PHASE_2_ART_PROMPTS.md).

## Implementation order

1. Add a small obstacle model with seeded mirrored placement and collision for movement and projectiles. Verify that every start position and supply landing remains reachable.
2. Add crates and barrels with damage, explosion, and one-time chain-reaction rules. Render their sprite states and persistent debris.
3. Add the nuclear launcher, projectile, waste lifetime and contact damage, with clear green visual and audio feedback.
4. Test weapon balance, AI navigation and dodging, touch play, and frame rate on phones before expanding the map again.

Possible later arena elements include oil slicks ignited by the Tower's flames or short-lived electrical faults. Keep the first implementation to crates and barrels so their effect on aim and movement can be judged clearly.
