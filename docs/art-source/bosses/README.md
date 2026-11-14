# Boss art source

The five `*-sheet.png` files are generated transparent 4 × 2 pose atlases for Siegebreaker, Night Wraith, Cinder Giant, Dune Maw, and Frost Colossus. The five `*-attacks.png` files are transparent 4 × 1 sheets of each boss's four distinct impact effects. All ten were generated for this project; no external game art was copied into the runtime.

The game loads half-resolution WebP exports from `public/art/bosses/`. `node scripts/optimize-boss-art.mjs` recreates those exports from the source PNGs using nearest-neighbor downscaling and WebP compression. The source art stays here for later frame and anchor refinement. The boss pose order is idle A/B, attack preparation A/B, attack release A/B, hit/weak-point, defeated. The attack sheet order matches the four names in `src/boss-encounter.js` for each map.
