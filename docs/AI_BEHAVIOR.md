# Computer fighter behavior

The same `Match` simulation runs computer fighters locally and in authoritative online co-op rooms. `src/ai-tactics.js` contains risk scoring, destinations, cover selection, and weapon decisions; `Match` owns observations, navigation, movement, and firing.

## Perception and reaction

- Decisions sample visible opponents every 220–340 ms. A newly acquired opponent requires another 240 ms reaction window before firing. Aim has small positional variation and does not follow a target between samples.
- Sandstorms, dense volcanic ash, avalanche fronts, and hail clouds conceal both observers and targets. Hail cloud placement is shared with the renderer. Losing sight cancels a laser charge and targeted firing; the last observed position can guide movement for up to 2.5 seconds, without reading hidden movement.
- Low crates block bullets, but do not obstruct the overhead view. Computer fighters can still see an opponent across low cover, as a human player can.
- Nearby danger can be noticed within 60 world units even under obscuring weather. Future hail salvos are not avoided until the falling-icicle cue appears.
- Mirage pickups use the same eligibility and value rules as real supplies. The AI cannot inspect a trap flag to avoid them.

## Movement and map awareness

Weighted routes avoid visible nuclear waste, flames, burning rocks, and announced impact areas. Mud and ice have softer movement costs; quicksand and tornado pull areas carry stronger penalties. Safe destinations and routes stay within the existing bank bounds and respect solid cover. An independent 40 ms danger check reacts to imminent bullets, explosives, laser charges, and hazards without waiting for the next navigation decision. It allows a difficulty-dependent reaction delay and chance of failure. Dodge destinations use eight directions, respect bank edges and solid cover, and need not follow the current strategic waypoint. Ordinary bullet trajectories become threats only within 420 ms of arrival, avoiding perfect long-range sidestepping. A healthy fighter already charging a laser prefers strafing over cancelling it for a light bullet, but still rolls against heavy attacks.

Riverside attack lanes, Storm lightning/tornadoes/mud, Magma burning debris and lava, Desert quicksand/eagle/scorpion attacks, and Snow ice/avalanches/hail contribute separate risk zones. Avalanche dodge immunity is respected when choosing whether to evade again.

In 2v2, teammates separate, coordinate pickup claims, and prefer different visible targets when practical. Target selection has hysteresis to avoid rapid switching. At low health, a fighter can shelter behind a crate for roughly two seconds, then resumes combat rather than camping indefinitely.

## Difficulty

Match setup offers **Easy**, **Normal**, and **Hard**. Normal is the initial selection; the browser remembers the choice. Online co-op uses the host's selected difficulty, includes it in the invitation details, and preserves it for rematches. Human-versus-human combat is unaffected. All computer fighters in a match, including a computer teammate, use the chosen profile.

| Setting | Easy | Normal | Hard |
| --- | --- | --- | --- |
| Decision interval | 500–700 ms | 270–370 ms | 220–340 ms |
| Target acquisition delay | 700 ms | 320 ms | 240 ms |
| Aim variation per axis | ±32 px | ±12 px | ±6 px |
| Pause beyond weapon cooldown | 550 ms | 120 ms | 0 ms |
| Dodge reaction delay | 180 ms | 100 ms | 70 ms |
| Dodge attempt probability | 30% | 75% | 90% |

Easy notices a combat threat on only 45% of decision updates and holds a missed cue for that entire 500-700 ms interval. Both walking routes and dodge reactions respect the same missed cues; permanent ground hazards remain visible. Easy retries dodge attempts no faster than every 1.25 seconds, compared with 300 ms on Normal and Hard. This produces actual missed evasions rather than replacing every failed roll with a perfect sidestep.

Health, damage, movement speed, laser charge duration, and dodge invincibility/cooldown do not change with difficulty. Profiles live in `src/ai-difficulty.js`; both the browser and room server validate the setting.

## Weapons and pickups

- Direct specials wait for an aligned, clear lane. Unlimited pistol shots can break obstructing cover; useful friendly cover is preserved during a brief defensive pause.
- Missiles and thrown grenades can clear low cover. Stun ammo is conserved while the observed target is already stunned. A nearly defeated target can be finished with the pistol.
- The laser can charge while strafing into alignment, retaining its charge when a visible target changes lanes. It releases at full power once a shot lines up; cover encountered after charging can receive the shot if safe. Occlusion, stun, and dodging still interrupt charging.
- A successful human dodge cancels laser charging until the held button is released. That release does not fire or spend ammo; a fresh press starts from zero. Failed dodges leave charging alone. Computer dodges also reset charge, and the next charge starts from zero after the roll.
- Enemy laser charging triggers short evasions near full charge, interleaved with counterattack windows. Early charging does not stop pistol pressure, and arcing weapons can keep firing from outside the beam lane. Holding a charge indefinitely does not suppress all counterfire.
- Explosive barrels can be targeted near an opponent, provided their blast would not endanger a living teammate. Burning or cooling rocks do not receive wasted direct shots.
- Supplies must be visible, collectible, and outside severe danger. Healing gains value with missing HP; matching weapons can be collected for additional ammunition.

This is a bounded heuristic opponent, not a learning model or a guarantee of optimal play. Reaction delays, imperfect aim, occasional failed evasion, and misleading pickups remain intentional. Terrain is known; moving hidden opponents are not.

## Results pacing and verification

Round-end animation holds for 1.4 seconds, preserving the existing fall animation. The results overlay fades in over 350 ms. A single teammate's death does not end a live 2v2 round.

Run `node --test tests/*.test.js` for simulation regressions. `tests/ai-difficulty.test.js` checks difficulty, online configuration, bullet dodging, and laser cancellation. `scripts/audit-ai-controls.mjs` verifies difficulty controls, persistence, and held-button cancellation in the browser. `tests/ai-tactics.test.js` covers perception, reaction, mirages, hazards, routing, cover, ammo decisions, and results timing. Browser audits in `scripts/audit-visuals.mjs` and `scripts/audit-combat-ui.mjs` check rendering and controls; `scripts/smoke-online-2v2-browser.mjs` exercises the shared online simulation.
