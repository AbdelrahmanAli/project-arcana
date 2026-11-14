# Release operations

## Rights check (2026-11-14)

- Runtime fighter, map, hazard, platform, interface, and boss artwork is recorded as project-generated art under `docs/art-source/`, `docs/ART_PROMPTS.md`, and the phase art notes. Boss sources and their WebP exports are listed in `docs/art-source/bosses/README.md`. The shipped `public/art/visual-target.png` is also documented as generated; it is a study image and is not loaded by the game. [OpenAI's terms](https://openai.com/policies/terms-of-use/) assign output rights to the user as between the user and OpenAI, subject to applicable law. They do not clear possible third-party rights in image references or similar output.
- Anton and Courier Prime are distributed with their SIL Open Font License texts in `public/fonts/`; keep those notices in native packages.
- The two bundled recordings and their terms are listed in `docs/AUDIO_SOURCES.md`; the remaining sounds are synthesized in `src/audio.js`.
- This inventory supports the current web release. Before commercial store submission, obtain a human rights review of the generated art and its visual references, and preserve source/license evidence for every asset. The repository does not establish ownership of any external image used only as a style reference.

## Capacity check (2026-11-14)

The live Cloudflare Worker handled eight simultaneous 1v1 rooms (16 WebSockets) for 12 seconds. Clients received 5,275 state packets and none disconnected unexpectedly. This is a modest functional concurrency check, not a load limit or proof of performance at scale. A larger staged test needs latency/error metrics, realistic player input and match duration, and a defined expected player count before advertising capacity.

## Rollback procedure

1. Identify the last known-good Git commit and Cloudflare Worker version. `node node_modules/wrangler/bin/wrangler.js deployments list` lists deployed versions. Keep the previous known-good version ID in the release record.
2. If a live Worker release fails, run `node node_modules/wrangler/bin/wrangler.js rollback <known-good-version-id>` from this repository. Wrangler prompts before changing traffic. Verify the game page, assets, room creation, and a two-client match after rollback. Existing Durable Object storage is not rolled back, so validate compatibility of saved rooms; Cloudflare also restricts rollback across incompatible binding or class changes. [Cloudflare rollback guide](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
3. Restore the GitHub Pages mirror by reverting the faulty commit on `main` and pushing the revert. Its workflow installs, tests, builds, and deploys that commit. Confirm the workflow succeeds and the mirror serves the expected asset hashes. Avoid rewriting published history.
4. Fix or revert the faulty code on `main` as well, so the next Cloudflare deploy cannot accidentally reintroduce it. For a bad static asset, hard refresh during verification because browsers may retain older HTML and assets.

The rollback commands and a prior Worker version were verified as available; no live rollback was executed because it would interrupt current players. Last verified prior Worker version: `5f587299-8aed-40d6-ab25-d71641739c3d` (2026-11-05). Recheck the deployment list immediately before using it.
