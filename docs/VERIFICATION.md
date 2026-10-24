# Project ARCANA verification

Verified 2026-10-24.

- Fourteen automated model tests pass: pickup eligibility/capacity, depleted-slot fallback, independent paired drops, expiry after landing, shield and retaliation lifecycle, continuous tower motion and exactly one launch per cycle, traveling flame reach, captured explosive targets, laser charge, bank bounds and movement normalization, swept projectile collisions and cancellation, delayed round end/reset, and a seeded autonomous match.
- Vite production build succeeds.
- Local preview responds with HTTP 200.
- In-app browser: main menu and Settings open, artwork loads, match starts, movement and firing work, supply pickups populate the inventory, and selection changes the equipped weapon.
- In-app browser: player's health is below inventory; opponent's health and equipped weapon follow their head; the opponent pickup toast, tower, bubble shield and flame effects render.
- Generated atlas has real transparency (RGBA, alpha range 0–255).
- `prototype-preview.png` is an actual screenshot of the running game, not the generated visual target.
- Tower/HUD revision: both health bars have twenty rectangular cells. The tower has a fixed base with a separately rising shaft, water runoff and moving river highlights. Weapon slots show enlarged tilted imagery above visible arena terrain. Fire and explosion effects use generated animation sheets.
- Visual correction: the tower now uses a complete retracted-cap sprite, the river scrolls a textured water layer, the shield has a closed spherical outline, and flames and straight projectiles render behind the tower and soldiers. The lower arena has a stone wall that visually closes the playable bank before the weapon controls.
- Tower staging correction: the cap is raised, its foreground lip masks the lower shaft, and a narrow central aperture reveals the machinery from inside the base before the launch arms clear the rim. Foam and widening ripples continue around the footing at rest. Paired weapon launches begin from the upper ports above the cap.

Not yet verified on physical iOS/Android hardware. Simultaneous two-finger input, browser audio unlock, device performance, notch/safe-area behavior, and portrait/landscape transitions still need real-device playtesting. Balance, AI difficulty, and animation quality remain prototype-level.
