# Boss art source

Each of the five bosses has a transparent 4 × 2 `*-sheet.png` pose atlas and an 8 × 4 `*-motion.png` directional movement atlas. Movement columns run N, NE, E, SE, S, SW, W, NW; rows are consecutive motion frames. Each of the twenty named attacks has its own transparent 3 × 2, six-frame impact atlas. All of this art was generated for this project; no external game art was copied into the runtime.

The game loads compact WebP exports from `public/art/bosses/`. Run `node scripts/optimize-boss-art.mjs` to regenerate pose exports, and `node scripts/prepare-boss-atlases.mjs` to regenerate motion and attack exports from these PNGs. The latter preserves a shared scale and ground contact point across each motion atlas. The pose atlas order is idle A/B, attack preparation A/B, attack release A/B, hit/weak-point, defeated. The older `*-attacks.png` four-frame concept sheets remain here as source history and are no longer loaded by the game.
