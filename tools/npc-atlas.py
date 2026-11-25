# Hoja pintada de los personajes secundarios (arte/personajes/<id>-quieta-1/2.png, 512×768, pies en y≈740).
# Uso: python3 tools/npc-atlas.py /mnt/project-files/sans-souci/arte/personajes
# Salida: public/art/npcs.webp (cuadros de 384×576) y public/art/retratos/<id>.webp.
import sys, os
import numpy as np
from PIL import Image
src = sys.argv[1]
IDS = ['anselmo', 'rosa', 'mercedes', 'isabel']
FW, FH = 384, 576
sheet = Image.new('RGBA', (FW * 2, FH * len(IDS)), (0, 0, 0, 0))
for r, n in enumerate(IDS):
    for c in range(2):
        f = os.path.join(src, '%s-sentada-%d.png' % (n, c + 1))
        if not os.path.exists(f): f = os.path.join(src, '%s-quieta-%d.png' % (n, c + 1))
        im = Image.open(f).convert('RGBA')
        a = np.array(im)
        a[:, :, 3] = np.where(a[:, :, 3] < 10, 0, a[:, :, 3])
        bot = int(np.where((a[:, :, 3] > 128).sum(1) > 3)[0][-1])
        im = Image.fromarray(a)
        if bot != 738:
            im = im.transform(im.size, Image.AFFINE, (1, 0, 0, 0, 1, bot - 738))
        sheet.paste(im.resize((FW, FH), Image.LANCZOS), (c * FW, r * FH))
sheet.save('public/art/npcs.webp', quality=90, method=6)
os.makedirs('public/art/retratos', exist_ok=True)
for n in IDS:
    Image.open(os.path.join(src, n + '-retrato.png')).convert('RGBA').save('public/art/retratos/%s.webp' % n, quality=90)
print(sheet.size, os.path.getsize('public/art/npcs.webp'))
