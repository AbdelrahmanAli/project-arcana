# Boss mode plan

**Status:** Playable implementation completed on 2026-11-14. The encounter descriptions below remain the design target for future animation and attack refinements; the shipped patterns and effects are recorded in `src/boss-encounter.js` and the release review.

## Experience

Division gains a distinct PvE match type: one player versus a boss, or two fighters versus a boss. The two fighters can be a player and an AI teammate locally, or two invited players online. Every participant sees their own fighter on the lower bank. The boss occupies the upper bank and never crosses the divide. Defeat the boss before every player-side fighter falls. A surviving teammate can finish the fight alone.

The existing five maps remain the locations, with one nonhuman boss per map. The bosses are fantasy creatures or constructs; they need no technological explanation. Each fight has readable attack windups, safe routes, and moments to counterattack. No ordinary enemy waves are required for the first boss-mode release.

## Shared rules

- The upper bank contains only the boss and its attack effects. No enemy soldiers, crates, barrels, pickups, or ordinary map hazards spawn there. Decorative weather and terrain can remain visible, but do not damage or impair the boss.
- Existing map hazards continue on the player bank, including rain/mud/lightning, magma/smoke, sandstorm/quicksand/mirage, and snow/ice/avalanche/hail. Boss attacks can create additional temporary hazards on the player bank. Bosses are immune to their map's ordinary hazards.
- The central platform never attacks players in this mode. It launches weapons and occasional additional syringes only to the player bank: one weapon chance for solo, two independently positioned weapons for a two-fighter team. The existing weapon modes and pickup stacking rules apply. A teammate who falls does not remove the other fighter's pickup opportunity during that cycle.
- Pistol, special weapons, and dodge remain available. Bosses have explicit hit regions and one shared health bar. They are damageable at all times; a revealed weak point briefly grants bonus damage, never basic permission to hit. Direct shots and explosions damage the boss according to the same collision rules on desktop and phone. Bosses cannot pick up supplies or be stunned like soldiers; the stun launcher deals its small damage and may briefly interrupt a boss attack when tuned for balance.
- Boss health starts at **500 solo / 800 duo** as a tuning target, not a final balance promise. Damage dealt by each weapon remains unchanged initially. Boss attack frequency and target selection adjust for two fighters; hazards never become unavoidable because there are two targets.
- No mid-round respawn and no match timer or time limit. A match ends when boss health reaches zero or all player-side fighters are down. Boss death gets a full animated collapse before results appear. Rematch uses the same map, lineup, and boss; menu return allows changes.

## Boss roster and attacks

| Map | Boss | Silhouette and movement | Attack set |
| --- | --- | --- | --- |
| Riverside | **Siegebreaker**, a huge haunted amphibious tank | Tracked armored hull patrols the upper bank; its launchers and turret visibly change for each attack. | Twin cannon blast, guided missile barrage, continuous red laser sweep, and a nuclear warhead that leaves temporary radiation. |
| Storm | **Night Wraith**, a ghost of thunder and darkness | Its spectral core flickers between grounded and hovering poses; a persistent visible outline prevents unfair invisibility. | Lightning chain with marked endpoints; sweeping spectral arc; brief cloud decoys that cannot damage but disguise the real core until its next attack; a delayed thunder pulse from its last visible position. |
| Magma | **Cinder Giant**, a living volcanic stone creature | Heavy steps shake and crack its upper-bank footing; glowing seams expose its inner fire. | Arcing molten fists that leave temporary lava pools; an expanding ground fissure on the player bank; a slow, high-damage boulder that can be shot apart; a burst of hot fragments with gaps to move through. |
| Desert | **Dune Maw**, a gigantic burrowing sand beast | Its armored head and dorsal plates emerge from sand, with visible sand displacement before repositioning. | Crossing sand-blade sweeps; a tracked burrow strike with a widening safe-side cue; a brief sand vortex that pulls toward a marked center; a row of erupting sand teeth with one opening. |
| Snow | **Frost Colossus**, an ancient ice giant | It plants its feet and grows crystalline armor; cracks reveal a bright heart. | Cascading icicle rows with gaps; a sliding ice beam that leaves short-lived slick paths; an ice boulder that rolls across a lane and can be destroyed; a ground frost wave that can be crossed with a timed dodge. |

