#!/usr/bin/env python3
"""Optional: generate original geometric promotional artwork (requires Pillow).

This script is not part of the extension or its packaging dependencies.
Use --font and --bold-font on systems without the macOS Arial fonts.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--font', default='/System/Library/Fonts/Supplemental/Arial.ttf')
parser.add_argument('--bold-font', default='/System/Library/Fonts/Supplemental/Arial Bold.ttf')
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'store' / 'assets'
out.mkdir(parents=True, exist_ok=True)
S = 3


def text(draw, xy, label, size, color, bold=False):
    font = ImageFont.truetype(args.bold_font if bold else args.font, size * S)
    draw.text((xy[0] * S, xy[1] * S), label, font=font, fill=color)


def icon(draw, x, y, size):
    draw.rounded_rectangle((x*S, y*S, (x+size)*S, (y+size)*S), radius=size*.22*S, fill='#216b52')
    for ratio in [.30, .70]:
        draw.line(((x+size*ratio)*S, (y+size*.25)*S, (x+size*ratio)*S, (y+size*.55)*S), fill='white', width=round(size*.10*S))
    draw.arc(((x+size*.25)*S, (y+size*.30)*S, (x+size*.75)*S, (y+size*.75)*S), 0, 180, fill='white', width=round(size*.10*S))


def canvas(w, h):
    image = Image.new('RGB', (w*S, h*S), '#f7f9f6')
    return image, ImageDraw.Draw(image)


def save(image, w, h, name):
    image.resize((w, h), Image.Resampling.LANCZOS).save(out / name)


im, d = canvas(300, 300)
icon(d, 18, 18, 264)
save(im, 300, 300, 'logo-300.png')
im, d = canvas(440, 280)
icon(d, 28, 28, 50)
text(d, (93, 38), 'Facebook Unhook', 24, '#203a31', True)
text(d, (28, 108), 'Mniej szumu.', 34, '#203a31', True)
text(d, (28, 151), 'Twoje grupy.', 34, '#216b52', True)
text(d, (29, 230), 'Bezpłatne rozszerzenie do Microsoft Edge', 16, '#54705d')
save(im, 440, 280, 'promo-small-440x280.png')
im, d = canvas(1400, 560)
icon(d, 64, 60, 76)
text(d, (164, 77), 'Facebook Unhook', 34, '#203a31', True)
text(d, (64, 199), 'Mniej szumu.', 70, '#203a31', True)
text(d, (64, 280), 'Twoje grupy.', 70, '#216b52', True)
text(d, (66, 438), 'Bezpłatne rozszerzenie do Microsoft Edge', 24, '#54705d')
d.rounded_rectangle((860*S, 73*S, 1338*S, 487*S), radius=26*S, fill='white', outline='#e3e9e4', width=2*S)
text(d, (900, 113), 'Ty wybierasz, co zostaje.', 27, '#203a31', True)
for i, label in enumerate(['Posty z Twoich grup', 'Mniej rolek i relacji', 'Spokojniejszy widok']):
    y = 193 + 78*i
    d.ellipse((900*S, (y+4)*S, 924*S, (y+28)*S), fill='#eaf1e9')
    d.line((906*S, (y+16)*S, 911*S, (y+21)*S, 919*S, (y+11)*S), fill='#216b52', width=3*S)
    text(d, (942, y), label, 25, '#203a31')
text(d, (900, 432), 'Ustawienia zapisane lokalnie', 18, '#54705d')
save(im, 1400, 560, 'promo-large-1400x560.png')
