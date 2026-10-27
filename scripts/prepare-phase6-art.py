"""Prepare the original Phase 6 pixel art as compact, aligned runtime sheets."""

from pathlib import Path
from math import sin, pi

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/art-source/phase6"
OUTPUT = ROOT / "public/art/phase6"
OUTPUT.mkdir(parents=True, exist_ok=True)

SHEETS = (
    ("eagle-sheet.png", "eagle-frames.png", 6, (128, 128), (116, 105), "bottom"),
    ("scorpion-sheet.png", "scorpion-frames.png", 6, (128, 128), (116, 105), "bottom"),
    ("quicksand-sheet.png", "quicksand-frames.png", 4, (128, 96), (124, 88), "center"),
    ("avalanche-sheet.png", "avalanche-frames.png", 4, (192, 144), (188, 136), "center"),
    ("hail-cloud-sheet.png", "hail-cloud-frames.png", 4, (160, 112), (155, 105), "center"),
    ("ice-patch-sheet.png", "ice-patch-frames.png", 4, (128, 88), (124, 80), "center"),
)


def crop_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A").point(lambda value: 255 if value > 26 else 0)
    bounds = alpha.getbbox()
    return image.crop(bounds) if bounds else image


def normalize_strip(source: str, output: str, count: int, cell: tuple[int, int],
                    maximum: tuple[int, int], anchor: str) -> None:
    image = Image.open(SOURCE / source).convert("RGBA")
    slices = [crop_alpha(image.crop((round(i * image.width / count), 0,
                                     round((i + 1) * image.width / count), image.height)))
              for i in range(count)]
    max_width = max(part.width for part in slices)
    max_height = max(part.height for part in slices)
    scale = min(maximum[0] / max_width, maximum[1] / max_height)
    sheet = Image.new("RGBA", (cell[0] * count, cell[1]), (0, 0, 0, 0))
    for index, part in enumerate(slices):
        width, height = max(1, round(part.width * scale)), max(1, round(part.height * scale))
        sprite = part.resize((width, height), Image.Resampling.NEAREST)
        x = index * cell[0] + (cell[0] - width) // 2
        y = cell[1] - height - 5 if anchor == "bottom" else (cell[1] - height) // 2
        sheet.alpha_composite(sprite, (x, y))
    sheet.save(OUTPUT / output, optimize=True)
    print(f"{output}: {count} frames of {cell[0]}x{cell[1]}")


def sandstorm_sheet() -> None:
    image = crop_alpha(Image.open(SOURCE / "sandstorm.png").convert("RGBA"))
    base = np.asarray(image.resize((480, 164), Image.Resampling.NEAREST))
    height, width, _ = base.shape
    yy, xx = np.indices((height, width))
    sheet = Image.new("RGBA", (width * 6, height), (0, 0, 0, 0))
    for index in range(6):
        phase = index * 2 * pi / 6
        offset = np.rint(7 * np.sin(phase + yy * .08)).astype(int)
        sample = np.clip(xx - offset, 0, width - 1)
        pixels = base[yy, sample].copy()
        pixels[:, :, :3] = np.clip(pixels[:, :, :3].astype(float) *
                                   (.93 + .08 * sin(phase)), 0, 255).astype(np.uint8)
        sheet.alpha_composite(Image.fromarray(pixels, "RGBA"), (index * width, 0))
    sheet.save(OUTPUT / "sandstorm-frames.png", optimize=True)


def small_effect_sheets() -> None:
    mirage = Image.new("RGBA", (64 * 4, 64), (0, 0, 0, 0))
    hail = Image.new("RGBA", (48 * 4, 48), (0, 0, 0, 0))
    for frame in range(4):
        tile = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(tile)
        for band in range(5):
            y = 10 + band * 10
            shift = int(4 * sin(frame * pi / 2 + band))
            draw.arc((5 + shift, y - 4, 59 + shift, y + 16), 15, 170,
                     fill=(255, 230, 145, 85 + band * 14), width=2)
        mirage.alpha_composite(tile, (frame * 64, 0))
        tile = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        draw = ImageDraw.Draw(tile)
        if frame == 0:
            draw.ellipse((18, 5, 30, 17), fill=(217, 245, 255, 255), outline=(56, 116, 171, 255), width=2)
        elif frame == 1:
            draw.ellipse((14, 19, 34, 30), fill=(225, 249, 255, 255), outline=(66, 141, 189, 255), width=2)
        else:
            for n in range(7 if frame == 2 else 4):
                angle = n * 2 * pi / 7
                radius = 13 if frame == 2 else 19
                x, y = 24 + int(radius * np.cos(angle)), 25 + int(radius * np.sin(angle) * .55)
                draw.polygon(((x, y - 4), (x + 3, y), (x, y + 4), (x - 3, y)),
                             fill=(205, 239, 255, 235 if frame == 2 else 120))
        hail.alpha_composite(tile, (frame * 48, 0))
    mirage.save(OUTPUT / "mirage-frames.png", optimize=True)
    hail.save(OUTPUT / "hail-impact-frames.png", optimize=True)


def main() -> None:
    for name in ("desert", "snow"):
        image = Image.open(SOURCE / f"arena-{name}.png").convert("RGB")
        image.save(OUTPUT / f"arena-{name}.webp", "WEBP", quality=90, method=6)
    for item in SHEETS:
        normalize_strip(*item)
    sandstorm_sheet()
    small_effect_sheets()


if __name__ == "__main__":
    main()
