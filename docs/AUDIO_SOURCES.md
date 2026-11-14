# Audio rights inventory

- `public/audio/smart-missile.mp3` — [Rocket Launch by Jarusca](https://freesound.org/people/Jarusca/sounds/521377/) on Freesound, licensed [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The game uses Freesound's high-quality MP3 preview of this short game sound effect.
- `public/audio/red-tailed-hawk.mp3` — field recording of a red-tailed hawk by [Jonathon Jongsma](https://commons.wikimedia.org/wiki/File:Buteo_jamaicensis_-_Red-tailed_Hawk_XC71575.mp3), licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The MP3 is used without editing for each Desert eagle dive; attribution also appears in the in-game settings.

All other runtime sounds are synthesized in `src/audio.js`. The old buzzer is no longer shipped or played; no Command & Conquer / Red Alert audio is bundled. Keep the hawk's title, author, source, and license links in each release. If it is edited, review the license's ShareAlike requirement for the adaptation.

Boss mode reuses the original synthesized map cues for its windups and impacts, and adds synthesized boss hit, phase, and collapse cues in `src/audio.js`. No third-party boss audio is bundled.
