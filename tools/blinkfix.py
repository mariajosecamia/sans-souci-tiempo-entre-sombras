# Parpadeo sin saltos: el cuadro de ojos cerrados se arma sobre el de reposo y sólo cambia la cara.
# Uso (después de elena-atlas.py / npc-atlas.py):
#   python3 tools/blinkfix.py public/art/elena.webp 7 "[(8,9),(10,11)]" public/art/elena.webp
#   python3 tools/blinkfix.py public/art/npcs.webp 2 "[(0,1),(2,3),(4,5),(6,7)]" public/art/npcs.webp
import numpy as np, sys
from PIL import Image
from scipy.ndimage import gaussian_filter, label, binary_dilation
FW,FH=384,576
def fix(path, cols, pairs, out):
    im=np.array(Image.open(path).convert('RGBA')).astype(np.float32)
    def get(i): c,r=i%cols,i//cols; return im[r*FH:(r+1)*FH, c*FW:(c+1)*FW]
    def put(i,a): c,r=i%cols,i//cols; im[r*FH:(r+1)*FH, c*FW:(c+1)*FW]=a
    for a,b in pairs:
        A,B=get(a),get(b)
        best=None
        for dy in range(-14,15):
            for dx in range(-14,15):
                Bs=np.roll(np.roll(B,dy,0),dx,1)
                e=np.abs(Bs[...,3]-A[...,3]).mean()
                if best is None or e<best[0]: best=(e,dx,dy)
        e,dx,dy=best
        Bs=np.roll(np.roll(B,dy,0),dx,1)
        ys,xs=np.where(A[...,3]>128); top,bot=ys.min(),ys.max(); H=bot-top
        d=np.abs(Bs[...,:3]-A[...,:3]).mean(-1)*(A[...,3]>128)
        d[int(top+H*0.16):]=0  # solo la cara (zona de ojos)
        m=d>40
        lab,n=label(binary_dilation(m,iterations=3))
        if n:
            sizes=[(lab==k).sum() for k in range(1,n+1)]
            keep=np.zeros_like(m)
            for k,sz in enumerate(sizes,1):
                if sz>15: keep|=lab==k
            ys2,xs2=np.where(keep)
            if len(ys2):
                y0,y1,x0,x1=ys2.min()-4,ys2.max()+4,xs2.min()-4,xs2.max()+4
                inside=(A[...,3]>250)&(Bs[...,3]>250)
                from scipy.ndimage import binary_erosion
                inside=binary_erosion(inside,iterations=4)
                w=np.zeros((FH,FW),np.float32); w[y0:y1,x0:x1]=1; w*=inside; w=gaussian_filter(w,2.5)
                C=A.copy(); C[...,:3]=A[...,:3]*(1-w[...,None])+Bs[...,:3]*w[...,None]
                put(b,C)
                print(path,a,b,'shift',dx,dy,'eyes box',x0,y0,x1,y1)
                continue
        put(b,A.copy()); print(path,a,b,'shift',dx,dy,'no eye diff -> copy')
    Image.fromarray(np.clip(im,0,255).astype(np.uint8),'RGBA').save(out,quality=92) if out.endswith('webp') else None
fix(sys.argv[1], int(sys.argv[2]), eval(sys.argv[3]), sys.argv[4])
