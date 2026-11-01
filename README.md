# Division

A single-round arena game for phones and desktop. Fight across two equal banks in 1v1 or 2v2 against computer-controlled fighters. A low military platform in the channel supplies both sides; on Riverside, its vents also fire two aimed waves per supply cycle.

Built with PixiJS 8, Howler.js, and Vite. The same client has Capacitor Android and iOS projects. A Cloudflare Worker and Durable Object room service now run server-owned invite matches locally; the online menu and public multiplayer release are still in development. The committed interface and release architecture is in [Platform and interface decision](docs/PLATFORM_AND_INTERFACE.md).

## Run locally

Use Node 22.12 or newer and pnpm 11.25. Run `pnpm install`, `pnpm dev`, and open the printed URL. `pnpm test` runs the combat and room protocol tests; `pnpm build` creates the current GitHub Pages site in `dist/`.

`pnpm build:native` creates a relative-path web bundle for Capacitor. Run `pnpm exec cap sync android` or `pnpm exec cap sync ios` to copy it into the corresponding native project. Native online play needs `VITE_MATCH_SERVER_URL` set to the deployed HTTPS match host at build time. Android builds require Android Studio and SDK; iOS builds require macOS and Xcode.

`pnpm build:cloudflare` builds for the Cloudflare root URL. `pnpm online:dev` starts the Worker and local room service. While it runs, `node scripts/smoke-room.mjs` verifies separate 1v1 and 2v2 WebSocket fighters. `pnpm online:deploy` builds and deploys the web assets and API together once Cloudflare account access is configured.

## Publish

The GitHub Pages base path remains `/project-arcana/`, so the site stays at [abdelrahmanali.github.io/project-arcana](https://abdelrahmanali.github.io/project-arcana/). Pushing to `main` runs the [Deploy Division](.github/workflows/deploy.yml) workflow. The public URL can be renamed separately if the title becomes final.

## Controls

- On a phone, drag anywhere in the arena to move. The right-side buttons fire the pistol, dodge, and fire the carried special weapon. Separate fingers can move and fire together.
- On desktop, use WASD or arrows to move, Space for pistol, Shift to dodge, E for the special weapon, and Escape to pause.
- The pistol starts in auto-fire mode unless changed in Settings. Tap once to stop auto-fire; hold for half a second to restore it. Hold E or the special button for up to 1.1 seconds to charge the Laser Gun.
- Walk over supplies to collect them. Each fighter carries one special weapon. A matching pickup adds its ammo without a cap; another type remains on the ground until the held weapon is spent. Syringes heal up to 20 HP.

## Match rules

Choose 1v1 or 2v2, one of four weapon modes, and Riverside, Storm, Magma, Desert, Snow, or a random map. The game has six fighters, six special weapons, destructible crates, explosive barrels, and map-specific hazards. Each platform launch supplies one weapon per bank in 1v1 or two per bank in 2v2, with an independent small chance of an extra syringe on each side. Pickups last 12 seconds after landing. The platform never blocks fighter shots.

The platform cycles through idle, prime, launch, second attack, and settle poses. Only Riverside uses its two attack waves; the other maps use their own hazards. Direct shots and beams can cross the center. Missile and grenade arcs keep their overhead trajectory.

## Project structure

- [Match simulation](src/model.js) owns combat, hazards, AI, pickups, and platform timing.
- [Online room service](server/worker.js) owns invite seats, input validation, simulation ticks, and snapshots.
- [Online client transport](src/online.js) provides the same room connection for browser and native builds.
- [Platform geometry and animation](src/platform.js) defines port locations, vent locations, cycle timing, and eight-frame poses.
- [Pixi rendering and controls](src/main.js) loads sprite sheets and draws the game.
- [Howler audio](src/audio.js) contains the calm platform cue and combat sounds.
- [Phase 8 art sources](docs/art-source/phase8/) and [optimized sprite sheets](public/art/phase8/) contain the original platform art and launch effect.
- [Phase 8 PRD](docs/PHASE_8_PRD.md) records the design and acceptance criteria. Earlier phase documents remain in `docs/` as history.

The platform artwork, maps, and fighter sprites are project assets. The hawk call is credited in the in-game Settings panel.
