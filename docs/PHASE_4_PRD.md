# Phase 4 PRD: Crate loot and game modes

- **Product:** The Tower Deal
- **Status:** Implemented in the playable prototype; balance remains open to playtesting
- **Platform:** Browser, including phone touch controls
- **Match format:** One round, player versus computer

## Summary

Phase 4 gives destroyed crates a chance to release a weapon or a healing syringe, and adds three ways to play against the computer. The Tower, both fighters, and the destructible arena keep their existing combat rules. The new modes change which weapon the Tower and crates can deal; they do not change bank assignment, weapon capacity, or the single-round win condition.

## Goals

- Make breaking cover a meaningful tactical choice without filling the banks with pickups.
- Add healing that is visible, limited by the crates available in a round, and equally usable by both fighters.
- Let the player choose between independently random weapons, one randomly selected weapon for the match, and one selected weapon for the match.
- Preserve the current phone controls and keep mode selection clear before the fight begins.

## Menu and match flow

1. The main menu keeps **VS COMPUTER** and **SETTINGS**. Selecting **VS COMPUTER** opens a mode menu instead of starting immediately.
2. The mode menu offers:

   | Mode | Selection | Tower launches | Weapon drops from crates |
   | --- | --- | --- | --- |
   | **Random Weapons** | Start immediately | One independently random weapon and landing position per bank on each paired launch | Independently random weapon type |
   | **Random Fixed Weapon** | The Tower randomly chooses and reveals one weapon before the match | The chosen type on both banks for the whole match; landing positions remain independently random | The chosen type |
   | **Choose Fixed Weapon** | Player chooses one of the six weapons, then starts | The chosen type on both banks for the whole match; landing positions remain independently random | The chosen type |

3. Random Fixed Weapon cycles through the weapon images for about two seconds, slows down, then settles on the type already selected for that match. The chosen weapon stays visible during a three-count, then the match starts automatically. The reveal has no Back or Start control. Every weapon, including the Nuclear Launcher, is eligible in both fixed weapon modes. The computer uses the same type as the player. Both fighters begin with only their unlimited pistols and must still collect Tower or crate weapons.
4. **Play Again** keeps the current mode. Random Fixed Weapon draws and reveals a new type each match. Choose Fixed Weapon keeps the player's selection. Random Weapons resumes independent random drops. Returning to the main menu allows a new mode selection.
5. The mode and manually chosen weapon screens provide Back navigation and touch-sized controls. The random reveal occurs before combat starts; it must not obscure an active match. Existing settings, pause, sound toggle, and result flows remain available.

## Crate drops

- Each crate rolls once when it is **fully destroyed**. The first direct shot only cracks it and produces no loot. A second direct shot, an explosion, a barrel chain reaction, or any other existing destruction path can trigger the roll. Barrels themselves do not release loot.
- The roll is independent for each crate, on either bank:

  | Outcome | Chance |
  | --- | ---: |
  | Nothing | 55% |
  | Weapon | 30% |
  | Healing syringe | 15% |

- A crate yields at most one item. Several crates destroyed by one explosion each roll separately. A weapon's type follows the selected mode as shown above.
- Loot belongs to the bank where the crate stood, regardless of who destroyed it. It appears beside the broken crate debris, inside the playable bank and outside solid cover. If several nearby crates break together, their items should fan out enough to remain distinguishable and collectible.
- Crate loot remains stationary after landing. It uses the existing pickup depth ordering with soldiers: fighters can walk through it, and the item is drawn in front or behind them according to their ground positions. A blocked weapon remains visible and does not follow a fighter.
- Crate loot lasts **12 seconds after landing** and blinks during its final **three seconds**, matching Tower pickups. The brief release animation does not consume ground lifetime.

## Weapon and healing rules

- Fighters still carry at most one Tower weapon type. A matching pickup adds that weapon's full starting ammunition with no cap. A different weapon cannot be collected until the current one runs out; it stays available on the ground until its normal expiry.
- A syringe restores **20 HP**, capped at the existing 100 HP maximum, and does not use the weapon slot. It can be collected while carrying any weapon. A fighter at full health cannot consume it; the syringe remains until collected after damage or until it expires.
- Show the **actual** health restored, such as +7 when the fighter had 93 HP. Update the segmented health bar immediately. Give both fighters an equally legible healing cue; show the number offset beside the fighter so it does not cover their body or weapon badge.
- The computer follows the same pickup, health, and ammo rules. When damaged, it should consider reachable syringes and matching or unblocked weapon pickups while still dodging hazards and navigating solid crates.

## Nuclear fixed weapon matches

The Nuclear Launcher is included without a special drop-rate reduction. Nuclear waste stays on the ground permanently for the round, including when it spreads across both banks. Dense waste is an intended outcome of a nuclear fixed weapon match. No automatic waste cleanup, area cap, or weapon exclusion is part of Phase 4.

## Presentation and assets

- Create original pixel art for a clearly readable healing syringe pickup at the game's world scale. It must be visually distinct from the six weapon pickups and remain legible against sand, scorch marks, and nuclear waste.
- Give crate loot a short release or hop effect anchored to the destroyed crate. Reuse the existing crate break frames and debris; do not replace the crate art solely for this feature.
- Add restrained healing feedback and a short collection sound. Crate releases should have a clear but brief sound. Existing weapon pickup feedback, pickup expiry blink, and combat sounds remain consistent.
- The mode menu uses concise descriptions and weapon art already in the game. Random Fixed Weapon clearly reveals the chosen type before play; Choose Fixed Weapon clearly marks the selected type. Keep combat HUD space unobstructed.

## Acceptance criteria

1. **VS COMPUTER** leads to a three-mode menu. Every mode can start and return to the main menu on desktop and phone.
2. Random Weapons preserves paired Tower timing with independently random types and positions. Both fixed modes use one type for every Tower weapon and crate weapon during that match, while paired landing positions stay independent.
3. The random fixed type can be any of the six weapons. A replay in that mode rerolls it; a replay in Choose Fixed Weapon retains the selected type.
4. Every fully destroyed crate makes exactly one 55/30/15 loot roll. A cracked crate makes none. Explosion and chain-reaction destruction do not duplicate rolls.
5. A crate's item is collectible on its own bank, does not overlap solid cover or become trapped in debris, and remains stationary and visible as either soldier passes it.
6. Syringes heal either fighter by the lesser of 20 HP and their missing health. Full-health fighters leave them on the ground. Healing does not alter a held weapon.
7. Existing one-weapon capacity, matching ammo stacking, pickup expiry, and final-three-second blink also apply to crate weapon loot.
8. The computer can collect reachable healing when hurt and usable weapon loot without getting stuck against crate formations or barrels.
9. Nuclear fixed weapon matches permit permanent waste on both banks. Both fighters retain their existing damage, dodge, and hazard rules.
10. A production build and simulation tests pass. Check the three menu paths, crate drops, healing, pickup layering, and repeated nuclear fixed weapon matches in a phone-sized browser viewport.

## Out of scope

Online player versus player, bank selection, new weapons, additional healing items, alternate maps, extra inventory slots, and changes to the existing nuclear waste lifetime are outside Phase 4.
