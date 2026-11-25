"""Etapa 1: recorta o produto de cada foto padronizada e guarda o PNG com transparência (reaproveitável).
Uso: recortes.py <raiz do site> <saida>"""
import sys, os, json
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage
from rembg import remove, new_session

# fotos que tinham etiqueta ou logo colado: filtro mais rígido de pedaços soltos
RIGIDO = {'diversos/1-hJ40HO0sUi-h3ZbkJTv9PYs3XicUnT0.jpg', 'diversos/1wp5fwzboQGp3o11HZhDn8iBRimHPsQM6.jpg',
          'flores-rosas/10bdMXYRqCAL9ReWXt1yAbc3zOvZg40mn.jpg', 'flores-rosas/1l6xOGDscat7fkSKpP_Z-G6AyHZLv2PhQ.jpg',
          'flores-rosas/1FNLKINYIelBr3sGJiUa43RAtAtRCxedX.jpg'}

def limpa(alpha, limiar):
    a = np.asarray(alpha).astype(np.float32)
    solido = a > 40
    rot, n = ndimage.label(solido)
    if n > 1:
        areas = ndimage.sum(solido, rot, range(1, n + 1))
        manter = np.isin(rot, 1 + np.flatnonzero(areas >= limiar * areas.max()))
        a = np.where(ndimage.binary_dilation(manter, iterations=3), a, 0)
    furos = ndimage.binary_fill_holes(a > 40) & (a <= 40)
    return Image.fromarray(np.where(furos, 255, a).clip(0, 255).astype('uint8'))

raiz, out = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(raiz, 'assets/catalogo/catalogo.json'), encoding='utf-8'))
alvos = [i['arquivo'].replace('assets/catalogo/', '') for c in d['categorias'] for i in c.get('itens', []) if i.get('padrao')]
sess = new_session('isnet-general-use')
for k in alvos:
    dst = os.path.join(out, k.replace('.jpg', '.png'))
    if os.path.exists(dst): continue
    im = ImageOps.exif_transpose(Image.open(os.path.join(raiz, 'assets/catalogo', k))).convert('RGB')
    rgba = remove(im, session=sess)
    rgba.putalpha(limpa(rgba.getchannel('A'), 0.2 if k in RIGIDO else 0.06))
    bb = rgba.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    rgba.crop(bb).save(dst)
    print('ok', k, flush=True)
print('FIM', len(alvos))
