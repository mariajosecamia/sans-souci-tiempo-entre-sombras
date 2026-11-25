# Arma la hoja de animación pintada de Elena a partir de los cuadros de arte/elena/ (512×768, pies en y≈738).
# Uso: python3 tools/elena-atlas.py /mnt/project-files/sans-souci/arte/elena
# Salida: public/art/elena.webp (cuadros de 384×576 en grilla) y src/art/elenaFrames.ts (orden de los cuadros).
import sys, os
import numpy as np
from PIL import Image
src = sys.argv[1]
FRAMES = (['caminar-%d' % i for i in range(1, 9)] + ['quieta-34-1', 'quieta-34-2', 'quieta-perfil-1', 'quieta-perfil-2'] +
          ['espaldas-%d' % i for i in range(1, 5)] + ['espaldas-quieta'] + ['frente-%d' % i for i in range(1, 5)] + ['frente-quieta'] +
          ['agacharse-%d' % i for i in range(1, 5)] + ['tomar-%d' % i for i in range(1, 4)] + ['examinar-1', 'examinar-2', 'leer-1', 'leer-2', 'susto-1', 'susto-2'])
FW, FH, COLS = 384, 576, 7
rows = (len(FRAMES) + COLS - 1) // COLS
sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
for i, f in enumerate(FRAMES):
    im = Image.open(os.path.join(src, f + '.png')).convert('RGBA')
    a = np.array(im)
    a[:, :, 3] = np.where(a[:, :, 3] < 10, 0, a[:, :, 3])  # limpia el velo casi invisible
    # alinear pies: la fila más baja con figura va a y=738
    rowsum = (a[:, :, 3] > 128).sum(1)
    bot = int(np.where(rowsum > 3)[0][-1])
    im = Image.fromarray(a)
    if bot != 738:
        im = im.transform(im.size, Image.AFFINE, (1, 0, 0, 0, 1, bot - 738))
    im = im.resize((FW, FH), Image.LANCZOS)
    sheet.paste(im, ((i % COLS) * FW, (i // COLS) * FH))
sheet.save('public/art/elena.webp', quality=90, method=6)
with open('src/art/elenaFrames.ts', 'w') as o:
    o.write('// Generado por tools/elena-atlas.py: orden de los cuadros pintados de Elena en public/art/elena.webp.\n')
    o.write('export const ELENA_FW = %d;\nexport const ELENA_FH = %d;\n/** Pies en y=738 de 768 (en el cuadro achicado: %.1f). */\nexport const ELENA_FOOT = 738 / 768;\n' % (FW, FH, 738 * FH / 768))
    o.write('/** Alto de la figura parada, en píxeles del cuadro achicado. */\nexport const ELENA_FIG_H = %d;\n' % round(693 * FH / 768))
    o.write('export const ELENA_FRAMES = %s as const;\n' % repr(FRAMES).replace("'", "'"))
print(len(FRAMES), sheet.size, os.path.getsize('public/art/elena.webp'))
