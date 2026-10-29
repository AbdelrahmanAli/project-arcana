# Phase 7 fighter art

The six fighters are Elias, Dorian, Tomas, Nadia, Imani, and Mara. Each has an original standing/action sheet, dive-roll sheet, and death sheet. These PNGs are the editable high-resolution sources. The game loads the smaller WebP atlases in `public/art/phase7/`.

- Standing/action: 4 columns × 4 rows. Rows 1–2 face south and north, with idle, two walk frames, and pistol fire. Rows 3–4 face south and north, with equipped fire, laser charge, hit, and stun.
- Dive roll: 4 columns × 8 rows. Each row contains four successive frames for one of the eight movement directions, ordered by the game’s `dodgeDir` index.
- Death: 4 poses × 2 rows. The first row falls while facing south; the second faces north. The last frame is the grounded corpse. The generated poses are not spaced in equal columns, so `deathCuts` in `src/characters.js` records each row's actual three split points in the 768-pixel WebP atlas. Cutting at equal quarters clips limbs and blends neighboring poses.
- Rendered standing size: 78 × 78 game units. Roll size: 68 × 68. Death poses use their actual cropped widths and each fighter's `deathScale`, measured against the visible standing art. This keeps the body roughly the same apparent size through the fall, including the grounded pose. All sprites use a centered anchor. The simulation draws an oval foot shadow only for standing fighters; roll frames contain their own contact shading.
- Animation uses simulation time, so pause freezes it. The death sequence advances at 0.18 seconds per frame, with a short crossfade between poses.

`mara-pink-hair-source.png` replaces `mara-source.png` as Mara’s standing/action source. It restores her pink ponytail in both bank-facing rows. The roll and death sources also include her pink hair.

The `*-frontfire-source.png` sheets contain corrected pistol and special firing poses for every fighter. The front-facing gun points down-screen and the back-facing gun points up-screen, matching the game's straight projectile path. Image generation supplied the four new firing poses per fighter; the game atlas preserves the existing idle, walk, hit, and stun poses. Adjacent charge cells were also refreshed where the old horizontal muzzle effect crossed a cell boundary. The game loads `*-frontfire.webp`.
