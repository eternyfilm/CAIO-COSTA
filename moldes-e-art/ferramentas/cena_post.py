"""Etapa 2: monta cada produto na cena da marca (mesa de madeira escura, bokeh quente, flores desfocadas),
com a FORMA à esquerda e a PEÇA à direita sobre uma fatia de tronco, como nos posts do Instagram.
Forma e peça vêm da foto real (recorte); nada é inventado. Se a foto só tem a peça (ou só a forma),
ela fica centralizada.  Uso: cena_post.py <recortes> <saida> [arquivo.png ...]"""
import sys, os, glob, random, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage

W, H = 1200, 1500
MESA = int(H * 0.60)     # horizonte: parede encontra a mesa
BASE = int(H * 0.84)     # onde os objetos pousam

# ---------------------------------------------------------------- cena
def cena(seed=11):
    rnd = random.Random(seed)
    y = np.linspace(0, 1, H)[:, None]; x = np.linspace(0, 1, W)[None, :]
    # parede: marrom escuro quente, mais claro atrás dos produtos
    topo, meio = np.array([40, 26, 17.]), np.array([96, 64, 40.])
    t = np.clip(y / (MESA / H), 0, 1)
    img = topo * (1 - t)[..., None] + meio * t[..., None]
    d = np.sqrt(((x - 0.5) / 0.6) ** 2 + ((y - 0.40) / 0.45) ** 2)
    img = img + (np.clip(1 - d, 0, 1) ** 1.3 * 80)[..., None] * np.array([1, .74, .48])
    base = Image.fromarray(np.clip(img, 0, 255).astype('uint8'))
    # bokeh: luzes douradas, flores rosadas nas bordas, folhas escuras, uma lanterna à direita
    camada = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(camada)
    for _ in range(26):  # folhagem escura nas bordas
        r = rnd.randint(70, 160); cx = rnd.choice([rnd.randint(-80, 260), rnd.randint(W - 260, W + 80)]); cy = rnd.randint(0, MESA)
        dr.ellipse([cx - r, cy - r * .7, cx + r, cy + r * .7], fill=(34, 44, 24, 150))
    for _ in range(14):  # flores rosadas
        r = rnd.randint(60, 120); cx = rnd.choice([rnd.randint(-60, 230), rnd.randint(W - 230, W + 60)]); cy = rnd.randint(int(MESA * .25), MESA)
        c = rnd.choice([(232, 150, 172), (245, 185, 198), (214, 118, 146), (250, 210, 218)])
        dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c + (rnd.randint(80, 150),))
    camada = camada.filter(ImageFilter.GaussianBlur(42))
    base.paste(camada, (0, 0), camada)
    luzes = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dl = ImageDraw.Draw(luzes)
    for _ in range(40):  # luzes de fundo, grandes
        r = rnd.randint(28, 70); cx = rnd.randint(-30, W + 30); cy = int(rnd.betavariate(2, 2.6) * MESA * 1.02)
        dl.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 200, 120, rnd.randint(40, 110)))
    luzes = luzes.filter(ImageFilter.GaussianBlur(22)); dl = ImageDraw.Draw(luzes)
    for _ in range(55):  # pontos de luz quente
        r = rnd.randint(7, 30); cx = rnd.randint(-30, W + 30); cy = int(rnd.betavariate(2, 2.6) * MESA * 1.02)
        c = rnd.choice([(255, 196, 110), (255, 220, 150), (255, 178, 90), (255, 236, 190)])
        dl.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c + (rnd.randint(70, 200),))
    lx, ly = int(W * .88), int(MESA * .80)  # lanterna
    for r, a in [(120, 70), (70, 120), (36, 210)]:
        dl.ellipse([lx - r, ly - r, lx + r, ly + r], fill=(255, 190, 100, a))
    luzes = luzes.filter(ImageFilter.GaussianBlur(9))
    base.paste(luzes, (0, 0), luzes)
    base = base.filter(ImageFilter.GaussianBlur(3))
    # mesa de madeira escura com veios em perspectiva
    mh = H - MESA
    rng = np.random.default_rng(seed)
    veio = np.zeros((mh, W))
    for esc, peso in [(90, 1.0), (22, .5), (6, .25)]:
        ruido = rng.random((max(2, mh // 3), max(2, W // esc)))
        veio += peso * np.asarray(Image.fromarray((ruido * 255).astype('uint8')).resize((W, mh), Image.BICUBIC)) / 255
    veio /= 1.75
    linhas = (np.arange(mh)[:, None] / mh) ** 1.7                 # perspectiva: veios mais finos perto do horizonte
    veio = veio + 0.18 * np.sin(linhas * 140 + veio * 9)
    perto = np.linspace(0, 1, mh)[:, None]
    cor_fundo, cor_frente = np.array([104, 68, 40.]), np.array([62, 38, 22.])
    madeira = cor_fundo * (1 - perto)[..., None] + cor_frente * perto[..., None]
    madeira = madeira * (0.80 + 0.32 * veio)[..., None]
    brilho = np.exp(-((perto - 0.12) / 0.10) ** 2) * 38           # reflexo das luzes na mesa
    madeira = madeira + brilho[..., None] * np.array([1, .75, .5])
    lados = np.abs(np.linspace(-1, 1, W))[None, :] ** 2 * 26         # vinheta lateral
    madeira = np.clip(madeira - lados[..., None], 0, 255)
    base.paste(Image.fromarray(madeira.astype('uint8')), (0, MESA))
    faixa = base.crop((0, MESA - 26, W, MESA + 26)).filter(ImageFilter.GaussianBlur(9)); base.paste(faixa, (0, MESA - 26))
    vin = Image.new('L', (W, H), 0); ImageDraw.Draw(vin).ellipse([-W * .35, -H * .25, W * 1.35, H * 1.2], fill=255)
    return Image.composite(base, Image.new('RGB', (W, H), (10, 6, 4)), vin.filter(ImageFilter.GaussianBlur(170)))

def fatia(larg):
    """Fatia de tronco vista de cima em perspectiva (topo claro com anéis, lateral de casca)."""
    sh = int(larg * 0.24); th = int(larg * 0.075)
    im = Image.new('RGBA', (larg + 8, sh + th + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([4, 4 + th, 4 + larg, 4 + th + sh], fill=(58, 36, 22, 255))              # lateral (casca)
    d.rectangle([4, 4 + sh // 2, 4 + larg, 4 + th + sh // 2], fill=(70, 44, 26, 255))
    d.ellipse([4, 4, 4 + larg, 4 + sh], fill=(196, 150, 100, 255))                      # topo
    for k in range(1, 9):                                                               # anéis
        f = k / 9; ex, ey = larg * f / 2, sh * f / 2
        d.ellipse([4 + larg / 2 - ex, 4 + sh / 2 - ey, 4 + larg / 2 + ex, 4 + sh / 2 + ey], outline=(160, 112, 70, 160), width=2)
    d.ellipse([4, 4, 4 + larg, 4 + sh], outline=(92, 58, 32, 255), width=max(3, larg // 60))  # borda da casca
    return im.filter(ImageFilter.GaussianBlur(0.7)), sh, th

# ---------------------------------------------------------------- separar forma e peça
def azul_frac(rgb, mask):
    hsv = np.asarray(rgb.convert('HSV')).astype(np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    silicone = (h > 165) & (h < 235) & (s > 0.28) & (v > 0.25)   # azul, azul-royal, verde-água
    m = mask & (v > 0.12)
    return (silicone & m).sum() / max(1, m.sum())

def separa(obj):
    a = np.asarray(obj.getchannel('A')) > 60
    rot, n = ndimage.label(ndimage.binary_closing(a, iterations=2))
    if n == 0: return None, obj
    areas = ndimage.sum(np.ones_like(rot), rot, range(1, n + 1))
    grandes = [i + 1 for i in np.flatnonzero(areas >= 0.08 * areas.max())]
    rgb = obj.convert('RGB')
    fr = {g: azul_frac(rgb, rot == g) for g in grandes}
    def corta(ids):
        m = np.isin(rot, ids)
        m = ndimage.binary_dilation(m, iterations=2)
        al = np.where(m, np.asarray(obj.getchannel('A')), 0).astype('uint8')
        im = obj.copy(); im.putalpha(Image.fromarray(al))
        return im.crop(im.getchannel('A').getbbox())
    if len(grandes) >= 2:
        molde = max(grandes, key=lambda g: fr[g])
        if fr[molde] > 0.35 and any(fr[g] < 0.30 for g in grandes if g != molde):
            outros = [g for g in grandes if g != molde]
            return corta([molde]), corta(outros)
        return None, corta(grandes)                    # não deu pra distinguir: tudo junto, como peça
    return (corta(grandes), None) if fr[grandes[0]] > 0.45 else (None, corta(grandes))


def componentes(obj, minimo=0.08):
    a = np.asarray(obj.getchannel('A')) > 60
    rot, n = ndimage.label(ndimage.binary_closing(a, iterations=2))
    if n == 0: return []
    areas = ndimage.sum(np.ones_like(rot), rot, range(1, n + 1))
    out = []
    for g in [i + 1 for i in np.flatnonzero(areas >= minimo * areas.max())]:
        m = ndimage.binary_dilation(rot == g, iterations=2)
        im = obj.copy(); im.putalpha(Image.fromarray(np.where(m, np.asarray(obj.getchannel('A')), 0).astype('uint8')))
        out.append((areas[g - 1], im.crop(im.getchannel('A').getbbox())))
    return out

def lado_a_lado(partes, gap_rel=0.08):
    """Junta várias peças lado a lado, com a base alinhada (mantém a escala real entre elas)."""
    if len(partes) == 1: return partes[0]
    gap = int(max(p.width for p in partes) * gap_rel)
    w = sum(p.width for p in partes) + gap * (len(partes) - 1); h = max(p.height for p in partes)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); x = 0
    for p in partes: im.paste(p, (x, h - p.height), p); x += p.width + gap
    return im

# ---------------------------------------------------------------- composição
def acabamento(im, s):
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    al = im.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # tira o halo claro
    rgb = ImageOps.autocontrast(im.convert('RGB'), cutoff=0.4)
    arr = np.asarray(rgb).astype(np.float32) * np.array([1.03, 1.0, 0.94])                        # luz quente da cena
    out = Image.fromarray(np.clip(arr, 0, 255).astype('uint8')); out.putalpha(al)
    return out

def sombra(base, cx, cy, larg, forte=0.6):
    yy, xx = np.mgrid[0:H, 0:W]
    s = forte * np.exp(-(((xx - cx) / (larg * .52)) ** 2 + ((yy - cy) / 10) ** 2) * 2)
    s += forte * .45 * np.exp(-(((xx - cx) / (larg * .72)) ** 2 + ((yy - cy - 8) / 30) ** 2) * 2)
    arr = np.asarray(base).astype(np.float32) * (1 - np.clip(s, 0, .9)[..., None])
    return Image.fromarray(arr.astype('uint8'))

def conjunto(fundo, obj):
    img = fundo.copy()
    s = min(0.86 * W / obj.width, 0.62 * H / obj.height)
    o = acabamento(obj, s); x = (W - o.width) // 2
    img = sombra(img, W / 2, BASE, o.width)
    img.paste(o, (x, BASE - o.height), o)
    return img

def compoe(fundo, molde, peca):
    img = fundo.copy()
    LARG_FATIA = 1.30
    if molde is not None and peca is not None:
        gap = 0.05 * W
        larg_total = lambda s: molde.width * s + gap + max(peca.width, peca.width * LARG_FATIA) * s
        s = min(0.92 * W / larg_total(1), 0.60 * H / max(molde.height, peca.height * 1.15))
        m, p = acabamento(molde, s), acabamento(peca, s)
        fl = int(p.width * LARG_FATIA)
        x0 = (W - (m.width + gap + fl)) / 2
        mx, px_c = int(x0), int(x0 + m.width + gap + fl / 2)
    elif peca is not None:
        s = min(0.80 * W / (peca.width * LARG_FATIA), 0.60 * H / peca.height)
        m, p = None, acabamento(peca, s); px_c = W // 2
    else:
        s = min(0.84 * W / molde.width, 0.60 * H / molde.height)
        m, p = acabamento(molde, s), None; mx = (W - m.width) // 2
    if m is not None:  # forma: direto na mesa
        img = sombra(img, mx + m.width / 2, BASE, m.width)
        img.paste(m, (int(mx), BASE - m.height), m)
    if p is not None:  # peça: sobre a fatia de tronco
        fl = int(p.width * LARG_FATIA)
        f, sh, th = fatia(fl)
        fy = BASE - th - sh - 4
        img = sombra(img, px_c, BASE - 2, fl, .7)
        img.paste(f, (int(px_c - f.width / 2), int(fy)), f)
        topo_c = fy + 4 + sh * 0.55
        img = sombra(img, px_c, topo_c, p.width * .9, .45)
        img.paste(p, (int(px_c - p.width / 2), int(topo_c - p.height)), p)
    return img

if __name__ == '__main__':
    rec, out = sys.argv[1], sys.argv[2]
    arqs = sys.argv[3:] or sorted(glob.glob(os.path.join(rec, '*/*.png')))
    MODOS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modos.json'))) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modos.json')) else {}
    fundo = cena(); os.makedirs(out, exist_ok=True)
    fundo.save(os.path.join(out, '_cena.jpg'), quality=88)
    tipos = {}
    for a in arqs:
        k = os.path.relpath(a, rec)
        obj = Image.open(a).convert('RGBA')
        modo = MODOS.get(k, 'auto')
        dst = os.path.join(out, k.replace('.png', '.jpg')); os.makedirs(os.path.dirname(dst), exist_ok=True)
        if modo == 'conjunto': img = conjunto(fundo, obj); tipos[k] = 'conjunto'
        elif modo == 'peca': img = compoe(fundo, None, obj); tipos[k] = 'so peca (manual)'
        elif modo == 'forma': img = compoe(fundo, obj, None); tipos[k] = 'so forma (manual)'
        elif modo == 'lado': img = compoe(fundo, None, lado_a_lado([p for _, p in componentes(obj)])); tipos[k] = 'pecas lado a lado'
        elif modo == 'par':
            cs = sorted(componentes(obj), key=lambda c: -c[0])
            if len(cs) >= 2: img = compoe(fundo, cs[0][1], lado_a_lado([p for _, p in cs[1:]])); tipos[k] = 'forma+peca (manual)'
            else: img = conjunto(fundo, obj); tipos[k] = 'conjunto (nao separou)'
        else:
            molde, peca = separa(obj)
            if modo == 'trocar': molde, peca = peca, molde
            tipos[k] = 'forma+peca' if (molde is not None and peca is not None) else ('so forma' if peca is None else 'so peca')
            img = compoe(fundo, molde, peca)
        img.save(dst, quality=86, optimize=True, progressive=True)
        print(tipos[k], k, flush=True)
    json.dump(tipos, open(os.path.join(out, '_tipos.json'), 'w'), indent=1)
