# The Tower Deal verification

## Damage feedback — 2026-10-25

- All 48 simulation tests pass. Direct and lethal hits report the health actually lost; fire and nuclear waste report grouped integer damage without per-frame clutter.
- The production build succeeds, and a 360 × 728 phone preview shows the floating number beside a fighter without covering the HUD.

## Portrait phone width — 2026-10-25

- At a 360 × 728 viewport, the arena spans the full 360-pixel width with no side gutters. The menu, both fire controls, and the health footer remain visible.
- The portrait arena uses the available viewport height; pointer coordinates continue to map independently across the arena's width and height.

## Phase 3 — 2026-10-25

- All 47 simulation tests pass. New checks cover one-weapon capacity, independent pistol and Tower-weapon cooldowns, and an empty special-fire action.
- The Vite production build succeeds, and the changes pass `git diff --check`.
- Headless Chrome renders the menu and active match at 390 × 844 portrait and 844 × 390 landscape viewports. The arena, both transparent fire buttons, and health bar remain visible.
- A two-contact browser input check moved the fighter while the pistol fired twice. The special-fire button shows an empty state before a pickup.
- The expanded world is 480 × 940 units. Both fighters have 280 units of movement depth. The lower fighter reaches the foot of the river wall; the upper fighter stops before the taller upper wall. Both stop before the outer barriers.

## Phase cleanup — 2026-10-25

- All 46 simulation tests pass, including tower cycles, projectile interactions, navigation around cover, hazards, death, and a seeded autonomous match.
- The Vite production build succeeds.
- The generated site includes the active art and audio assets. Superseded death and crate studies are retained in `docs/art-archive/` instead of being deployed.
- HUD icon fitting now avoids repeated layout reads and style writes while the weapon and viewport stay the same.
- Starting a new round clears transient sprites and pickup toasts from the previous round.

## Earlier desktop checks

- Local preview responded with HTTP 200. In-app browser checks covered menu and Settings, match start, movement, firing, inventory pickup and selection, HUD positions, tower, shield, and flame effects.
- The generated sprite atlas has RGBA transparency. `prototype-preview.png` is a screenshot of the running prototype, while `public/art/visual-target.png` is the earlier art target.

Physical iOS and Android playtesting remains to be done, particularly native two-finger input, browser audio unlock, device performance, safe areas, and orientation changes. Balance and animation quality still need playtesting across longer matches.
