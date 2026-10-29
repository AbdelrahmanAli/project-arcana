# Phase 8 PRD: Submerged platform and identity refresh

- **Product:** Division (provisional in-game title); the published repository remains `project-arcana`.
- **Status:** Implemented prototype; pending physical phone playtest
- **Platform:** Desktop and phone browsers
- **Scope:** Existing 1v1 and 2v2 formats, four weapon modes, and five maps

## Summary

Replace the rising Tower, its shaft, cap, launchers, and alarm with a low submerged military platform centered in the dividing channel. It deals weapons and occasional syringes from dedicated item ports and fires Riverside attacks from separate, visibly distinct vents. Its silhouette stays near the water or channel surface. Fighters' shots pass across it without collision, obstruction, reflection, or a Tower impact event.

The combat identity is two separated sides, fair but unpredictable supply, and the need to adapt during a single-round fight. The provisional title is Division.

## Agreed decisions

- The tall Tower is removed. The replacement is a **submerged military platform**, not a miniature tower.
- The platform keeps launching weapons on every map. Every launch still supplies a weapon to each bank, or two to each bank in 2v2. The existing rare syringe is an additional, independently positioned drop.
- The platform keeps the **two Riverside attack waves** per cycle. Storm, Magma, Desert, and Snow retain their map hazards without platform attack waves.
- Item launch ports and attack vents must read as different physical mechanisms. Players can tell where a supply or attack originates.
- The platform does not block fighter shots. No projectile damage, hit flash, or retaliation is triggered by shooting its art.
- Replace the rising alarm with a short, calm notification cue. No siren or large machine motor sound accompanies the platform cycle.

## Visual concept: twin-deck platform

A low, wide central deck sits at channel level with two armored side pods and a recessed, illuminated core. The pods leave the north-to-south firing axis visually open. Each bank-facing edge has two small **supply hatches** that open and kick items in readable arcs; this supports two drops per bank without weapons appearing from one unexplained point. Separate, compact **attack vents** sit near the left and right shoulders of the deck. Their color and motion distinguish them from the supply hatches: neutral/gold for supplies, red/orange for fire, blue for icicles, and white-blue for lightning.

The platform is always visible but low profile. An idle loop uses subtle current, indicator pulses, and deck movement. During a cycle, the deck wakes, hatches open, item launchers extend only enough to show the throw, then retract. The attack vents aim and fire from fixed points. No high shaft, bubble shield, tall silhouette, or large animation obscures the fighters or their shots. The platform should feel purposeful and technologically advanced rather than like a static object pasted onto the channel.

The same core design needs environmental variants or contact effects so it belongs in every map: moving water around Riverside and Storm, heat shielding and magma glow in Magma, anchored supports within the Desert crack, and ice buildup and displaced frost on Snow. Variants should preserve one recognizable silhouette and the same gameplay geometry. Map art must not bake the old Tower into the channel.

## Cycle and combat rules

1. **Idle:** the platform remains low and quiet. Players continue moving, shooting, and collecting items.
2. **Prime:** a brief calm cue plays once. Supply hatches and attack vents visibly wake. On Riverside, the first attack lane is acquired and shown shortly before it fires.
3. **Launch:** item ports throw paired weapons to independently random, reachable positions on each bank. In 2v2, each bank receives two weapons. Existing weapon-mode rules, stacking, flight, 12-second pickup life, final-three-second blink, and the rare extra syringe chance remain.
4. **Second Riverside attack:** after the launch, the vents acquire and fire a second attack wave. Fire, lightning, and icicle rules remain recognizable; both banks receive equivalent timing and attack type, with one aimed lane per living fighter in 2v2 as currently implemented.
5. **Settle:** hatches close and the platform returns to idle. Nothing about settling blocks the arena or pauses combat.

The old 5.2-second rise and 5.4-second descent are removed. Start by keeping the *overall supply interval* close to the current balance, then tune the shorter visible action and idle time through playtests. Do not leave players waiting through an empty animation. Attack telegraphs stay brief and readable; they do not begin long before the actual shot. Attacks and drops remain fair on both banks.

All direct fighter shots, beams, missiles, and grenades cross the center according to their existing weapon rules. The platform is neither cover nor a hit target. Its art stays behind crossing direct shots, while overhead projectiles keep their current arc and aerial depth. The base's own vent fire starts visibly at a vent and travels continuously along its marked lane.

## Art and animation deliverables

