from pathlib import Path
from PIL import Image, ImageDraw

base = Path(__file__).resolve().parent.parent / "icons"
base.mkdir(exist_ok=True)

for size in (192, 512):
    img = Image.new("RGBA", (size, size), (46, 134, 171, 255))
    d = ImageDraw.Draw(img)
    m = size // 8
    d.ellipse([m, m, size - m, size - m], fill=(255, 255, 255, 255))
    d.ellipse([size // 3, size // 3, size * 2 // 3, size * 2 // 3], fill=(46, 134, 171, 255))
    img.save(base / f"icon-{size}.png")
print("icons created")
