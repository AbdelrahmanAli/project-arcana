"""Build an eight-frame, ground-anchored tornado animation from its source art.

The upper vortex is rotated *inside its fixed elliptical silhouette*. The
funnel sways at the top while its foot stays planted. This produces actual
different pixel frames instead of rotating one Pixi sprite at runtime.
"""

from pathlib import Path
from math import pi

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/art/phase5-tornado.png"
OUTPUT = ROOT / "public/art/phase5-tornado-frames.png"
FRAMES = 8
SCALE = 2


def make_frame(source: np.ndarray, phase: float) -> np.ndarray:
    height, width, _ = source.shape
    yy, xx = np.indices((height, width), dtype=np.float32)

    # The funnel tilts a few pixels near its neck, but its contact point on
    # the ground remains at exactly the same coordinate in every frame.
    neck = np.clip((height - yy) / (height - 135), 0, 1)
    shift = np.where(yy >= 135, np.sin(phase) * 5 * neck * neck, 0)
    funnel_x = np.clip(np.rint(xx - shift).astype(np.int32), 0, width - 1)
    result = source[yy.astype(np.int32), funnel_x].copy()

    # Advect the painted cloud bands around the eye. The oval edge stays
    # fixed so the vortex turns in depth instead of spinning like a coin.
    center_x, center_y = width / 2, 95
    radius_x, radius_y = 153, 100
    u, v = (xx - center_x) / radius_x, (yy - center_y) / radius_y
    radius = np.hypot(u, v)
    angle = np.arctan2(v, u) - phase * (0.8 + 0.2 * np.maximum(0, 1 - radius))
    sample_x = np.clip(np.rint(center_x + radius * np.cos(angle) * radius_x).astype(np.int32), 0, width - 1)
    sample_y = np.clip(np.rint(center_y + radius * np.sin(angle) * radius_y).astype(np.int32), 0, height - 1)
    swirl = source[sample_y, sample_x].copy()

    # Preserve the original silhouette and blend back into the funnel where
    # the painted spiral narrows. Premultiplied RGB avoids dark alpha seams.
    original_alpha = source[:, :, 3].astype(np.float32) / 255
    swirl[:, :, 3] = np.rint(swirl[:, :, 3] * original_alpha).astype(np.uint8)
    blend = np.clip((215 - yy) / 45, 0, 1) * (yy < 215)
    blend *= np.clip((1.18 - radius) * 5, 0, 1)
    top_alpha = swirl[:, :, 3].astype(np.float32) / 255 * blend
    bottom_alpha = result[:, :, 3].astype(np.float32) / 255 * (1 - blend)
    combined_alpha = top_alpha + bottom_alpha
    out_rgb = (
        swirl[:, :, :3].astype(np.float32) * top_alpha[:, :, None]
        + result[:, :, :3].astype(np.float32) * bottom_alpha[:, :, None]
    ) / np.maximum(combined_alpha[:, :, None], 1e-6)
    result[:, :, :3] = np.clip(np.rint(out_rgb), 0, 255).astype(np.uint8)
    result[:, :, 3] = np.clip(np.rint(combined_alpha * 255), 0, 255).astype(np.uint8)
    return result


def main() -> None:
    source = np.asarray(Image.open(SOURCE).convert("RGBA"))
    height, width, _ = source.shape
    frame_width, frame_height = width // SCALE, height // SCALE
    sheet = Image.new("RGBA", (frame_width * FRAMES, frame_height), (0, 0, 0, 0))
    for index in range(FRAMES):
        frame = Image.fromarray(make_frame(source, 2 * pi * index / FRAMES), "RGBA")
        frame = frame.resize((frame_width, frame_height), Image.Resampling.NEAREST)
        sheet.paste(frame, (index * frame_width, 0))
    sheet.save(OUTPUT, optimize=True)
    print(f"{OUTPUT} ({FRAMES} frames of {frame_width}x{frame_height})")


if __name__ == "__main__":
    main()
