# The Tower Deal — playable combat prototype

A single-round, browser-based riverbank duel. Built with PixiJS 8, Howler.js, and Vite. The game currently runs against a computer opponent; it does not need a gameplay server.

“When certainty falls, adapt.” The Tower of Major Arcana XVI has dealt its card to two fighters on opposite banks. Across the river stands the life each must take to keep their own. Its paired but independently random weapon drops can overturn either fighter's plan, and striking it can set both banks on fire. The player starts on an assigned bank; bank selection is not a game mechanic.

## Run

Node 22.12+ recommended. Install dependencies with `pnpm install`, then `pnpm dev`. Open the printed local URL. `pnpm build` creates a static deployment in `dist/`. `pnpm preview` serves that build. `pnpm test` runs the combat-rule tests.

The dev server binds to the local network for phone testing. A phone on the same Wi-Fi can open the printed Network URL if the computer firewall allows it. The GitHub Pages deployment is configured below; multiplayer is not yet implemented.

## Publish on GitHub Pages

The live game is configured for `https://<username>.github.io/project-arcana/`. The existing repository slug remains `project-arcana` so its published URL keeps working. Push to `main` to run the included workflow, which tests, builds, and deploys `dist/`. In the repository's **Actions** tab, you can also run **Deploy The Tower Deal** manually.

The `/project-arcana/` base path is set in `vite.config.js`; if the repository name changes, update it there too. Use `pnpm preview` to check the production build locally. GitHub Pages hosts the current computer-opponent game as static files; online multiplayer will need a separate real-time service later.

## Controls

- Phone / mouse: drag anywhere in the arena to create a floating joystick. Three transparent buttons on the right dodge, fire the held Tower weapon, and fire the unlimited pistol. Another finger can dodge or fire while moving. Hold and release the middle button for the Laser Gun; full charge takes 1.1 seconds and raises its damage from 16 to 46.
- Desktop: WASD or arrows to move; Shift dive rolls in the movement direction; Space fires the pistol; E fires the Tower weapon; Escape pauses. Hold and release E to charge the Laser Gun.
- A dive roll moves in one of eight directions (forward when standing still), avoids damage and stun for its 0.46-second animation, and has a 2.2-second cooldown. Its button ring fills as it recharges; the Tower weapon ring drains with its ammo. Tapping an unavailable dodge or empty Tower weapon button plays a short feedback sound. Solid cover and bank edges stop roll movement.
- Walk over a landed pickup to collect it. Each fighter can carry one Tower weapon. A matching pickup adds its full ammo with no cap; a different weapon cannot be collected until the current one is spent. There is no discard or swap action. A healing syringe from a broken crate restores up to 20 health without using the weapon slot.

## Implemented

Main menu with settings and three computer-opponent modes: independently random weapons, one randomly fixed weapon, or one player-chosen fixed weapon for the match. Both fixed modes deal the same type to both banks and include the Nuclear Launcher. The game has one health-based round, an unlimited weak pistol, six pickup weapons, one carried Tower weapon, paired launches, twelve-second pickup expiry (blinking in the final three), tower rise/delivery/descent, one retaliation per cycle, absorbing bubble shield, moving flame jets and temporary ground fire, projectile cancellation, Laser Gun beam, smart missile ground target with a dedicated launch sound, stun grenades that deal light damage and immobilize a fighter for 2.2 seconds, nuclear grenades that leave damaging waste, longer death sequence, game over, restart, sound toggle, pause, and automatic pause on focus loss.

Both fighters have eight-direction dive-roll animations. The computer opponent can use a roll to evade an incoming explosive.

Each round places two mirrored T, L, or square crate formations near the river on each bank and one or two barrels at independent positions across each bank. Intact crates block movement and shots, crack on the first direct shot, and break on the second; explosions destroy them immediately. Fully broken crates have a 30% chance to release a weapon, a 15% chance to release a 20-health syringe, and a 55% chance to release nothing. Broken crates leave passable debris. Barrels do not block movement, but they block shots and explode when hit, damaging either fighter in a wide radius and potentially setting off other barrels. A nuclear impact rises into a mushroom cloud, then leaves permanent waste that damages either fighter who stands in it. Fighters blink green while taking waste damage and red while burning.

The player's health is below the expanded arena. The opponent's health and held Tower weapon float above their head; their weapon badge fills a charge meter while they wind up a laser shot. Missiles and grenades mark their captured landing area in the weapon's color. A charging laser alternates red and white on its wielder and charge bar. Both banks now have equal playable depth.

Current weapon and hazard values are listed in [`docs/BALANCE.md`](docs/BALANCE.md).

## Structure

- `src/model.js`: rendering-independent match simulation, also used by the tests.
- `src/main.js`: Pixi scene, pointer/keyboard controls and HUD.
- `src/phase3.css`: transparent dual-fire controls and expanded arena layout.
- `src/phase4.css`: mode selection and healing feedback styles.
- `src/audio.js`: Howler playback for the game's effects, including a CC0 smart missile sound and synthesized prototype effects.
- `public/art/`: generated environment, sprite atlas and visual target.
- `docs/art-archive/`: unused source art retained for reference without adding it to the published game.
- `docs/DESIGN.md`: decisions, tuning proposals, and future scope.
- `docs/ART_PROMPTS.md` and `docs/ART_PROMPTS_V2.md`: original asset-generation prompts.
- `docs/DEATH_SPRITES.md`: death-frame art and generation prompts.
- `docs/PHASE_2.md`: implemented nuclear launcher and destructible-arena rules, plus sprite details.
- `docs/PHASE_3.md`: one-weapon rules, dual-fire controls, and larger symmetric arena.
- `docs/PHASE_4_PRD.md`: crate loot, healing, and three computer-opponent mode requirements.
- `docs/PHASE_4_ART.md`: healing syringe source prompt and asset notes.

## Current limits

This is a playable prototype, not a finished release. Animation frames need pixel cleanup and foot-position alignment. Soldiers currently share a generic equipped-gun pose; pickup icons and projectiles vary by held weapon. Death now has four sprite poses per soldier, while some blood effects remain procedural. Most sound is synthesized prototype audio; no soundtrack yet. Third-party sound sources are recorded in [`docs/AUDIO_SOURCES.md`](docs/AUDIO_SOURCES.md). AI and weapon balance are initial tuning. No multiplayer, character selector, alternate maps, save progression, or controller support. Touch controls are implemented but still need testing on physical iOS and Android phones.

The original visual-target image contains the earlier HUD concept; the live game implements the revised health-bar layout. Artwork is original generated imagery inspired by detailed arcade military pixel art, not extracted game assets.
