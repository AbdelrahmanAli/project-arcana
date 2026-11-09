# Release review — 2026-11-09

## Corrections and maintenance

- Missile altitude now eases into and out of cruise without reversing its projected flight or nose direction on the upper bank. Body and exhaust share the same trajectory helper.
- Online checkpoints preserve hazard hit sets, AI maps, and infinite timer sentinels. Restored four-fighter matches continue identically on all five maps in regression tests.
- Disconnecting, reconnecting, or restoring a room clears held movement and fire inputs. Transient actions are still consumed once per simulation tick.
- The match-type menu fits the 667 × 375 landscape viewport without clipped controls.
- Each GitHub Pages run attempt uploads and deploys an explicitly matching artifact name, avoiding collisions with artifacts from earlier attempts.
- Updated the native tooling's rimraf dependency and its glob/minimatch dependencies to patched versions within the parent's supported range. The complete pnpm audit reports no known vulnerabilities.
- Added the reconnect regression to `pnpm online:smoke`. Visual captures now use a development-only nonlethal fixture, so an idle fighter dying early cannot stall the capture test. The fixture is not shipped.

## Verification

- 168 unit and simulation tests pass; production Vite build and whitespace checks pass.
- Captured and inspected all five maps in 1v1 and 2v2, checking cover, fighter HUDs, projectiles, weather layers, and control bounds. No runtime errors or horizontal overflow occurred in these captures.
- Menu checks pass at 1440 × 900, 390 × 844, 360 × 640, 320 × 568, 844 × 390, and 667 × 375.
- Combat UI checks pass on desktop, phone, and landscape: charge, ammunition, dodge, sound, pause, results, replay, and control placement.
- Local authoritative-room checks cover 1v1, co-op, four-human 2v2, per-seat lower-bank views, invitation layouts, movement, one-shot dodge input, completed rematches, and clearing held inputs on reconnect.

These are Chromium and emulated-viewport checks, not a guarantee of zero defects. Physical iOS/Android and Safari testing, sustained public-server load/abuse testing, and listening tests on real phone speakers remain release checks. Art/audio licensing should also be confirmed before a commercial store release.

## Previous review — 2026-11-02

Reviewed fighter animation, pickup and cover depth, projectile layers, environmental occlusion, HUD placement, online bank projection, and release build behavior.

## Corrections

- The local laser charge bar follows the connected fighter's seat, including the second co-op player and upper-bank guests.
- Death poses reset inherited sprite flips and sort using the body's displayed position during its fall.
- Combat particles and charge effects render below clouds and avalanches.
- Online Magma smoke uses the same projected coverage for rendering and visibility checks.
- Online Snow icicle sprites and markers use mirrored impact offsets matching server damage positions.
- Platform water contact follows a narrow curved hull edge instead of drawing a rectangular patch across the river.

## Verification

- 138 model, animation, projectile-depth, and network regression tests pass.
- All five maps captured and visually inspected in 1v1 and 2v2; no runtime errors or horizontal overflow in these runs.
- Production Vite build succeeds.
- Narrow phone (390 × 844) and landscape (844 × 390) captures keep all combat controls within the viewport.
- Browser checks cover co-op and four-human team selection, invitations, local HUD identity, and lower-bank perspectives.
- `scripts/audit-visuals.mjs` provides repeatable local captures and control-bound checks. Run against Vite using `DIVISION_DEV_URL`; optional `AUDIT_WIDTH` and `AUDIT_HEIGHT` choose viewport size. Positional arguments select format and map.

These checks cover desktop Chromium and emulated viewport sizes. They do not replace physical iOS/Android device testing, Safari testing, or sustained multiplayer load testing. No claim of zero remaining defects is made.
