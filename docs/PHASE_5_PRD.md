# Phase 5 PRD: Storm and magma arenas

- **Product:** The Tower Deal
- **Status:** Implemented in the browser prototype; damage and timing values remain open to physical-phone playtesting
- **Platform:** Desktop and mobile browsers
- **Match format:** One round, player versus computer; all four Phase 4 weapon modes remain available

## Summary

Phase 5 adds map choice and two arenas. **Storm** is a moonlit, rainy river map with mud, paired lightning strikes, and rare tornadoes. **Magma** replaces the river with flowing magma; a visible volcano sends rocks and fire toward both banks, and passing ash clouds limit sight. The current arena remains playable. The Tower stays in the middle on every map and keeps its weapon launches, shield, and fire retaliation.

The maps should change movement, sightlines, and timing without taking away the existing weapon and dodge decisions. Both fighters must face equivalent playable space and hazard pressure.

## Goals

- Give each map a distinct look and a distinct tactical rhythm that works in the existing slightly angled, top-down 2D view.
- Keep every hazard legible on a phone before it can deal damage or change movement.
- Preserve equal bank geometry and equivalent hazard rules for the player and computer.
- Keep map selection independent from the four weapon modes, so every map and mode combination is playable.
- Maintain a clear route around temporary cover and slow terrain; hazards must not trap either fighter.

## Map and menu flow

1. **VS COMPUTER** continues to open the weapon mode menu. After mode selection, add a **Choose Map** screen with **Riverside** (the existing map), **Storm**, **Magma**, and **Random Map**.
2. If **Choose Fixed Weapon** is selected, choose the weapon before choosing the map. If **Random Fixed Weapon** is selected, show its existing cycling weapon reveal after map choice; it still holds on the result for a three-count and starts automatically. Random Weapons and Random Same Weapon start after map choice.
3. **Play Again** retains a specifically chosen map. **Random Map** rerolls on each new match. Existing weapon-mode replay rules remain unchanged.
4. Map selection shows an image and one short description per map. It remains usable on narrow portrait phones and compact landscape screens. The player can go Back while choosing a map; the Random Fixed Weapon reveal remains non-interactive once it begins.
5. Settings, pause, sound toggle, and the result screen work identically on every map. Pausing freezes weather, hazard telegraphs, hazard movement, damage, and timers.

## Shared arena and fairness rules

- Every map has two equal-sized playable banks separated by an impassable river or magma channel. The Tower remains centered in that channel. Map art, collision bounds, cover placement, pickup landing areas, and AI navigation agree; decorative walls never conceal a walkable edge.
- A paired environmental event uses the same hazard type, timing, duration, and strength on both banks. Its safe landing or path positions may be independently random. Neither side receives an extra event.
- Hazards affect either fighter under the same rules. A dive roll retains its existing invincibility frames against hazard damage. A fighter cannot cross into the other bank.
- Telegraphs are world-space effects anchored to the actual impact or travel path. They must remain visible through rain, darkness, ash, explosions, and the Tower shield. HUD, weapon controls, health bars, and damage numbers stay above environmental effects.
- Event placement avoids spawn overlap at match start, solid cover, and configurations that close every route around a rock or tornado. The computer recognizes dangerous ground and navigates around it where a safe route exists.
- Tower launches retain the selected weapon-mode rules on all maps; environmental events do not change weapon contents, pickup ownership, or crate loot odds.

## Storm arena

### Visual setting

A rainy night beside the river, lit by moonlight. Rain moves continuously across the arena, water splashes along the banks, and mud has a visibly wet surface. The silhouettes and team colors of both soldiers, weapons, cover, and the Tower remain easy to distinguish. Lightning briefly lights the scene without a full-screen white flash.

### Mud

