# Phase 7 PRD: Character roster, map-aware AI, and 2v2

- **Product:** The Tower Deal
- **Status:** Implemented locally; physical phone playtest pending
- **Platform:** Desktop and phone browsers
- **Match formats:** Existing 1v1 versus computer, plus playable 2v2 with the player and one computer teammate against two computer opponents

## Summary

Phase 7 makes computer fighters respond to what they can perceive on each map, introduces a six-character roster, and adds a playable 2v2 mode. The roster has three men and three women. The current blue and red soldiers receive names and art that works on either bank; four new fighters receive their own colors, gear, and animation sheets. Character choice changes identity and appearance only. Every fighter keeps the same movement, hitbox, health, dodge, weapon access, and damage rules.

The player chooses their character in Settings. After choosing a map, they can select the opponent in 1v1, or a computer teammate and two opponents in 2v2. Each slot also offers Random. A 2v2 round ends when both fighters on one team have fallen; if the player dies first, their teammate can still win.

## Goals

1. Make computer decisions believable and map-specific without giving AI hidden knowledge of concealed fighters, fake pickups, or untelegraphed hazards.
2. Give all six characters clear, original sprite animation for both bank orientations, with stable size, feet, shadows, and death poses.
3. Preserve the current 1v1 experience while adding a fully playable 2v2 prototype on all five maps and in all four weapon modes.
4. Keep target selection, health, pickups, hazards, and win conditions understandable at phone size with four fighters on screen.
5. Keep AI and art data structured enough to add more characters or team modes later without branching the simulation by sprite color or hard-coded player index.

## Agreed decisions

- Launch with **six** playable characters: **three men and three women**. The existing blue and red soldiers count toward the three men; add **three women and one man**.
- Every character can be controlled by the player, act as a computer teammate, or act as a computer opponent. No character is tied to a bank.
- Characters are **cosmetic and identity choices** in Phase 7. They have equal gameplay stats and abilities.
- Phase 7 includes **playable 2v2**, not only preparation for it.
- The player chooses their computer teammate before a 2v2 match, with a Random choice available. Opponent slots also offer Random after map selection.
- A 2v2 round continues after any single death. The last team with a living fighter wins. There are no respawns.
- Fighters' weapons do **not** damage their own teammate. Environmental hazards, ground fire, and nuclear waste can damage any fighter in their area.
- In 2v2, each Tower cycle delivers **two weapons per bank** so each fighter has a pickup opportunity.

## Proposed launch roster

These working names are approved as Phase 7 art direction. Lock final names when approving character art; the gameplay rules do not depend on a name or color.

| Character | Identity | Main palette | Visual read at game scale |
| --- | --- | --- | --- |
| **Elias** | Existing blue soldier; man | Cobalt blue and cyan | Blue armor plates, dark undersuit, cyan visor |
| **Dorian** | Existing red soldier; man | Scarlet red | Red helmet and chest plates, dark charcoal gear |
| **Tomas** | New; man | Amber and black | Amber shoulder armor, heavy utility rig |
| **Nadia** | New; woman | Violet and charcoal | Violet upper armor, compact field pack |
| **Imani** | New; woman | Emerald and black | Green vest, bright lime identification tabs |
| **Mara** | New; woman | Magenta and dark navy | Magenta helmet and sleeve accents, narrow backpack |

Faces, proportions, hair or helmet shapes, gear silhouettes, and portraits should help identify characters even when color is obscured by snow, ash, sand, fire, or a charging laser. Female characters must read as distinct human fighters with practical combat gear, not as recolors or exaggerated anatomy. Team membership is shown by HUD labels and outlines; uniform color identifies the character, not the team.

## Match setup and replay