Each boss has at least four attacks at launch, with phase-specific sequences and variations. An attack must have a physical origin, distinct windup silhouette and sound, readable travel, impact, and aftermath. Telegraphs appear close enough to the attack to preserve pace and use the attack's color. A boss cannot chain unavoidable damage against a fighter who has just been hit; recovery and dodge windows are part of encounter tuning.

## Art and animation specification

- Produce original high-resolution source art and compact transparent runtime sprite sheets for all five bosses. Each sheet needs idle/breathing, locomotion or repositioning, four attack windups and releases, hit response, weak-point reveal, phase transition, and death. Where a boss has independent parts (tank turret, Wraith core, Dune Maw segments), animate those on separate layers with shared anchors.
- Produce separate projectile, impact, warning, and aftermath sheets for each unique attack. Avoid scaling one static image to fake motion. Frame metadata records anchors, hit regions, spawn points, and frame timing in one boss definition so animation and gameplay agree.
- Keep the established angled overhead pixel-art perspective and consistent world scale. A boss should dominate its bank without hiding the player-side attack lanes. Test readability at 320-pixel phone width, normal portrait, and landscape.
- Add one distinctive boss health treatment, restrained phase cue, and map-specific death effect. The boss HP bar must stay within the upper bank and cannot cover its vulnerable region or incoming shots.
- Animation runs from simulation time, so pause, online snapshots, and reconnect do not cause pose jumps. Each boss has a short authored loop even while stationary. New sounds should be original/generated or licensed and recorded in the audio inventory.

## Encounter pacing

Start each fight with a short reveal that lets players read the boss silhouette before controls unlock. Introduce attack patterns gradually, then combine and vary them as health falls. At about 70% and 35% remaining health, play a short transition and change the attack mix, speed, or pattern; avoid adding more raw damage merely because the boss has two targets. Add alternate sequences, target choices, and counterplay so a long fight does not become a repeating three-attack loop. There is no time-based enrage or automatic draw. Keep a minimum reaction time and safe region for every attack, including when a map hazard overlaps. The boss chooses between living fighters and should not tunnel one target for the entire match.

## Implementation boundaries

- Introduce a `BossMatch`/boss encounter model with a boss actor, encounter phase, attack scheduler, collision/hit regions, and map-specific attack definitions. Reuse fighter movement, weapon, dodge, cover, pickup, and hazard systems on the player side; do not make the boss a special soldier with fake weapon slots.
- Add a separate boss format to local setup and the authoritative online room protocol. Online clients receive boss state, attack events, and result state from the server. Two-player online invitations use the existing room flow with both seats on the same team. A reconnect restores boss phase and one-hit attack history without replaying held controls.
- Generate player-bank-only cover and hazards. Boss-side environmental visuals may still render; gameplay effects filter by bank. Suppress platform attack scheduling in boss mode, while keeping its supply animation and timing.
- Add tests for solo/duo health and victory, boss-side hazard immunity, player-bank-only drops and cover, readable attack windows, collision of every weapon family with boss hit regions, dodge immunity, team targeting, snapshot/reconnect, and end-state transitions. Visually audit every boss and attack at phone and desktop sizes before release.

## Decisions to settle during the playable prototype

1. Should an AI teammate be selectable by character before a local duo boss fight, as in current 2v2?
2. Should boss phases be purely health-based, or should each boss also react to its map hazard cycle?
3. Should the boss's large attacks destroy player-side crates/barrels, or should only player weapons and existing map hazards do so?

The recommended defaults are selectable AI teammate, health-based phases with cosmetic hazard reactions, and boss attacks affecting cover when the animation clearly hits it.
