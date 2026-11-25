# Separa el cielo de una placa pintada: genera <nombre>-fg.webp (placa con el cielo transparente)
# y <nombre>-sky.webp (banda de cielo para que las nubes se muevan). Uso: python3 tools/skymask.py public/art/jardin-1920.webp
import sys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque

path = sys.argv[1]
tol = float(sys.argv[2]) if len(sys.argv) > 2 else 38
im = Image.open(path).convert('RGB')
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape
lab = a  # RGB alcanza para cielos grises/rosados
# semilla: colores del cielo en la franja superior, lejos de los bordes (árboles)
band = a[5:60, int(W * 0.3):int(W * 0.7)].reshape(-1, 3)
ref = np.median(band, axis=0)
sat = a.max(axis=2) - a.min(axis=2)
mask = np.zeros((H, W), bool)
seen = np.zeros((H, W), bool)
q = deque()
for x in range(W):
    if np.linalg.norm(a[0, x] - ref) < tol * 1.6:
        q.append((0, x)); seen[0, x] = True
limit = int(H * (float(sys.argv[3]) if len(sys.argv) > 3 else 0.62))
while q:
    y, x = q.popleft()
    mask[y, x] = True
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < limit and 0 <= nx < W and not seen[ny, nx]:
            seen[ny, nx] = True
            # el cielo cambia despacio: comparar con el vecino y con la referencia
            if np.linalg.norm(a[ny, nx] - a[y, x]) < tol * 0.55 and np.linalg.norm(a[ny, nx] - ref) < tol * 2.4:
                q.append((ny, nx))
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
fg = im.copy().convert('RGBA')
fg.putalpha(Image.fromarray(255 - np.asarray(m)))
base = path.rsplit('.', 1)[0]
fg.save(base + '-fg.webp', quality=88)
ys = np.where(mask.any(axis=1))[0]
sky_h = int(ys.max()) + 1 if len(ys) else 200
print(base, 'cielo hasta y=', sky_h, 'fraccion', round(mask.mean(), 3))

# Nubes: tira horizontal sin costura, pintada con los colores del propio cielo.
rng = np.random.default_rng(abs(hash(base)) % (2**32))
sky_px = a[mask]
light = np.percentile(sky_px, 85, axis=0)
dark = np.percentile(sky_px, 20, axis=0)
TW, TH = 1024, max(120, sky_h + 30)
acc = np.zeros((TH, TW, 4), np.float32)
yy, xx = np.mgrid[0:TH, 0:TW]
for i in range(70):
    cx, cy = rng.uniform(0, TW), rng.uniform(0, TH * 0.85)
    rx, ry = rng.uniform(60, 190), rng.uniform(14, 42)
    col = light if rng.random() < 0.65 else dark
    for off in (-TW, 0, TW):  # costura horizontal
        d = ((xx - cx - off) / rx) ** 2 + ((yy - cy) / ry) ** 2
        w = np.exp(-d * 1.6) * rng.uniform(0.25, 0.6)
        acc[..., :3] += w[..., None] * col
        acc[..., 3] += w
rgb = acc[..., :3] / np.maximum(acc[..., 3:4], 1e-4)
alpha = np.clip(acc[..., 3] * 0.9, 0, 0.85)
alpha *= np.clip((TH - yy) / 30, 0, 1)  # se desvanece abajo
noise = rng.normal(0, 6, (TH, TW, 1))
out = np.concatenate([np.clip(rgb + noise, 0, 255), (alpha * 255)[..., None]], axis=2).astype(np.uint8)
Image.fromarray(out, 'RGBA').filter(ImageFilter.GaussianBlur(2)).save(base + '-clouds.webp', quality=85)

# Vegetación (hojas, hiedra, pasto, flores): capa aparte para que se mezca con el viento.
r_, g_, b_ = a[..., 0], a[..., 1], a[..., 2]
mx, mn = a.max(axis=2), a.min(axis=2)
s_ = (mx - mn) / np.maximum(mx, 1)
hue = np.zeros((H, W))
d_ = np.maximum(mx - mn, 1e-3)
hr = ((g_ - b_) / d_) % 6; hg = (b_ - r_) / d_ + 2; hb = (r_ - g_) / d_ + 4
hue = np.where(mx == r_, hr, np.where(mx == g_, hg, hb)) * 60
green = (hue > 40) & (hue < 170) & (s_ > 0.28) & (mx > 30)
flowers = ((hue > 270) | (hue < 8)) & (s_ > 0.22) & (mx > 120)
veg = (green | flowers) & ~mask
vm = Image.fromarray((veg * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
vl = im.copy().convert('RGBA'); vl.putalpha(vm)
vl.save(base + '-veg.webp', quality=86)
print('vegetacion', round(veg.mean(), 3))
