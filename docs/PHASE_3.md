# Phase 3: One weapon, two fire controls

Each fighter may carry one Tower weapon. A landed pickup is rejected while that weapon has ammunition; the weapon disappears after its final shot. The unlimited pistol remains available throughout. Pistol and Tower weapon shots have separate cooldowns, so either button responds while the other weapon is recovering. The computer opponent follows the same pickup and ammunition rules.

The three inventory slots and the old fire button are gone. Three translucent controls float on the right side of the arena: the lower one always fires the pistol, the middle one shows the held weapon and remaining ammunition, and the upper one starts a dive roll. Holding the middle control charges the Laser Gun, which fires on release. Keyboard controls are Space for pistol, E for the Tower weapon, and Shift for dodge. The floating movement joystick still accepts a separate touch.

The arena is 480 × 940 world units. The river is centered at y=500. Both playable banks are 280 units deep: the lower fighter can reach the foot of the river wall, while the upper fighter stops before the taller stone wall in that bank's art. Both fighters stop at visible outer barriers. The upper bank and arena were extended by 60 units rather than reducing lower-bank movement. Cover, barrels, pickups, and player spawns follow the new geometry. Existing artwork is stretched in separate bank and river sections; no new sprite is needed for this phase.

The dive roll travels in eight directions, grants invincibility during its 0.46-second animation, and recharges in 2.2 seconds. The HUD shows its cooldown on a circular meter and gives audio feedback when the move or Tower weapon is unavailable. Both soldiers have their own roll and death frames, scaled to their standing size.

Simulation tests cover the one-weapon capacity, independent fire actions and cooldowns, depletion, equal bank bounds, dodge rules, combat interactions, and an autonomous match. Production and phone-sized browser rendering checks are recorded in [VERIFICATION.md](VERIFICATION.md).
