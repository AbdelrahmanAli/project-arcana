"""Create six distinct lightning strike frames from the original pixel art.

Branches jitter and intensify through the strike while the impact point stays
fixed. The game plays these frames once instead of blinking one still image.
"""

from pathlib import Path
from math import pi

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/art/phase5-lightning.png"
OUTPUT = ROOT / "public/art/phase5-lightning-frames.png"
FRAMES = 6
SCALE = 2


def make_frame(source: np.ndarray, index: int) -> Image.Image:
    height, width, _ = source.shape
    yy, xx = np.indices((height, width), dtype=np.float32)
    phase = 2 * pi * index / FRAMES
    # Each band of the descending bolt bends by a different amount. Motion
    # tapers to zero at the impact so it cannot slide across the warning mark.
    bend = (np.sin(phase + yy * .037) - np.sin(phase + height * .037))
    bend *= 6 * np.clip((height - yy) / (height * .52), 0, 1)
    sample_x = np.clip(np.rint(xx - bend).astype(np.int32), 0, width - 1)
    pixels = source[yy.astype(np.int32), sample_x].copy()

    # A brief hot core and a fading tail give the six frames a clear attack
    # rhythm. Ground-contact rows keep their original colors and geometry.
    intensities = [0.72, 1.0, 1.18, 0.94, 0.72, 0.48]
    intensity = intensities[index]
    active = yy < height - 18
    rgb = pixels[:, :, :3].astype(np.float32)
    rgb = np.where(active[:, :, None], rgb * intensity, rgb)
    pixels[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    if index in (2, 3):
        # Add a faint offset electric echo only above the ground burst.
        echo_x = np.clip(sample_x + (5 if index == 2 else -5), 0, width - 1)
        echo = source[yy.astype(np.int32), echo_x]
        echo_alpha = echo[:, :, 3].astype(np.float32) * .24 * (yy < height - 35)
        empty = pixels[:, :, 3] < echo_alpha
        pixels[empty, :3] = echo[empty, :3]
        pixels[:, :, 3] = np.maximum(pixels[:, :, 3], echo_alpha.astype(np.uint8))
    frame = Image.fromarray(pixels, "RGBA")
    return frame.resize((width // SCALE, height // SCALE), Image.Resampling.NEAREST)


def main() -> None:
    source = np.asarray(Image.open(SOURCE).convert("RGBA"))
    height, width, _ = source.shape
    frame_width, frame_height = width // SCALE, height // SCALE
    sheet = Image.new("RGBA", (frame_width * FRAMES, frame_height), (0, 0, 0, 0))
    for index in range(FRAMES):
        sheet.paste(make_frame(source, index), (index * frame_width, 0))
    sheet.save(OUTPUT, optimize=True)
    print(f"{OUTPUT} ({FRAMES} frames of {frame_width}x{frame_height})")


if __name__ == "__main__":
    main()