- Rain creates mud at predefined, mirrored ground sites. The proposed implementation starts with a few patches and introduces additional patches gradually, up to a fixed coverage cap. Mud must not spread without limit or consume a complete firing lane.
- Mud slows **walking** while a fighter stands on it. It does not deal damage, change shot velocity, or shorten a dodge roll. Proposed initial slow: **25%**; tune after phone playtests.
- Patches have clear edges and wet footprints/splashes so a player can tell when the slowdown starts and ends. Cover and pickups remain visible over mud.
- **Open design choice:** Growing existing patches instead of adding new ones is acceptable if it reads better in motion. Either approach must keep a coverage cap and at least one clear route on each bank.

### Lightning

- A storm event marks one impact area on each bank with a blue-white, ground-anchored charge. After a clear telegraph of approximately **1.2 seconds**, a bolt strikes each marked area.
- A strike gives one moderate hit to a fighter still inside its radius. Proposed initial damage: **18 HP**. It does not stun and does not leave permanent dangerous ground. The strike can damage crates or detonate barrels under existing explosion interaction rules, subject to playtest balance.
- Marks stay readable in moonlight and over mud. The bolt connects visibly from sky to marked ground, with a short impact flash and fading scorch trace. Screen brightness stays controlled for comfort and visibility.
- Lightning does not begin a new telegraph while a tornado is active. Already marked strikes finish before the tornado begins.

### Tornado

- A tornado is a **rare** storm event. Wind, rain, and debris indicate its path before its visible funnel reaches either bank. A paired event sends an equivalent vortex across each bank on a path that leaves room to escape.
- Wind pulls a nearby fighter toward the funnel. Reaching its center causes a short knockback and modest damage; proposed initial damage: **10 HP**. A dodge roll can escape or pass through without taking damage during its invincibility frames.
- The first implementation does not alter projectile trajectories or move pickups. This keeps aiming predictable and prevents weapons from unexpectedly leaving their bank.
- Tornadoes do not run at the same time as lightning strikes. Their frequency and pull strength are tuned after rain, mud, and lightning feel good together.

## Magma arena

### Visual setting

The central channel contains animated magma instead of water. The Tower still rises from its central base and throws weapons over both banks; the base and surrounding effects need magma-specific art so the interaction looks physically coherent. A volcanic source is visible as part of the arena's background or edge art, and projectile arcs clearly originate from it. Rocks, fire, and ash are distinct from the Tower's own fire retaliation.

### Volcanic rocks

- A volley launches rocks toward both banks. Each landing point receives a stony amber ground marker before impact, and the rock remains visible throughout its arc. The volley uses paired timing and equivalent rock count on each bank.
- A rock impact can hurt a fighter caught in its marked area; proposed initial damage: **16 HP**. The landed rock becomes **solid cover**, blocking walking and straight shots. It can be broken by attacks or destroyed by explosions. Proposed maximum lifetime: **15 seconds**, after which it crumbles into passable debris.
- The rock cannot materialize overlapping a fighter, a permanent wall, the Tower, or another solid object. If a fighter remains in the impact area, resolve the hit and shatter the rock on impact instead of spawning solid cover under them. Placement must never seal a fighter into a corner or close the only route around existing cover.

### Volcanic fire

- A separate volley sends burning material toward both banks. Its landing marker is bright orange and visually different from the rock marker. The airborne source, impact, and ground ignition form one continuous animation.
- Fire burns in a defined patch for approximately **four seconds**, then fades to a dark scorch mark. It damages either fighter standing in it; proposed initial damage: **12 HP per second**. A dodge roll prevents damage during its invincibility frames but does not extinguish the patch.
- Volcanic fire uses the existing ground-damage framework where possible, while preserving a distinct appearance and sound from Tower retaliation.

### Ash cloud

- A dense ash front travels across **both banks in the same event**, reducing distant visibility until it passes. Fighters retain a small readable area around themselves for movement. Opponents and distant pickups inside dense ash may be concealed.
- Ash does not cause damage or slow movement. Health bars, controls, own fighter, hazard landing markers, and imminent projectile indicators remain visible above it. Paired bank visibility must be equivalent.
- New rock and fire volleys pause during the cloud's densest interval. Telegraphs already in progress resolve visibly. Ash recedes with a clear animation rather than switching off instantly.

## Timing and interactions