1. **Main menu:** VS COMPUTER opens a choice between **1v1** and **2v2**, followed by the existing weapon-mode selection and map selection.
2. **Settings:** A character selector shows six named portraits, color swatches, and the selected fighter at both north- and south-facing angles. The player's choice is saved locally. The existing audio and auto-pistol settings remain.
3. **Lineup screen after map choice:** Show the player's selected character. For 1v1, choose one opponent or Random. For 2v2, choose one computer teammate or Random and two opponents or Random. Show the map and weapon mode before confirming. Random Map reveals its map before this screen so the player knows which arena the lineup will enter.
4. Each match uses four distinct characters in 2v2 and two distinct characters in 1v1. Random fills unresolved slots without duplicates. If a manual choice conflicts with another occupied slot, the interface explains the conflict and asks for another character.
5. Existing random map and random fixed-weapon reveals remain. After the lineup is resolved and any weapon reveal completes, use the current short **READY! FIGHT!** countdown. No fighter moves, fires, or takes hazard damage during it.
6. **Play Again:** Keep manually selected characters and map. Re-roll Random character slots, Random Map, and Random Fixed Weapon as applicable. Returning to the menu permits a new format, mode, map, or lineup.

The player always uses the current lower-bank controls. Their computer teammate shares that bank and acts autonomously; Phase 7 does not add ally command buttons or a second local player. The north bank holds the opponent team. Spawns must keep fighters clear of walls, initial crates, barrels, and the phone controls.

## Computer behavior

### Perception and memory

- Each AI fighter receives an **observation** built from their position and the map's visible events. Observation includes visible fighters, visible pickup appearances, nearby projectiles, readable target markers, cover, and audible event cues. It excludes unseen actors' exact coordinates, mirage truth, unpublished random outcomes, and future hazard targets.
- Line of sight uses the same cover footprints and environmental occlusion regions that the player sees. Sandstorm and volcanic smoke hide fighters behind them; a dense avalanche front blocks sight through its snow wall. The AI may still see a fighter at close range where the effect is translucent enough for a human to recognize them. Visibility rules must be symmetric for AI on either bank.
- When a target disappears, remember the **last seen position and time**, then expand position uncertainty. An AI may search, take cover, or fire a low-confidence shot toward that area, but it must not track the target's actual hidden movement or land a precise guided attack on it. Memory expires after a short interval and is refreshed only by new sight or a justified sound cue.
- Pickups seen before an occlusion can be remembered, but their expiry is uncertain. A fake Desert item must enter the AI's decision process as an ordinary-looking weapon or syringe. The AI does not read the mirage's internal `state`, `aiInterested`, or true type flag to decide whether it is safe.
- Decisions update on a human-scale cadence with bounded reaction delay and imperfect aiming. Threats with readable warnings can be dodged; invisible or barely telegraphed events cannot be preemptively avoided. Variation must not create long idle periods or unfairly accurate instant reactions.

### Shared combat behavior

- Choose between seeking a useful pickup, lining up a direct shot, pressuring an exposed target, moving to cover, escaping a visible hazard, or regrouping with a teammate. Account for current ammo, health, dodge cooldown, charge state, nearby cover, and the other team's position confidence.
- Select an actual visible target or a remembered area. Direct fire requires a clear lane; missiles and grenades lock the aim point available to the AI at firing time, so hidden target movement cannot update the landing marker. Weapon behavior follows the same firing and cooldown rules as the player.
- Avoid repeatedly walking into a crate, wall, rock, teammate, or arena edge. Pathfinding re-evaluates after obstruction or a moving hazard. Teammates can pass through one another rather than trapping each other in narrow cover lanes.
- In 2v2, allies may pressure the same visible threat or take different angles, but they do not share perfect knowledge. A teammate can act on a briefly delayed sighting or audible cue from their ally; a hidden enemy's live position is never broadcast.
- Computer fighters may collect weapons, stack matching ammo, use syringes when injured, dodge, use the pistol, charge the laser, and be fooled or damaged under the same rules as the player.

### Map-specific policies

