"""Generate Parola icons from the user-approved source artwork without changing its design.
No network, no user data. Deterministic output (fixed sizes/background).
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"M:\Shadowless Studios\DATA\Password Manager - Parola\Glänzendes Cybersecurity-Schild mit Passwortsymbol-5.png")
assert SOURCE.is_file(), f"Logo file missing: {SOURCE}"
source = Image.open(SOURCE).convert("RGBA")
assert source.size == (1254, 1254)
background = (10, 21, 43, 255)

def fitted_art(size, coverage):
    side = round(size * coverage)
    art = source.resize((side, side), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.alpha_composite(art, ((size - side)//2, (size - side)//2))
    return layer

def flatten(image, color=background):
    bg = Image.new("RGBA", image.size, color)
    bg.alpha_composite(image)
    return bg.convert("RGB")

def save_png(p, image):
    p.parent.mkdir(parents=True, exist_ok=True)
    image.save(p, format="PNG", optimize=True)
    print(f"ICON {p.relative_to(ROOT)} {image.size} {image.mode}")

# Full-resolution brand source, not re-generated or recolored
save_png(ROOT / "public" / "parola-icon.png", source)
save_png(ROOT / "public" / "favicon.png", source.resize((192,192), Image.Resampling.LANCZOS))
save_png(ROOT / "public" / "parola-play-icon-512.png", flatten(fitted_art(512, .92)))
res = ROOT / "android" / "app" / "src" / "main" / "res"
# Android density mappings for launcher icon: legacy 48dp, adaptive layers 108dp.
densities = {"mdpi":1,"hdpi":1.5,"xhdpi":2,"xxhdpi":3,"xxxhdpi":4}
for density,scale in densities.items():
    directory=res/("mipmap-"+density)
    legacy=round(48*scale)
    adaptive=round(108*scale)
    legacy_icon=flatten(fitted_art(legacy,.93))
    save_png(directory/"ic_launcher.png",legacy_icon)
    # Round icon: mask only the outer corners, centered art is retained
    mask=Image.new("L",(legacy,legacy),0)
    ImageDraw.Draw(mask).ellipse((0,0,legacy-1,legacy-1),fill=255)
    round_icon=legacy_icon.convert("RGBA")
    round_icon.putalpha(mask)
    save_png(directory/"ic_launcher_round.png",round_icon)
    # Adaptive icon foreground must fit inside 66dp safe zone of a 108dp canvas.
    save_png(directory/"ic_launcher_foreground.png",fitted_art(adaptive, .60))
    # Solid dark blue background, consistent with full-size icon
    save_png(directory/"ic_launcher_background.png",Image.new("RGB",(adaptive,adaptive),background[:3]))
# Android 8+ adaptive icon uses the newly generated mipmap foreground/background
adaptive_xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
for filename in ("ic_launcher.xml","ic_launcher_round.xml"):
    (res/"mipmap-anydpi-v26"/filename).write_text(adaptive_xml, encoding="utf-8")
print("FINISHED")