- Original high-resolution source art and optimized runtime sprite sheets for the platform's idle, priming, supply-hatch opening/closing, launcher extension/retraction, attack-vent aiming/firing, and short settle motions.
- Distinct launch-port and attack-vent muzzle frames, thrown-item origin markers, and environmental contact effects for water, magma, desert chasm, and ice. Reuse existing weapon sprites and attack projectiles where they still fit.
- Frame metadata for anchors, port coordinates, vent coordinates, scale, and timing. One shared geometry definition should drive art placement, projectile origin, and hit-lane telegraphs.
- A phone-size visual prototype before replacing the live art. Check idle, 1v1 launch, 2v2 launch, both attack waves, and crossing shots on all five maps.
- Preserve the existing detailed arcade pixel-art quality, angled overhead view, visible water/magma/ice interaction, and smooth motion. No static full-screen illustration should substitute for animated gameplay parts.

## Audio and settings

- A quiet, short two-note electronic cue signals an upcoming supply cycle once. Its level must remain below gunfire and hazard warnings. Give item hatches and launchers a restrained mechanical click or pneumatic release; keep the existing weapon, impact, and hazard sounds where suitable.
- Remove the old red alarm sample, alarm-only playback logic, alarm volume/mute controls, and preview button. Keep the global sound toggle and preserve its stored preference when migrating audio settings.
- There is no replacement siren and no engine-like or train-like rise/descend sound. Riverside vent attacks retain distinct fire, lightning, and icicle feedback.

## Identity, text, and publication

- Replace Tower, tarot, Major Arcana, fate/card, rise/descent, and Tower-weapon language in the menu, HUD labels, controls, settings, results, help text, accessibility labels, README, and current design documentation. Use a neutral working term such as **the platform** or **supply deck** until the name is chosen.
- Keep the two-bank fight and adaptation theme. The existing line “When certainty falls, adapt.” may be retained if it still fits the final identity; it is not a naming constraint.
- **Division** is the provisional on-screen title selected for Phase 8. Final naming and availability review remain separate from the gameplay implementation.
- Do not change the GitHub repository slug or published URL merely because the on-screen title changes. Decide on any URL migration separately, after the name is final.

## Code migration plan

1. Define a platform cycle state with `idle`, `prime`, `launch`, `secondAttack`, and `settle`, and a single geometry object for item ports and attack vents. Preserve the match's paired-drop and attack fairness invariants.
2. Replace Tower drawing, shaft masks, hatch masks, rising droplets, shield/cap remnants, base animation, and Tower-specific projectile depth with the low platform render system. Avoid reusing the old Tower silhouette or invisible collision geometry.
3. Remove Tower body/arm collision tests, `hitTower`, Tower impact effects, and direct-shot interception by the center. Update laser and conventional projectile depth so their crossing path is visually and mechanically unobstructed. Keep crate and barrel collision unchanged.
4. Re-anchor supplies, syringe throws, and Riverside attack vents to the new artwork. Ensure both banks and both formats use the correct source positions, and that an item does not originate inside or behind the deck art.
5. Replace alarm/audio and old Tower-facing copy. Retain user settings that still apply; remove obsolete alarm preferences without resetting the global mute choice.
6. Delete unused runtime Tower images/audio and dead code after migration. Keep source archives only when useful for project history. Update tests and documentation together with the implementation.

## Acceptance criteria

1. In every map, the platform looks attached to its water, magma, chasm, or ice setting and never appears to float, stretch, or pop between frames. It remains low enough that the fight is visible.
2. Every thrown weapon and syringe visibly leaves a supply port, follows a clear arc, lands at a reachable position, and obeys the existing pickup and mode rules. Four simultaneous 2v2 weapon drops remain legible.
3. Riverside attacks visibly leave attack vents, mark short fair lanes, and traverse their full paths on both banks. The first and second waves occur at distinct moments in each supply cycle.
4. A pistol, rifle, shotgun, or laser shot can cross the platform's visual footprint and reach its normal target. No platform collision, impact flash, disappearing shot, or projectile hiding occurs. Directed missiles and grenades retain their overhead travel and ground markers.
5. The old alarm does not play or appear in Settings. The new cue plays once per cycle at a calm level. Global mute still works and persists.
6. Menu, settings, results, HUD, accessibility text, instructions, and project documentation use the new identity consistently after the title is chosen. The published game still loads at its existing URL during the transition.
7. Visual checks cover 1v1 and 2v2 on all five maps at desktop and phone sizes, including pause, game over, item launch, attacks, cover overlap, and shots crossing the platform. Simulation tests and production build pass, followed by a physical phone playtest.

## Outside Phase 8

Online multiplayer, new fighter abilities, new weapons, new maps, altered bank geometry, and a repository URL migration are outside this phase unless separately approved.
