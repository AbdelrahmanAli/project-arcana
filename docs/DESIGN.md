# Project ARCANA combat design

## Confirmed direction

Browser-compatible, phone-friendly 2D combat. PixiJS for rendering, Howler.js for audio. Begin with player versus computer. Later multiplayer uses separate devices; transport/server design remains future work.

One round, one health bar per fighter, no healing for now. Each player remains on their own open riverbank. Slightly elevated overhead camera. Detailed pixel art inspired by Metal Slug's expressive soldiers and modern weapons. Human soldiers wear distinctive gear; a futuristic automated tower rises from the river. Blood, impacts, smoke and gore belong in the visual direction. Character selection and alternative maps come later.

## Controls and interface

Touch anywhere in the gameplay area and drag to establish a floating joystick. No fixed joystick. Fire and weapon buttons retain their own input. Two simultaneous fingers can move and fire. Straight-shooting weapons fire across the river, so positioning determines aim. Aimed weapons capture an opponent position and then travel without homing. Hold/release weapons use the same FIRE button.

Three inventory slots. The weak pistol is the default when no picked weapon is selected. Full inventory blocks pickups: spend an entire weapon to free its slot. No swapping or discarding. Depleted selected weapons fall back to pistol. Player health sits BELOW the weapon slots. Opponent health follows ABOVE their head. No large upper health HUD.

No generic attack warnings or flame pre-warnings. The smart missile shows its captured impact point on the ground. Actual projectiles, effects and character animations convey the other attacks. Pickup blinking during expiry remains required.

## Tower

Resting cap is too low to intercept attacks. Tower rises, throws one weapon to each bank simultaneously, then descends. Both weapon contents and landing positions are independently random. Open reachable landing positions only. Pickups live for twelve seconds after landing and blink during the final three.

The first hit while rising or descending causes two flame jets: toward the triggering soldier's position when hit and in the exact opposite direction. Brisk visible travel, not instantaneous or slow. Fire leaves narrow damaging strips for several seconds. One retaliation per entire rise/delivery/descent cycle. A transparent shield activates immediately after that hit and absorbs subsequent projectiles without reflecting them. It lasts through the current cycle. The tower is not destructible. No persistent tower cover between cycles.

## Initial tuning — proposals, not locked rules

100 health, movement 170 world units/second for both players. Weak pistol: 5 damage, unlimited ammunition, 0.48-second cooldown. Rifle: 12 individual rounds, rapid fire. Shotgun: 4 shots with five pellets. Grenade launcher: 3 shots, 0.9-second flight to captured position. Missile: 2 shots, travels toward a captured position. Laser Gun: 2 sustained visual beams, up to 1.1-second charge. Inventory pickups do not automatically select themselves.

First rise begins 2.5 seconds after starting. Rise 5.2 seconds, delivery 2.0 seconds, descent 5.4 seconds, then 4.8 seconds resting. Lift uses eased acceleration/deceleration with a fixed base and separately masked tower shaft, cascading water, droplets and spreading ripples. Each supply takes 0.75 seconds to land. Flame speed 700 units/second, damaging trail active for 3.5 seconds from launch, 16 damage per second while inside. Actual hit/collision rules use fixed simulation ticks and swept bullet tests. Similar conventional shots cancel upon collision. The grenade is an arcing projectile that passes above the tower.

Both health bars use twenty discrete rectangular cells (five HP each, with partial fill on the last cell). Opponent equipped-weapon artwork appears directly below their health bar and above their head, following their position and returning to a pistol icon when ammunition is exhausted.

AI re-evaluates visible combat every 0.2–0.32 seconds, pursues pickups, lines up shots, dodges nearby projectiles, and obeys the same inventory and ammo limits. It never reads future player input. Balance must be judged in real play rather than inferred from equal stats.

## Art milestone

The first visual sample was accepted as a good direction, with the health layout correction above. Original generated sprite atlas includes north-facing teal soldier poses, south-facing red soldier poses, six weapon images, and raised/retracted tower images. The world background is a separate image with no baked gameplay entities or HUD. Exact prompts are recorded in ART_PROMPTS.md.

Before final production: align the walk cycles, clean edge pixels, add weapon-specific equipped layers and richer hit/death animation, polish the flame/explosion frames and original sound effects, then test on physical phones. Keep the rules module independent of rendering to support future networking; this does not by itself make multiplayer implemented.