| Map | AI behavior to add or refine |
| --- | --- |
| **Riverside** | Watch the Tower's visible rise and descent, react to the current marked firing lane, avoid standing in persistent flame strips, and use cover without hiding under the river wall. The AI must not know the next random Tower attack before its cue. |
| **Storm** | Move deliberately through mud, react to visible lightning markers, resist a tornado pull, and choose escape routes that do not run directly into another marked strike. Rain may reduce aim confidence slightly; it does not make a visible fighter fully disappear. |
| **Magma** | Avoid marked rock and lava landings, steer around burning rock and ground fire, use cooled rocks as temporary cover, and lose sight of fighters hidden behind passing ash clouds. Do not aim a guided shot at a fighter after the smoke conceals them. |
| **Desert** | Treat sandstorm coverage as a real sight blocker, remember only the last seen target area, escape quicksand, dodge an eagle when its visible shrinking shadow becomes threatening, and sometimes pursue a tempting mirage. Heat shimmer may cause caution, but the AI must still be tricked on a meaningful share of encounters. |
| **Snow** | Respect slide momentum and braking distance on ice, react to the approaching avalanche from the outer bank, avoid the visible hail and icicle impact sequence, and lose sight through a dense avalanche front. A dodge can escape the avalanche; the AI cannot dodge before a readable cue. |

## 2v2 combat and arena rules

- Represent **fighter identity**, **team**, **bank**, **controller**, and **character** as separate fields. The current `players[0]`/`players[1]` and `1 - owner` assumptions must not drive targeting, drawing, damage, or results once four fighters exist. A bank-owned pickup can be collected by either living fighter on that bank; a fighter still holds at most one Tower weapon type.
- Both teams have the same number of fighters and equivalent spawn spacing. Give each fighter a visible name and segmented red health bar above their head. The player's HUD must remain distinguishable from the computer teammate's, and the enemy pair's health and weapon badges must not overlap one another or the phone controls.
- Conventional and directed shots pass through a living teammate. Teammate weapons, beams, and explosions cause no friendly damage or stun. Opposing shots retain their cancellation rules. Environmental hazards, Tower attacks, barrel explosions, fire, and nuclear waste affect either team according to their existing area rules.
- In 2v2, each Tower cycle throws **two weapon drops per bank**, one opportunity per fighter, with separately random reachable landing positions. Random Same Weapon uses one type for all four drops in a cycle; fixed modes use the selected fixed type; Random Weapons rolls types independently. The rare Tower syringe chance remains **one independent 8% roll per bank per cycle**, not a roll per weapon. Crate loot odds remain unchanged.
- Riverside still produces one marked Tower lane **per bank** on rise and descent, aimed at one randomly selected living fighter on each bank. Other map hazard counts remain bank-based rather than doubling merely because there are two fighters.
- A single fighter's death leaves their body and battle marks in the arena while their teammate continues. If the player dies, show that their ally is still fighting; keep the match visible without a result overlay until a team is eliminated. No respawn, mid-round character switch, or player control of the ally.
- The result names the winning team and surviving fighters. A draw occurs if the last living fighters on both teams fall in the same resolution step. The existing slow death and result pacing remains.

## Character art and animation pipeline

