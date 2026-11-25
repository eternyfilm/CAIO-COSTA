"""Cena fotográfica gerada pela OpenAI EM VOLTA do produto real (o produto não é redesenhado).
1) monta forma à esquerda e peça à direita com os recortes reais;  2) pede à API de edição de imagem
para criar mesa, fatia de tronco, luz, sombras e fundo, com o produto protegido por máscara;
3) recoloca por cima os pixels originais do produto, na mesma posição.
Uso: openai_cena.py <recortes> <saida> <modelo> <qualidade> <arquivo.png>..."""
import sys, os, json, base64, subprocess, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageFilter
import cena_post as cp

CW, CH = 1024, 1536            # tamanho de geração (retrato)
CROP = (0, 128, 1024, 1408)    # recorte final 4:5
BASE = 1190                    # linha onde os objetos pousam

PROMPT_PAR = ("Photorealistic product photograph for a handmade silicone mold brand. The objects already in the image are real "
  "products: keep them EXACTLY as they are, same shape, color, details, size and position; do not redraw, add or remove any of them. "
  "The object(s) on the LEFT are the silicone mold; the object(s) on the RIGHT are the finished pieces made with it. "
  "Build the scene around them: a dark warm walnut wooden tabletop; a round natural tree-trunk slice with rough bark and visible "
  "growth rings placed under the pieces on the right; the mold rests directly on the table. Background: cozy warm interior softly "
  "out of focus, golden fairy-light bokeh, a few pink flowers blurred at the edges, warm candlelight from the left. Add realistic "
  "contact shadows and subtle reflections on the wood. The camera angle and perspective of the table must match the angle the "
  "objects were photographed from. No text, no logo, no extra objects near the products.")
PROMPT_SO = ("Photorealistic product photograph for a handmade candle and silicone mold brand. The object already in the image is a real "
  "product: keep it EXACTLY as it is, same shape, color, details, size and position; do not redraw or duplicate it. Build the scene "
  "around it: it stands on a round natural tree-trunk slice with rough bark and growth rings, on a dark warm walnut wooden tabletop. "
  "Background: cozy warm interior softly out of focus, golden fairy-light bokeh, a few pink flowers blurred at the edges, warm "
  "candlelight from the left. Realistic contact shadow and subtle reflections. The camera angle of the table must match the angle "
  "the object was photographed from. No text, no logo, no extra objects near the product.")

def escala(im, s):
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)

def layout(obj, modo):
    """Devolve (lista de (imagem, x, y)) com os produtos posicionados no quadro de geração, e o tipo."""
    molde = pecas = None
    if modo == 'par':
        cs = sorted(cp.componentes(obj), key=lambda c: -c[0])
        if len(cs) >= 2: molde, pecas = cs[0][1], cp.lado_a_lado([p for _, p in cs[1:]])
    elif modo == 'auto':
        molde, pecas = cp.separa(obj)
        if molde is None or pecas is None: molde = pecas = None
    if modo == 'lado': obj = cp.lado_a_lado([p for _, p in cp.componentes(obj)])
    if molde is not None:
        gap = 60
        s = min((CW * 0.86 - gap) / (molde.width + pecas.width * 1.15), 560 / max(molde.height, pecas.height))
        m, p = escala(molde, s), escala(pecas, s)
        fl = int(p.width * 1.15); x0 = (CW - (m.width + gap + fl)) // 2
        return [(m, x0, BASE - m.height), (p, int(x0 + m.width + gap + (fl - p.width) / 2), BASE - 40 - p.height)], 'par'
    s = min(CW * 0.62 / obj.width, 640 / obj.height)
    o = escala(obj, s)
    return [(o, (CW - o.width) // 2, BASE - 40 - o.height)], 'so'

def gera(itens, prompt, modelo, qualidade, tmp):
    base = Image.new('RGB', (CW, CH), (70, 48, 32))       # dica de tom: madeira escura quente
    mask = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))       # transparente = a IA pode criar
    for im, x, y in itens:
        base.paste(im, (x, y), im)
        prot = im.getchannel('A').filter(ImageFilter.MaxFilter(5))   # protege o produto (com folga de 2 px)
        mask.paste(Image.new('RGBA', im.size, (0, 0, 0, 255)), (x, y), prot)
    pi, pm = os.path.join(tmp, 'in.png'), os.path.join(tmp, 'mask.png')
    base.save(pi); mask.save(pm)
    cmd = ['curl', '-s', 'https://api.openai.com/v1/images/edits', '-H', 'Authorization: Bearer proxy-injected',
           '-F', f'model={modelo}', '-F', f'image[]=@{pi}', '-F', f'mask=@{pm}', '--form-string', f'prompt={prompt}',
           '-F', f'size={CW}x{CH}', '-F', f'quality={qualidade}', '-F', 'n=1']
    if modelo.startswith('gpt-image-1'): cmd += ['-F', 'input_fidelity=high']   # só a família 1 aceita
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    d = json.loads(r.stdout or '{}')
    if 'data' not in d:
        raise RuntimeError(json.dumps(d)[:400])
    return Image.open(__import__('io').BytesIO(base64.b64decode(d['data'][0]['b64_json']))).convert('RGB'), d.get('usage')

