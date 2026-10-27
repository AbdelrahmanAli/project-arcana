"""Build compact pixel-art sheets for the magma map's moving hazards.

Molten pixels ripple and brighten independently while basalt stays anchored.
The flight sheets also move ember highlights and the projectile silhouette.
"""

from pathlib import Path
from math import pi

import numpy as np
from PIL import Image


ART = Path(__file__).resolve().parents[1] / "public/art"
SHEETS = (
    ("phase5-lava-projectile.png", "phase5-lava-projectile-frames.png", 6, 2, "flight"),
    ("phase5-lava-pool.png", "phase5-lava-pool-frames.png", 6, 2, "pool"),
    ("phase5-burning-rock.png", "phase5-burning-rock-frames.png", 6, 2, "flight"),
    ("phase5-burning-rock-ground.png", "phase5-burning-rock-ground-frames.png", 6, 2, "ground"),
)


def frame(source: np.ndarray, index: int, count: int, mode: str) -> Image.Image:
    height, width, _ = source.shape
    yy, xx = np.indices((height, width))
    phase = index * 2 * pi / count
    # Preserve the dark, load-bearing stone. Only warm lava/flame pixels flow.
    warm = (source[:, :, 0] > source[:, :, 1] * 1.17) & (source[:, :, 1] > source[:, :, 2] * 1.12)
    warm &= (source[:, :, 0] > 90) & (source[:, :, 3] > 12)
    offset = np.rint(3 * np.sin(phase + yy * .12)).astype(int)
    if mode == "pool":
        offset = np.rint(5 * np.sin(phase + yy * .17)).astype(int)
    sample_x = np.clip(xx - offset, 0, width - 1)
    shifted = source[yy, sample_x]
    pixels = source.copy()
    pixels[warm] = shifted[warm]
    glow = 0.79 + .29 * (1 + np.sin(phase + xx * .08 + yy * .1)) / 2
    rgb = pixels[:, :, :3].astype(np.float32)
    rgb[warm] *= glow[warm, None]
    pixels[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    if mode == "flight":
        # A small shifting ember wake makes successive airborne frames readable.
        for spark in range(3):
            x = int(width * (.32 + .17 * spark) + 7 * np.sin(phase + spark))
            y = int(height * (.78 + .05 * spark) + 6 * np.cos(phase + spark))
            if 0 <= x < width and 0 <= y < height:
                pixels[y-2:y+2, x-2:x+2] = (255, 178 + spark * 18, 45, 220)
    image = Image.fromarray(pixels, "RGBA")
    return image.resize((width // 2, height // 2), Image.Resampling.NEAREST)


def main() -> None:
    for source_name, output_name, count, scale, mode in SHEETS:
        source = np.asarray(Image.open(ART / source_name).convert("RGBA"))
        height, width, _ = source.shape
        sheet = Image.new("RGBA", (width // scale * count, height // scale), (0, 0, 0, 0))
        for index in range(count):
            sheet.paste(frame(source, index, count, mode), (index * width // scale, 0))
        sheet.save(ART / output_name, optimize=True)
        print(f"{output_name}: {count} frames of {width // scale}x{height // scale}")


if __name__ == "__main__":
    main()
