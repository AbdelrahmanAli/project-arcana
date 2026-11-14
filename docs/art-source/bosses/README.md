# Boss art source

`siegebreaker-sheet.png` is the original generated eight-frame source for the Riverside boss. It has four columns and two rows of 441 × 441 pixel cells. Row 1: idle A, idle B, turret left, turret right. Row 2: cannon windup, cannon fire, damage, defeated. Each cell uses the same center and ground-contact anchor. The runtime copy is currently identical; production integration should crop transparent margins, verify frame alignment, and export a compact WebP atlas before loading it in combat.

The remaining four bosses and all unique attack sheets are pending. Do not treat this first sheet as a complete boss encounter.
