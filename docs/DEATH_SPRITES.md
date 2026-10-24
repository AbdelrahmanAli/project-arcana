# Death animation art

The four-frame transparent sheets in `public/art/death-blue-frames.png` and `public/art/death-red-frames.png` were created with the built-in imagegen tool. The existing soldier atlas and corresponding prone art were used as visual references. Each sheet reads left-to-right, then top-to-bottom: recoil, buckle, ground contact, prone. The game blends adjacent frames over a short interval and holds the final pose.

Blue prompt: Create a new four-frame 2×2 transparent pixel-art death sheet for only the blue armored soldier, matching the existing blue sprite and prone art. Recoil while facing north; buckle and move southeast; land with helmet toward the lower right; finish prone with helmet lower right and boots upper left. Keep blue armor, tan vest, dark gloves and boots, consistent scale, centered characters, and transparent padding. No ground, borders, text, other people, extra weapons, or spinning.

Red prompt: Create a matching new four-frame 2×2 transparent pixel-art death sheet for only the red armored soldier, matching the existing red sprite and prone art. Recoil while facing south; buckle; contact the ground; finish prone with helmet upper right and boots lower left. Keep scarlet armor, tan vest, dark gloves and boots, consistent scale, centered characters, and transparent padding. No ground, borders, text, other people, extra weapons, or spinning.

`src/main.js` slices the sheets with cropped rectangles because the original generated sheets have different canvas sizes. Keep the crop coordinates aligned if either image is regenerated.
