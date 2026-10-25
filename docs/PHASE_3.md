# Phase 3: One weapon, two fire controls

Each fighter may carry one Tower weapon. A landed pickup is rejected while that weapon has ammunition; the weapon disappears after its final shot. The unlimited pistol remains available throughout. Pistol and Tower weapon shots have separate cooldowns, so either button responds while the other weapon is recovering. The computer opponent follows the same pickup and ammunition rules.

The three inventory slots and the old fire button are gone. Two translucent controls float on the right side of the arena: the lower one always fires the pistol, while the upper one shows the held weapon and remaining ammunition. Holding the upper control charges the Laser Gun, which fires on release. Keyboard controls are Space for pistol and E for the Tower weapon. The floating movement joystick still accepts a separate touch.

The arena is 480 × 880 world units. The river remains centered at y=440. The upper and lower playable banks are each 240 units deep, with limits set outside the visible stone walls. Cover, barrels, pickups, and player spawns were repositioned for that space. Existing artwork is stretched in separate bank and river sections; no new sprite is needed for this phase.

Simulation tests cover the one-weapon capacity, independent fire actions and cooldowns, depletion, equal bank bounds, combat interactions, and an autonomous match. Production and phone-sized browser rendering checks are recorded in [VERIFICATION.md](VERIFICATION.md).
