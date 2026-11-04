# Illustrated menus

The menu is a separate, full-screen scene. Combat layout and Pixi rendering remain independent. `src/game-menus.css` owns the menu presentation; existing menu IDs and match configuration remain stable.

## Artwork

Created with the built-in image generation tool on 2026-11-04. Original 1536 × 1024 images were converted to WebP at quality 90, without rescaling. Combined download size is approximately 602 KiB. Text, controls, fighter sprites, and weapon sprites are rendered separately and remain interactive.

- `public/art/ui/division-title.webp`: title-screen illustration.
- `public/art/ui/hangar.webp`: character, weapon, map, and settings backdrop.

### Title illustration prompt

Finished military arcade game menu background, detailed hand-painted pixel-art aesthetic, two riverbanks and a low circular supply platform. Blue helmeted soldier and pink-haired woman on the right, distant red opponent, sunset ochre and teal. Quiet dark teal left 55 percent for title and menu controls. Original polished game artwork with crisp textured details. No tall tower, text, logo, or UI.

### Hangar illustration prompt

Use case: stylized-concept. Finished 1536x1024 landscape background asset for a military arcade game's character, weapon and map selection screens. Hand-drawn highly detailed arcade pixel-painting, original art, crisp textured metal and painterly atmospheric shadows, polished game art. Interior of a submerged military platform supply hangar: dark navy steel bulkheads, heavy industrial pipes, hanging utility lamps at the edges casting amber light, muted teal rim light, a broad metal grated floor with perspective leading towards the center, subtle floor markings, crates and weapon racks pushed to far left and far right edges, open central floor as an empty staging area. Center 75 percent should be low contrast very dark charcoal teal, uncluttered so actual character sprites and map art can be overlaid in the game. Background has depth and personality, weathered material and beautiful incidental details, not a flat gradient. No people, no text, no numbers, no letters, no logos, no UI panels, no button shapes, no watermark. Full bleed composition. Matching a cinematic warm amber and deep blue-green military game title screen.

## Verification

`node scripts/audit-menus.mjs` walks the computer-match setup and settings on desktop, portrait phones, small phones, and landscape phones. It captures screenshots under `test-output/menus`, checks control bounds and arena isolation, selects characters, and starts a match. `DIVISION_DEV_URL` overrides its default development URL.

Online browser smoke scripts cover the invite and match-start flow using the same menu controls.

## Combat interface

`src/combat-ui.css` extends this art direction to the toolbar, fighter HUDs, touch controls, countdown, pause screen, results, and desktop surround. It preserves existing touch targets, positions, ammo/cooldown meter bindings, health anchors, and combat input handlers.

`public/art/ui/combat-bezel.webp` is a transparent, painted metal control rim created with the built-in image generator. Both the center opening and outside retain alpha transparency. The generated PNG was converted to WebP without rescaling. Icons, labels, ammo values, and progress rings remain separate live elements.

### Control bezel prompt

Create one finished game UI asset: a front-facing circular military arcade control bezel, centered on a transparent square canvas. The center opening and the outside background must both be fully transparent. This is a thin ring frame for a mobile action-game button, not an illustration of a button on a panel. Outer diameter 90 percent of canvas; inner hole diameter 74 percent of canvas. Original high-quality hand-painted pixel-art metalwork, weathered blue-black gunmetal, subtle warm brass edge highlights, beveled industrial rim with four tiny inset bolts and machined segments, restrained scratches. Match detailed military arcade sprite art with clear readable silhouette at 64 pixels. Uniform straight-on orthographic view, no perspective tilt, symmetrical. Empty transparent center for an icon and label to be rendered by code. No icon, no words, no numbers, no background, no UI mockup, no drop shadow beyond the rim, no glow filling the hole. Only one ring.

### Combat checks

`node scripts/audit-combat-ui.mjs` checks phone, desktop, and landscape combat controls, laser charging and ammo, dodge, mute, pause/resume, results, and replay. It saves screenshots under `test-output/combat-ui`. Its deterministic fixture hook is added only to an intercepted development response, not to production code. Set `DIVISION_DEV_URL` to use another local development URL.
