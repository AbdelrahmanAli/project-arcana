# Release review — 2026-11-02

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