- Create **original pixel-art sprites** for all six fighters. Regenerate the existing blue and red fighter sheets where necessary so they use the same frame layout and visual scale as the four new fighters. No gameplay sprite is made by tinting another character's whole body.
- A character manifest maps a stable `characterId` to name, portrait, palette, sheet paths, per-frame bounds, feet anchor, and optional per-frame offsets. Runtime code must load by character ID rather than `p.id` or bank color.
- Every character needs north- and south-facing versions of idle/breathing, walking, pistol fire, equipped-weapon fire, laser charge, hit/stun, and death. Dive rolls need **eight direction-specific sequences**. Death needs a smooth transition into a grounded corpse for either facing, with no sudden size change, rotation, floating shadow, or wrong fall direction.
- Use a shared reference scale: the live standing fighter stays near the existing **78 × 78 logical-pixel box**, and the roll near **68 × 68**. Frame cells may contain transparent padding, but the visible body and foot anchor must remain aligned across frames and across characters. Horizontal mirroring is allowed only when it does not reverse a distinctive piece of gear or make a bank-facing pose anatomically wrong.
- Supply selection portraits and small HUD thumbnails for each character. Silhouettes and palette accents must remain readable on Riverside, Storm, Magma, Desert, and Snow, including beneath weather overlays. Team markers and red health bars must remain legible without recoloring the character.
- Document sheet dimensions, frame order, timing, and anchor metadata. Keep high-resolution source images under `docs/art-source/phase7/` and compact optimized runtime atlases under `public/art/phase7/`. Prefer loading portraits for the menu first and loading full animation sheets for only the selected match fighters before the countdown. The existing art-loading progress UI must also cover this match-specific load.
- Visually inspect every animation in all eight roll directions and both bank facings at phone size. Check transitions, foot shadows, weapon muzzle points, damage flashes, death layering, and frame transparency. Animation should use simulation time so pause freezes it cleanly.

## Technical implementation plan

1. Introduce character data and an art manifest, then replace fixed blue/red atlas indexing, death crop tables, and roll-frame arrays with character-driven rendering. Keep 1v1 behavior unchanged while any character can occupy either bank.
2. Separate fighter ID from bank/team ID in the simulation. Generalize targeting, collision, pickups, hazard damage, events, health HUD, end condition, and match statistics to two or four fighters. Preserve existing weapon and map rules.
3. Build a shared AI observation layer and a small set of reusable behaviors: seek, reposition, aim, fire, escape, heal, and search. Add one map policy per arena that evaluates only observable hazards and occlusion.
4. Add the format choice and lineup flow, including per-map opponent selection, optional random teammate/opponents, duplicate prevention, replay rules, and the saved player character in Settings.
5. Add four-fighter spawns, team-aware shots, shared-bank pickups, 2v2 Tower drop counts, allied AI, team results, and spectator continuation after player death.
6. Generate, prepare, and visually verify all character sprite sheets and portraits. Profile loading, texture memory, and frame rate on desktop and phone-sized browsers, then tune AI and presentation through playtests.

## Acceptance criteria

1. All six named characters, including the blue and red originals, can play as the user, ally, or opponent on either bank. The roster shows exactly three men and three women. No character has a gameplay stat advantage.
2. Every character has complete facing-specific, roll, fire, hit, and death animation with stable size and correct feet/shadow alignment. No missing frame or fallback to another character's body art appears in normal play.
3. The player character is selected and persisted in Settings. After each map selection, 1v1 offers one opponent or Random; 2v2 offers a teammate and two opponents, each with Random. A match never contains duplicate characters.
4. In 2v2, all four fighters can move, acquire drops, attack, dodge, heal, and die. Weapon damage never hurts a teammate, while environmental hazards can. The game continues after one death and ends only on team elimination or a simultaneous draw.
5. AI cannot precisely target or track an opponent concealed by sandstorm, ash, or avalanche. Tests show the last-seen position grows stale, and an AI can be baited by a visible mirage under the same collection trigger as a player.
6. Each map's AI responds to its visible hazard cues with realistic reaction time and has no repeated wall or cover deadlock. Across seeded matches, neither side gains hidden information or an artificial hazard immunity.
7. Tower drops, weapon modes, crate loot, temporary hazards, nuclear waste, pause, settings, random reveals, countdown, and results work in both 1v1 and 2v2 on all five maps.
8. Phone-sized visual tests confirm four readable fighters and health bars, nonoverlapping controls, smooth animations, and a clear result. The build and simulation tests pass; physical phone playtests check touch feel, art readability, audio balance, and sustained performance.

## Out of scope

Online multiplayer, a second human player, local shared controls, unique character abilities or stats, character progression, respawns, ally command buttons, new maps, and new weapons are outside Phase 7.
