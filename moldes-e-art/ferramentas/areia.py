"""Fundo neutro quente (areia/linho) para o catálogo, como a bancada de 20 designers recomendou:
produto real grande, sem cena falsa, sombra de contato, borda sem halo. Usa os recortes já salvos.
Uso: areia.py <recortes> <saida>"""
import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage

W, H = 1200, 1500
BASE = int(H * 0.86)

def fundo():
    y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
    parede, piso = np.array([239, 232, 221.]), np.array([226, 216, 202.])     # areia/linho
    t = np.clip((y - 0.58) / 0.32, 0, 1) ** 1.3
    img = (parede * (1 - t)[..., None] + piso * t[..., None]) * np.ones((1, W, 1))
    d = np.sqrt(((x - 0.5) / 0.6) ** 2 + ((y - 0.5) / 0.55) ** 2)
    img += (np.clip(1 - d, 0, 1) ** 1.5 * 10)[..., None]
    img -= (np.clip(d - 0.6, 0, 1) * 26)[..., None] * np.array([1, 1.05, 1.15])
    img += np.random.default_rng(5).normal(0, 1.3, img.shape)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))

def compoe(base, obj):
    s = min(0.84 * W / obj.width, 0.72 * H / obj.height)     # produto grande: até 84% da largura
    obj = obj.resize((max(1, int(obj.width * s)), max(1, int(obj.height * s))), Image.LANCZOS)
    al = obj.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))  # sem franja
    o = obj.convert('RGB'); o.putalpha(al)   # cor do produto intacta: a cena se ajusta ao produto, nunca o contrário
    x = (W - o.width) // 2; y = BASE - o.height
    a = np.asarray(al) > 80
    fundo_l = a[int(a.shape[0] * 0.93):]
    cols = np.flatnonzero(fundo_l.any(axis=0)) if fundo_l.any() else np.array([0, o.width - 1])
    cx = x + (cols.min() + cols.max()) / 2; bw = max(cols.max() - cols.min(), o.width * 0.3)
    yy, xx = np.mgrid[0:H, 0:W]
    sm = 0.50 * np.exp(-(((xx - cx) / (bw * .5)) ** 2 + ((yy - BASE) / 7) ** 2) * 2)          # contato
    sm += 0.20 * np.exp(-(((xx - cx) / (bw * .72)) ** 2 + ((yy - BASE - 6) / 30) ** 2) * 2)   # projetada
    out = np.asarray(base).astype(np.float32) * (1 - np.clip(sm, 0, .8)[..., None] * np.array([.62, .66, .72]))
    img = Image.fromarray(out.astype('uint8')); img.paste(o, (x, y), o)
    return img


# ---------------------------------------------------------------- layout forma à esquerda, peça à direita
def sombra_em(arr, cx, larg):
    yy, xx = np.mgrid[0:H, 0:W]
    sm = 0.50 * np.exp(-(((xx - cx) / (larg * .5)) ** 2 + ((yy - BASE) / 7) ** 2) * 2)
    sm += 0.20 * np.exp(-(((xx - cx) / (larg * .72)) ** 2 + ((yy - BASE - 6) / 30) ** 2) * 2)
    return arr * (1 - np.clip(sm, 0, .8)[..., None] * np.array([.62, .66, .72]))

def prepara(obj, s):
    obj = obj.resize((max(1, int(obj.width * s)), max(1, int(obj.height * s))), Image.LANCZOS)
    al = obj.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    o = obj.convert('RGB'); o.putalpha(al); return o

def par(base, molde, pecas):
    """Forma à esquerda, peças à direita, mesma escala real entre elas, base alinhada."""
    gap = 0.06
    s = min(0.88 * W / (molde.width + pecas.width + gap * W), 0.62 * H / max(molde.height, pecas.height))
    m, p = prepara(molde, s), prepara(pecas, s)
    g = int(gap * W * s / s)
    x0 = (W - (m.width + g + p.width)) // 2
    arr = np.asarray(base).astype(np.float32)
    arr = sombra_em(arr, x0 + m.width / 2, m.width * .9)
    arr = sombra_em(arr, x0 + m.width + g + p.width / 2, p.width * .9)
    img = Image.fromarray(arr.astype('uint8'))
    img.paste(m, (x0, BASE - m.height), m); img.paste(p, (x0 + m.width + g, BASE - p.height), p)
    return img

def principal(rec, out):
    import json
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import cena_post as cp
    modos = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modos.json')))
    f = fundo(); tipos = {}
    for a in sorted(glob.glob(os.path.join(rec, '*/*.png'))):
        k = os.path.relpath(a, rec); obj = Image.open(a).convert('RGBA'); modo = modos.get(k, 'auto')
        img = None
        if modo == 'par':
            cs = sorted(cp.componentes(obj), key=lambda c: -c[0])
            if len(cs) >= 2: img = par(f, cs[0][1], cp.lado_a_lado([p for _, p in cs[1:]])); tipos[k] = 'forma+peca'
        elif modo == 'lado':
            img = compoe(f, cp.lado_a_lado([p for _, p in cp.componentes(obj)])); tipos[k] = 'pecas lado a lado'
        elif modo == 'auto':
            molde, peca = cp.separa(obj)
            if molde is not None and peca is not None: img = par(f, molde, peca); tipos[k] = 'forma+peca'
        if img is None: img = compoe(f, obj); tipos[k] = tipos.get(k, 'inteiro')
        dst = os.path.join(out, k.replace('.png', '.jpg')); os.makedirs(os.path.dirname(dst), exist_ok=True)
        img.save(dst, quality=88, optimize=True, progressive=True)
    json.dump(tipos, open(os.path.join(out, '_tipos.json'), 'w'), indent=1)
    print('FIM', len(tipos))

if __name__ == '__main__':
    principal(sys.argv[1], sys.argv[2])
