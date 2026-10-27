# Phase 5 art sources

The arena and hazard sprites were created with the built-in imagegen tool. The two arena backgrounds use `public/art/arena.png` as the edit reference so the bank walls, channel, and Tower opening keep the original geometry. Full-resolution PNG arena art and original transparent sprite outputs are preserved in `docs/art-source/phase5/`. The game serves compressed WebP arenas and smaller PNG sprites from `public/art/`; `scripts/prepare-phase5-sprites.ps1` crops and scales the sprite sources with nearest-neighbor sampling.

| Game asset | Source | Prompt brief |
| --- | --- | --- |
| `arena-storm.webp` | Edit of `arena.png`; source `docs/art-source/phase5/arena-storm.png` | Preserve exact 2:3 arena layout and empty banks; make it a moonlit rainy night with wet dark soil, silver reflections, and a dark teal river in crisp arcade pixel art. No characters, Tower, UI, or hazards baked into the ground. |
| `arena-magma.webp` | Edit of `arena.png`; source `docs/art-source/phase5/arena-magma.png` | Preserve exact arena geometry; replace river with flowing orange-red magma and banks with heat-lit volcanic stone, keeping open combat space and character contrast. No characters, Tower, UI, or active hazards. |
| `phase5-mud.png` | Generated transparent sprite | Irregular rain-soaked mud and shallow puddle decal, wider than tall, with wet blue moonlight reflections and footprints; avoid a circular shadow or oil-spill look. |
| `phase5-tornado.png` | Generated transparent sprite | Compact blue-gray twisting rain and dust vortex, slightly angled top-down view, readable at small world scale. |
| `phase5-tornado-frames.png` | Eight distinct frames derived from `phase5-tornado.png` | The painted cloud bands circulate within a fixed oval silhouette; the funnel sways while its foot stays planted. Built by `scripts/prepare-tornado-animation.py` after preparing the base sprite. |
| `phase5-lightning.png` | Generated transparent sprite | Tall forked white-cyan lightning bolt with a bright branching ground impact, readable at phone scale. |
| `phase5-lightning-frames.png` | Six distinct frames derived from `phase5-lightning.png` | Branches bend and vary in intensity through the strike while the impact point stays fixed. Built by `scripts/prepare-lightning-animation.py`. |
| `phase5-volcanic-rock.png` | Generated transparent sprite | Angular dark basalt solid-cover boulder with glowing magma seams, slightly angled top-down view. |
| `phase5-volcano-vent.png` | Generated transparent sprite | Low volcanic crater mouth with jagged black basalt rim and bright molten center, viewed from above, for the magma channel edge. |
| `phase5-ash-cloud.png` | Generated transparent sprite | Broad irregular charcoal volcanic smoke cloud with subtle ember glints, drifting from each vent over part of its bank. |
| `phase5-lava-projectile.png` | Generated transparent sprite | Compact airborne molten glob with a bright core, cooling crust, and a short droplet trail. |
| `phase5-lava-pool.png` | Generated transparent sprite | Wide flat lava splash with liquid orange core, dark crust rim, and small flame tongues, distinct from Tower flame strips. |

All prompts requested crisp 1990s arcade pixel art, no text or watermark, and transparent backgrounds for isolated sprites. Pixi plays the six lightning frames once during a strike, plays the eight tornado frames at 12 frames per second, and moves ash and lava sprites along simulation-controlled paths. The original full-size images are in `docs/art-source/phase5/`; `scripts/prepare-phase5-sprites.ps1` creates the smaller base sprites, then the two animation scripts create their sprite sheets.