def acha(out, im, x, y):
    """A IA às vezes move ou reescala o produto alguns pixels: procura onde ele ficou (escala + posição)."""
    import cv2
    g = cv2.cvtColor(np.asarray(out), cv2.COLOR_RGB2GRAY)
    melhor = (-1, 1.0, x, y)
    for s in np.linspace(0.85, 1.25, 17):
        t = escala(im, s); tg = cv2.cvtColor(np.asarray(t.convert('RGB')), cv2.COLOR_RGB2GRAY)
        m = (np.asarray(t.getchannel('A')) > 128).astype('uint8') * 255
        cx, cy = x + im.width / 2, y + im.height / 2; r = 120
        x0, y0 = int(max(0, cx - t.width / 2 - r)), int(max(0, cy - t.height / 2 - r))
        x1, y1 = int(min(CW, cx + t.width / 2 + r)), int(min(CH, cy + t.height / 2 + r))
        reg = g[y0:y1, x0:x1]
        if reg.shape[0] < tg.shape[0] or reg.shape[1] < tg.shape[1]: continue
        res = cv2.matchTemplate(reg, tg, cv2.TM_CCORR_NORMED, mask=m)
        _, v, _, p = cv2.minMaxLoc(res)
        if np.isfinite(v) and v > melhor[0]: melhor = (v, s, x0 + p[0], y0 + p[1])
    return melhor

def recoloca(gerada, itens):
    out = gerada.resize((CW, CH), Image.LANCZOS); info = []
    for im, x, y in itens:   # pixels originais do produto por cima, onde a IA o deixou: o produto nunca é redesenhado
        v, s, nx, ny = acha(out, im, x, y)
        t = escala(im, s); info.append(round(float(v), 3))
        al = t.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
        out.paste(t.convert('RGB'), (int(nx), int(ny)), al)
    return out.crop(CROP), info

if __name__ == '__main__':
    rec, saida, modelo, qualidade = sys.argv[1:5]
    modos = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modos.json')))
    os.makedirs(saida, exist_ok=True); log = {}
    for a in sys.argv[5:]:
        k = os.path.relpath(a, rec)
        modo = modos.get(k, 'auto')
        if modo in ('conjunto', 'forma', 'peca'): modo = 'inteiro'
        itens, tipo = layout(Image.open(a).convert('RGBA'), modo)
        with tempfile.TemporaryDirectory() as tmp:
            try:
                img, uso = gera(itens, PROMPT_PAR if tipo == 'par' else PROMPT_SO, modelo, qualidade, tmp)
            except Exception as e:
                print('FALHOU', k, str(e)[:300], flush=True); continue
        dst = os.path.join(saida, k.replace('.png', '.jpg')); os.makedirs(os.path.dirname(dst), exist_ok=True)
        img.resize((CW, CH)).save(dst.replace('.jpg', '-ia-bruta.jpg'), quality=88)
        final, casamento = recoloca(img, itens); final.save(dst, quality=90)
        log[k] = {'tipo': tipo, 'casamento': casamento}; print('ok', tipo, k, 'casamento', casamento, flush=True)
    json.dump(log, open(os.path.join(saida, '_log.json'), 'a'), indent=1)
