# Division release architecture and interface decision

**Decision:** One PixiJS game client ships on the web and inside Capacitor Android and iOS projects. Cloudflare Workers serves the public web build and API; one Durable Object owns each invite match and runs the existing `Match` simulation. Howler remains the audio layer. We will not rewrite the game in Flutter or run combat state through Firebase.

This is a committed design for the interface, native releases, and online multiplayer. The current GitHub Pages URL remains the public playable build until the Cloudflare service and clients are connected; it is not the target online host.

## Interface contract

- **Screens are separate scenes:** title, play type, rules, mode, map, weapon, fighter lineup, invite room, settings, and results. A menu never overlays a live arena or displays combat HUD and touch buttons behind it.
- **PixiJS draws the game UI:** authored sprite sheets for frames, focus states, buttons, map dioramas, fighter portraits, weapon turntables, particles, and transitions. HTML remains for accessibility, text entry, screen-reader labels, and platform controls. No separate game UI library or Flutter layer is introduced.
- **One featured choice at a time:** map and weapon selection use a left/right animated carousel with direct tap and keyboard controls. Character selection uses six illustrated portraits and a `?` random tile. Mode selection uses illustrated cards that fit in the scene without scrolling. There are no dropdowns or long scrolling lists.
- **Visual feedback:** every selection has a focus pose, short sound, transition, and confirmation state. Random map and weapon choices retain their visible spin. The same interaction and hit areas work on phone and desktop.
- **Safe areas and scaling:** render UI inside a design-space scene with safe-area insets and minimum touch targets. Letterboxing may protect composition; the arena itself still uses the available screen width. Test portrait phones, landscape phones, tablets, and desktop before release.

## Runtime boundary

```
PixiJS/Howler client ── input packets ──► Cloudflare Worker ──► match Durable Object
       ▲                                                     │
       └──────────── authoritative snapshots and events ◄───┘
```

- `src/model.js` owns movement, collision, weapons, hazards, AI, and match results. Both the solo client and online room use this module. An input array is indexed by fighter seat; local computer seats retain the existing AI.
- The server assigns a private seat token when a player joins an invite room. A WebSocket connection is bound to that seat. Clients send only movement and button states, never positions, hits, health, pickups, or results.
- The room advances the match at 60 simulation ticks per second and broadcasts snapshots at 20 per second. Rendering interpolates between snapshots. A disconnect pauses the room and the same seat token can reconnect.
- The first and second seats start on opposite banks. In 2v2, seats three and four join their respective teams. All four are separate phone/browser clients. The match still ends when the last fighter on one team falls.
- The browser build uses the same origin for the API. Native builds set `VITE_MATCH_SERVER_URL` to the HTTPS Cloudflare host. Invite links open the web client and can be handled by app links in the native packages.
- Room IDs are unguessable UUIDs. Seat tokens are private. The Worker validates room options; the room clamps movement and accepts only known button fields. Before public online release, add admission expiry, origin/rate controls, reconnect expiry, versioned packets, latency compensation, and abuse monitoring.

## Build and hosting contract

| Target | Build | Distribution |
| --- | --- | --- |
| Web | `pnpm build:cloudflare` | Cloudflare Worker static assets and API on one origin |
| Android | `pnpm build:native` then `pnpm exec cap sync android` | Capacitor Android project, Google Play build/signing |
| iOS | `pnpm build:native` then `pnpm exec cap sync ios` | Capacitor iOS project, Xcode/App Store build/signing |

`pnpm build` retains the existing `/project-arcana/` GitHub Pages build during migration. The Cloudflare Worker and Durable Object are defined in `wrangler.jsonc` and `server/`. Android and iOS source projects are checked in; generated web bundles and signing keys are ignored. iOS compilation and store submission require macOS/Xcode and developer accounts.

The native apps ship the actual game, saved settings, touch controls, local solo play, online invite flow, and platform-specific full-screen/safe-area behavior. They are not a thin link to a website.

## Release acceptance

1. Each menu screen is a composed, animated scene with illustrated choices and no live combat layer underneath. Map, weapon, and fighter selection are usable without scrolling on phone and desktop.
2. The same content and settings work in web, Android, and iOS builds. A physical device test covers controls, audio unlock, loading, safe areas, performance, suspend/resume, and reconnect.
3. Two separate devices can join a 1v1 invite, and four can join a 2v2 invite. The server determines every hit, pickup, hazard, and result. Both banks see the same state through latency, reconnects, and a complete round.
4. Cloudflare serves the web build and match API on one origin. The GitHub Pages address redirects or is retired only after the Cloudflare release passes device and multiplayer testing.

## Implementation record

- Native Android and iOS projects, build targets, and Cloudflare Worker configuration are in this repository.
- The match now accepts independent human controls for two or four seats, with tests.
- The room service can create rooms, assign seats, accept separate WebSockets, and advance a server-owned match; a local two-client smoke test covers the full path.
- The current menu has been structurally separated from the arena. Its illustrated Pixi scene and carousel controls, online menu wiring, interpolation, and store release validation remain work against the acceptance criteria above.
