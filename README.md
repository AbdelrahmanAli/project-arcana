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

- Phone / mouse: drag anywhere in the arena to create a floating joystick. Use another finger to tap a weapon slot or hold FIRE without stopping movement. Hold FIRE to shoot repeated ordinary shots. Hold and release FIRE for the Laser Gun; full charge takes 1.1 seconds and raises its damage from 16 to 46. The muzzle, selected slot, FIRE button, and beam show the charge.
- Desktop: WASD or arrows to move; Space to fire; 1/2/3 to select a slot; 0 for the pistol; Escape to pause.
- Tap an equipped slot again to return to the pistol.
- Walk over a landed pickup to collect it. A full inventory rejects pickups. Use all ammunition to free a slot; there is no discard or swap action.

## Implemented

Main menu with settings, one health-based round, computer opponent, unlimited weak pistol, six pickup weapons, three inventory slots, paired independent random drops, twelve-second pickup expiry (blinking in the final three), tower rise/delivery/descent, one retaliation per cycle, absorbing bubble shield, moving flame jets and temporary ground fire, projectile cancellation, Laser Gun beam, smart missile ground target, stun grenades that deal light damage and immobilize a fighter for 2.2 seconds, nuclear grenades that leave damaging waste, longer death sequence, game over, restart, sound toggle, pause, and automatic pause on focus loss.

Each round places mirrored T, L, or square crate formations near the river and one or two barrels at independent positions across each bank. Intact crates block movement and shots, crack on the first direct shot, and break on the second; explosions destroy them immediately. Broken crates leave passable debris. Barrels do not block movement, but they block shots and explode when hit, damaging either fighter in a wide radius and potentially setting off other barrels. A nuclear impact rises into a mushroom cloud, then leaves permanent waste that damages either fighter who stands in it. Fighters blink green while taking waste damage and red while burning.

The player's health is below the inventory. The opponent's health and equipped weapon float above their head; their weapon badge fills a charge meter while they wind up a laser shot. Missiles and grenades mark their captured landing area in the weapon's color. A charging laser alternates red and white on its wielder and charge bar.

## Structure

- `src/model.js`: rendering-independent match simulation, also used by the tests.
- `src/main.js`: Pixi scene, pointer/keyboard controls and HUD.
- `src/audio.js`: original synthesized placeholder effects, played through Howler.
- `public/art/`: generated environment, sprite atlas and visual target.
- `docs/DESIGN.md`: decisions, tuning proposals, and future scope.
- `docs/ART_PROMPTS.md` and `docs/ART_PROMPTS_V2.md`: original asset-generation prompts.
- `docs/DEATH_SPRITES.md`: death-frame art and generation prompts.
- `docs/PHASE_2.md`: implemented nuclear launcher and destructible-arena rules, plus sprite details.

## Current limits

This is a playable prototype, not a finished release. Animation frames need pixel cleanup and foot-position alignment. Soldiers currently share a generic equipped-gun pose; pickup icons and projectiles vary by selected weapon. Death now has four sprite poses per soldier, while some blood effects remain procedural. Sound is synthesized placeholder audio; no soundtrack yet. AI and weapon balance are initial tuning. No multiplayer, character selector, healing, alternate maps, save progression, or controller support. Touch controls are implemented but still need testing on physical iOS and Android phones.

The original visual-target image contains the earlier HUD concept; the live game implements the revised health-bar layout. Artwork is original generated imagery inspired by detailed arcade military pixel art, not extracted game assets.
