"""Generates placeholder artwork (red tile, white sun + thermometer). Replace with real branding before publishing."""
import os
from PIL import Image, ImageDraw

RED = (227, 6, 19)
WHITE = (255, 255, 255)


def draw(w, h, path):
    img = Image.new('RGB', (w, h), RED)
    d = ImageDraw.Draw(img)
    s = min(w, h)
    cx, cy, r = int(w * 0.36), int(h * 0.42), int(s * 0.17)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    import math
    for i in range(8):
        a = i * math.pi / 4
        d.line([cx + math.cos(a) * r * 1.35, cy + math.sin(a) * r * 1.35,
                cx + math.cos(a) * r * 1.9, cy + math.sin(a) * r * 1.9], fill=WHITE, width=max(2, int(s * 0.025)))
    tx, tw = int(w * 0.72), max(4, int(s * 0.07))
    d.rounded_rectangle([tx - tw, int(h * 0.2), tx + tw, int(h * 0.68)], radius=tw, fill=WHITE)
    br = int(tw * 1.9)
    d.ellipse([tx - br, int(h * 0.62), tx + br, int(h * 0.62) + 2 * br], fill=WHITE)
    d.rectangle([tx - tw // 2, int(h * 0.38), tx + tw // 2, int(h * 0.7)], fill=RED)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


base = os.path.dirname(os.path.abspath(__file__))
for name, w, h in (('small', 250, 175), ('large', 500, 350), ('xlarge', 1000, 700)):
    draw(w, h, os.path.join(base, f'assets/images/{name}.png'))
for driver in ('resol-controller', 'resol-sensor'):
    for name, sz in (('small', 75), ('large', 500), ('xlarge', 1000)):
        draw(sz, sz, os.path.join(base, f'drivers/{driver}/assets/images/{name}.png'))
print('All images created.')