- Environmental events start after the fighters have had time to move and collect an opening Tower drop. Use a shared per-map event scheduler rather than several independent random timers.
- The scheduler prevents overlapping high-attention events: lightning and tornado do not overlap; dense ash and new volcanic volleys do not overlap; only one volcanic volley type telegraphs at a time. Tower cycles continue, but event scheduling should avoid covering a Tower launch with an unreadable screen effect.
- Mud and landed rocks are local terrain; they can coexist with ordinary shots, pickups, barrel explosions, Tower fire, and nuclear waste. Damage sources follow existing dodge immunity and health-bar rules. When ground damage patches overlap, apply only the highest active damage-per-second rate to a fighter; direct impact damage remains separate.
- Rain, lightning, magma, fire, and ash sounds follow the existing sound toggle and stop or pause with the match. Ambient loops stay soft enough that weapon, dodge, hit, and Tower sounds remain clear.

## Art and implementation needs

- Create original pixel art consistent with the current soldiers, weapons, and Tower: storm and magma ground tiles, bank walls and cover variants, river/magma animation, moonlit lighting, rain/splashes, mud states, lightning telegraph/bolt/impact, tornado funnel/debris, volcano source, flying and landed rocks, volcanic fire, ash cloud, and aftermath marks.
- Keep art at the game's world scale and layered correctly: ground marks below fighters, terrain cover ordered by ground position, airborne hazards above the scene, ash over distant world objects but below essential combat indicators and UI.
- Define map data separately from shared combat rules: art, playable bounds, solid geometry, spawn points, cover formations, pickup landing zones, and hazard sites/paths. The same collision and navigation data drives rendering, player movement, AI, and hazard placement.
- Particle counts and lighting effects adapt to phone performance. Do not rely on heavy full-screen blur or rapid flashing to communicate rain, ash, or lightning.

## Delivery sequence

1. Add map data, map selection, and the unchanged current arena as a regression baseline.
2. Build the Storm art and rain/mud movement. Check mobile readability and navigation before adding attacks.
3. Add paired lightning; then add the rare tornado and tune event separation.
4. Build the Magma art and channel treatment. Add rock volleys, fire volleys, and ash in that order.
5. Balance all map and weapon-mode combinations, test on physical phones, and refine sound, effects, and AI responses.

## Acceptance criteria

1. A player can choose Riverside, Storm, Magma, or Random Map after choosing any of the four weapon modes. Replay and Random Map follow the selection rules above.
2. Both banks have equal playable area on every map. Neither fighter can stand inside a boundary wall, cross the channel, or become trapped by landed rocks or moving hazards.
3. Storm rain animates naturally. Mud visibly forms or grows within a cap, slows either fighter's walking, and leaves dodge distance and invincibility intact.
4. Lightning displays its exact impact area before hitting both banks with equivalent timing and strength. A player can avoid it by moving or dodging. Tornadoes give readable paths, leave escape room, and do not overlap lightning.
5. Magma rocks arc from the volcanic source, hit marked ground, block walking and straight shots while intact, and can be destroyed or expire. Volcanic fire shows its source-to-impact animation and stops damaging when it fades.
6. Ash reduces distant visibility on both banks and passes naturally. It never hides the own fighter, HUD, or active hazard telegraphs.
7. The Tower remains central and behaves consistently across all maps. Its shield, launches, retaliation, and weapon-mode rules work over water and magma without visual layering or collision errors.
8. The computer moves around mud, rock cover, and active hazard areas without getting stuck, and observes the same damage, slow, and dodge rules as the player.
9. Pause, replay, menu return, sound toggle, death sequence, and game result work during every hazard state. No timers, ambient audio, or particles continue running while paused.
10. Production build and simulation tests pass. Phone-sized browser checks cover every map and mode, and physical iOS/Android playtests confirm controls, visibility, audio, and acceptable frame rate before Phase 5 is called complete.

## Out of scope

Online player versus player, character selection, new weapons, extra inventory slots, additional rounds, persistent progression, and hazards that move pickups or bend shots are outside Phase 5.
