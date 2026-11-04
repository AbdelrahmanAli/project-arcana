# Computer fighter behavior

The same `Match` simulation runs computer fighters locally and in authoritative online co-op rooms. `src/ai-tactics.js` contains risk scoring, destinations, cover selection, and weapon decisions; `Match` owns observations, navigation, movement, and firing.

## Perception and reaction

- Decisions sample visible opponents every 220–340 ms. A newly acquired opponent requires another 240 ms reaction window before firing. Aim has small positional variation and does not follow a target between samples.
- Sandstorms, dense volcanic ash, avalanche fronts, and hail clouds conceal both observers and targets. Hail cloud placement is shared with the renderer. Losing sight cancels a laser charge and targeted firing; the last observed position can guide movement for up to 2.5 seconds, without reading hidden movement.
- Low crates block bullets, but do not obstruct the overhead view. Computer fighters can still see an opponent across low cover, as a human player can.
- Nearby danger can be noticed within 60 world units even under obscuring weather. Future hail salvos are not avoided until the falling-icicle cue appears.
- Mirage pickups use the same eligibility and value rules as real supplies. The AI cannot inspect a trap flag to avoid them.

## Movement and map awareness

Weighted routes avoid visible nuclear waste, flames, burning rocks, and announced impact areas. Mud and ice have softer movement costs; quicksand and tornado pull areas carry stronger penalties. Safe destinations and routes stay within the existing bank bounds and respect solid cover. Heavy nearby threats can trigger a dodge; ordinary bullets usually prompt a sidestep.

Riverside attack lanes, Storm lightning/tornadoes/mud, Magma burning debris and lava, Desert quicksand/eagle/scorpion attacks, and Snow ice/avalanches/hail contribute separate risk zones. Avalanche dodge immunity is respected when choosing whether to evade again.

In 2v2, teammates separate, coordinate pickup claims, and prefer different visible targets when practical. Target selection has hysteresis to avoid rapid switching. At low health, a fighter can shelter behind a crate for roughly two seconds, then resumes combat rather than camping indefinitely.

## Weapons and pickups

- Direct specials wait for an aligned, clear lane. Unlimited pistol shots can break obstructing cover; useful friendly cover is preserved during a brief defensive pause.
- Missiles and thrown grenades can clear low cover. Stun ammo is conserved while the observed target is already stunned. A nearly defeated target can be finished with the pistol.
- The laser charges only with a viable firing lane. Visible enemy charging prompts lateral movement. Occlusion, stun, and dodging interrupt charging.
- Explosive barrels can be targeted near an opponent, provided their blast would not endanger a living teammate. Burning or cooling rocks do not receive wasted direct shots.
- Supplies must be visible, collectible, and outside severe danger. Healing gains value with missing HP; matching weapons can be collected for additional ammunition.

This is a bounded heuristic opponent, not a learning model or a guarantee of optimal play. Reaction delays, imperfect aim, occasional failed evasion, and misleading pickups remain intentional. Terrain is known; moving hidden opponents are not.

## Results pacing and verification

Round-end animation holds for 1.4 seconds, preserving the existing fall animation. The results overlay fades in over 350 ms. A single teammate's death does not end a live 2v2 round.

Run `node --test tests/*.test.js` for simulation regressions. `tests/ai-tactics.test.js` covers perception, reaction, mirages, hazards, routing, cover, ammo decisions, and results timing. Browser audits in `scripts/audit-visuals.mjs` and `scripts/audit-combat-ui.mjs` check rendering and controls; `scripts/smoke-online-2v2-browser.mjs` exercises the shared online simulation.
