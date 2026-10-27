# Phase 6 art and animation

The original generated images are in `docs/art-source/phase6/`. The game loads the compact assets in `public/art/phase6/`. Run `scripts/prepare-phase6-art.py` with Pillow and NumPy to rebuild the runtime sheets and the two WebP arenas. The source artwork was made with built-in image generation; the arena prompts used the original Riverside art as a geometry reference, and the hazard prompts requested transparent, arcade pixel-art animation sequences.

| Runtime asset | Frames | Cell size | Use |
| --- | ---: | ---: | --- |
| `eagle-frames.png` | 6 | 128 × 128 | Descent, wingbeats, strike and climb |
| `scorpion-frames.png` | 6 | 128 × 128 | Emerge, windup, strike and retreat |
| `quicksand-frames.png` | 4 | 128 × 96 | Persistent closed patch, opening and active pit |
| `sandstorm-frames.png` | 6 | 480 × 164 | Moving sand front and body |
| `mirage-frames.png` | 4 | 64 × 64 | Heat shimmer under fake pickup |
| `ice-patch-frames.png` | 4 | 128 × 88 | Icy glint and slide surface |
| `avalanche-river-frames.png` | 4 | 256 × 192 | Rolling avalanche front in three overlapping sections, oriented toward the river |
| `hail-cloud-frames.png` | 4 | 160 × 112 | Large overhead cloud moving across each bank |
| `hail-icicle-frames.png` | 6 | 96 × 192 | Three smaller staggered icicles per marked cluster, each with a ground shatter |
| `arena-snow.webp` | — | 1024 × 1536 source | Frozen river without a baked-in Tower circle |
| `rock-barrier-snow.png` | — | Wide strip | Snow-covered outer bank wall |

The two 1024 × 1536 arena sources preserve the current top bank, middle channel and bottom bank positions. Desert replaces the channel with a deep dry crack; Snow freezes it. The Tower, fighters, pickups, cover and hazards are separate objects in the Pixi scene. Animation frame selection uses simulation time, so pause holds each pose and resume continues smoothly. The preparation script normalizes transparent frame bounds so in-game size and contact points remain stable.

## Image generation prompt set

1. **Desert arena:** edit the existing arena into level yellow sand on both equal banks; retain exact channel geometry, Tower center and wall locations; put a deep dry crack in the channel; use stone mountains at the perimeter and sparse cacti and palms; detailed original arcade pixel art, no fighters or HUD.
2. **Snow arena revision:** preserve the snowy banks and impassable frozen river, but replace the former circular Tower opening with continuous cracked ice. The Tower and its base are separate rendered objects.
3. **Desert hazard sheets:** transparent pixel-art sequences for a brown eagle flapping and diving, a dark scorpion emerging and striking, a golden quicksand spiral opening and closing, and a broad blowing-sand front.
4. **Snow hazard sheets:** transparent pixel-art sequences for a broad rolling avalanche moving from a bank's outer edge toward the river, a large overhead hail cloud, falling icicles with ground shatters, and an icy ground patch with moving glints. Edit the blocking wall into snow-capped stones and frosted plants while retaining its transparent strip shape.

The preparation script derives the small mirage shimmer and legacy hail impact frames from code-native shapes. The new icicle sheet keeps each frame's vertical travel and shared ground contact. Neither these sheets nor the generated images contain art extracted from another game.
