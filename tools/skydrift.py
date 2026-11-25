# Nubes que se ven pasar: arma una tira de nubes pintadas (sin costura en horizontal) con los mismos colores
# del cielo de la lámina: luces arriba, sombras abajo, bordes deshilachados como aguada.
# Uso: python3 tools/skydrift.py public/art/jardin-1920.webp [semilla]  → public/art/jardin-1920-clouds.webp
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import zoom, gaussian_filter
path = sys.argv[1]; base = path[:-5]
seed = int(sys.argv[2]) if len(sys.argv) > 2 else 3
rng = np.random.default_rng(seed)
plate = np.array(Image.open(path).convert('RGB')).astype(np.float32)
fg = np.array(Image.open(base + '-fg.webp').convert('RGBA'))
sky = fg[..., 3] < 20
rows = np.where(sky.sum(1) > 20)[0]
H = int(rows.max()) + 20
px = plate[sky]
lum = px.mean(1)
hi = px[lum >= np.percentile(lum, 85)].mean(0) * 1.13   # cara iluminada de la nube
lo = px[lum <= np.percentile(lum, 20)].mean(0) * 0.80   # panza en sombra
W = 2048
def noise(cw, ch, sx, sy):
    g = rng.random((ch, cw))
    g = np.concatenate([g, g[:, :1]], 1)  # periódico en x
    z = zoom(g, ((H / (ch - 1)) if ch > 1 else 1, W / cw), order=3)[:H, :W]
    return z
d = sum(noise(cw, ch, 0, 0) * a for cw, ch, a in [(4, 3, 1.0), (8, 5, 0.55), (16, 8, 0.3), (40, 14, 0.16), (96, 28, 0.08)])
d = (d - d.min()) / (d.max() - d.min())
ys = np.linspace(0, 1, H)[:, None]
d = d * (1.05 - 0.55 * ys)                  # más nubes arriba
dens = np.clip((d - 0.42) / 0.3, 0, 1) ** 1.3
# luz desde arriba: la parte de abajo de cada nube más oscura
shade = np.clip(0.5 + 3.0 * (np.roll(dens, -6, 0) - np.roll(dens, 6, 0)), 0, 1)
shade = gaussian_filter(shade, 3)
col = lo[None, None, :] * (1 - shade[..., None]) + hi[None, None, :] * shade[..., None]
# grano de papel y pincel
grain = gaussian_filter(rng.random((H, W)), 1.2)
col *= (0.94 + 0.12 * grain)[..., None]
alpha = dens * 0.85 * np.clip((1 - ys) * 1.6, 0, 1)
alpha = gaussian_filter(alpha, (1.5, 3), mode=('nearest', 'wrap'))
out = np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(base + '-clouds.webp', quality=88)
print(base, 'nubes', W, 'x', H)
