// Personalizador: foto real da camisa (frente e costas) com a estampa
// aplicada por cima acompanhando as dobras e a luz do tecido.
// Gira em 3D (CSS) entre frente e costas e inclina com o ponteiro.
// Não depende de WebGL.

const W = 1000, H = 1250; // tamanho das imagens em img/camisas

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// ---------- preparo da foto: luminância suavizada e caixa da camisa ----------
function analyse(img) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const base = x.getImageData(0, 0, W, H);
  const s = 8, sw = W / s, sh = H / s;
  const small = document.createElement('canvas'); small.width = sw; small.height = sh;
  const sx = small.getContext('2d', { willReadFrequently: true });
  sx.imageSmoothingQuality = 'high';
  sx.drawImage(c, 0, 0, sw, sh);
  const sd = sx.getImageData(0, 0, sw, sh).data;
  const Ls = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) Ls[i] = (sd[i * 4] * 0.299 + sd[i * 4 + 1] * 0.587 + sd[i * 4 + 2] * 0.114) / 255 + 0.02;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  const d = base.data;
  for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) {
    if (d[(y * W + xx) * 4 + 3] > 128) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { base, Ls, sw, sh, s, box: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2 } };
}

function sampleLs(A, x, y) {
  const fx = Math.min(A.sw - 1.001, Math.max(0, x / A.s - 0.5)), fy = Math.min(A.sh - 1.001, Math.max(0, y / A.s - 0.5));
  const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, o = iy * A.sw + ix;
  const a = A.Ls[o], b = A.Ls[o + 1], c = A.Ls[o + A.sw], e = A.Ls[o + A.sw + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
}

// aplica a estampa sobre a foto: desloca pelas dobras e herda a luz do tecido.
// Só lê e grava o retângulo da estampa (mais o da estampa anterior, pra apagar).
function composite(A, printCanvas, out, full) {
  const pctx = printCanvas.getContext('2d', { willReadFrequently: true });
  const octx = out.getContext('2d');
  if (full) { octx.putImageData(A.base, 0, 0); out._rect = null; }
  const P = pctx.getImageData(0, 0, W, H).data;
  let bx0 = W, by0 = H, bx1 = -1, by1 = -1;
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    if (P[(y * W + x) * 4 + 3] > 0) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  }
  const cur = bx1 >= 0 ? [Math.max(0, bx0 - 24), Math.max(0, by0 - 24), Math.min(W - 1, bx1 + 24), Math.min(H - 1, by1 + 24)] : null;
  const old = out._rect;
  out._rect = cur;
  if (!cur && !old) return;
  const r = cur && old ? [Math.min(cur[0], old[0]), Math.min(cur[1], old[1]), Math.max(cur[2], old[2]), Math.max(cur[3], old[3])] : (cur || old);
  const rw = r[2] - r[0] + 1, rh = r[3] - r[1] + 1;
  const img = new ImageData(rw, rh);
  const o = img.data, b = A.base.data;
  for (let y = 0; y < rh; y++) {
    const src = ((r[1] + y) * W + r[0]) * 4;
    o.set(b.subarray(src, src + rw * 4), y * rw * 4);
  }
  if (cur) {
    for (let y = cur[1]; y <= cur[3]; y++) {
      for (let x = cur[0]; x <= cur[2]; x++) {
        const i = (y * W + x) * 4;
        const k = ((y - r[1]) * rw + (x - r[0])) * 4;
        if (b[i + 3] < 8) continue;
        const gx = sampleLs(A, x + 6, y) - sampleLs(A, x - 6, y);
        const gy = sampleLs(A, x, y + 6) - sampleLs(A, x, y - 6);
        const sx = Math.round(x + gx * 22), sy = Math.round(y + gy * 22);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const j = (sy * W + sx) * 4;
        const pa = P[j + 3] / 255;
        if (pa < 0.01) continue;
        const L = (b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114) / 255 + 0.02;
        const shade = Math.min(1.35, Math.max(0.55, L / sampleLs(A, x, y)));
        const a = pa * 0.97;
        o[k] = b[i] * (1 - a) + Math.min(255, P[j] * shade) * a;
        o[k + 1] = b[i + 1] * (1 - a) + Math.min(255, P[j + 1] * shade) * a;
        o[k + 2] = b[i + 2] * (1 - a) + Math.min(255, P[j + 2] * shade) * a;
      }
    }
  }
  octx.putImageData(img, r[0], r[1]);
}

// ---------- estampa ----------
function crownPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-40 * s, 22 * s); ctx.lineTo(-48 * s, -22 * s); ctx.lineTo(-22 * s, 0); ctx.lineTo(-14 * s, -32 * s); ctx.lineTo(0, -6 * s);
  ctx.lineTo(14 * s, -32 * s); ctx.lineTo(22 * s, 0); ctx.lineTo(48 * s, -22 * s); ctx.lineTo(40 * s, 22 * s); ctx.closePath();
}
function paint(ctx, mod, y0, y1) {
  if (!mod.gold) return mod.num;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#f3dc9a'); g.addColorStop(0.45, '#c9993d'); g.addColorStop(0.7, '#e8c977'); g.addColorStop(1, '#9a6e22');
  return g;
}

function drawFront(ctx, mod, box) {
  ctx.clearRect(0, 0, W, H);
  const { cx, y0, w, h } = box;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const ex = cx + w * 0.155, ey = y0 + h * 0.25, s = (h / 1100) * 0.95;
  ctx.save(); ctx.translate(ex, ey);
  ctx.fillStyle = paint(ctx, mod, -40 * s, 70 * s);
  crownPath(ctx, s); ctx.fill();
  ctx.fillRect(-40 * s, 27 * s, 80 * s, 9 * s);
  ctx.font = `400 ${44 * s}px Anton, Impact, sans-serif`;
  ctx.fillText('RG', 0, 64 * s);
  ctx.restore();
  ctx.fillStyle = mod.crest || mod.num;
  ctx.font = `800 ${h * 0.021}px Manrope, sans-serif`;
  ctx.fillText('FONTE', cx - w * 0.155, ey);
  const sy = y0 + h * 0.4;
  ctx.font = `400 ${h * 0.066}px Anton, Impact, sans-serif`;
  ctx.fillStyle = mod.sponsor || paint(ctx, mod, sy - h * 0.035, sy + h * 0.035);
  ctx.fillText('RICARDO GOMES', cx, sy, w * 0.42);
  ctx.font = `700 ${h * 0.0135}px Manrope, sans-serif`;
  ctx.fillText('M O D A   M A S C U L I N A', cx, sy + h * 0.048);
}

function drawBack(ctx, mod, box, nome, numero) {
  ctx.clearRect(0, 0, W, H);
  const { cx, y0, w, h } = box;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = mod.crest || mod.num;
  ctx.font = `700 ${h * 0.013}px Manrope, sans-serif`;
  ctx.fillText('JESUS É O DONO DO LUGAR', cx, y0 + h * 0.1);
  const outline = (txt, x, y, lw) => {
    if (!mod.stroke) return;
    ctx.lineWidth = lw; ctx.strokeStyle = mod.stroke; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y);
  };
  if (nome) {
    let size = h * 0.062;
    ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
    const maxW = w * 0.44;
    const tw = ctx.measureText(nome).width * 1.08;
    if (tw > maxW) size *= maxW / tw;
    ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
    const R = h * 1.6, ny = y0 + h * 0.21;
    const chars = [...nome];
    const sp = size * 0.07;
    const ws = chars.map((c) => ctx.measureText(c).width + sp);
    const total = ws.reduce((a, b) => a + b, 0) - sp;
    let ang = -total / R / 2;
    chars.forEach((c, i) => {
      const a = ang + (ws[i] - sp) / 2 / R;
      ctx.save();
      ctx.translate(cx + Math.sin(a) * R, ny + R - Math.cos(a) * R);
      ctx.rotate(a);
      outline(c, 0, 0, size * 0.09);
      ctx.fillStyle = paint(ctx, mod, -size / 2, size / 2);
      ctx.fillText(c, 0, 0);
      ctx.restore();
      ang += ws[i] / R;
    });
  }
  if (numero) {
    const size = h * 0.31, y = y0 + h * 0.43;
    ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
    outline(numero, cx, y, size * 0.05);
    ctx.fillStyle = paint(ctx, mod, y - size * 0.4, y + size * 0.4);
    ctx.fillText(numero, cx, y);
  }
}

// imagem enviada pelo cliente (foto ou vetor), posição relativa à caixa da camisa
function drawArt(ctx, art, box) {
  if (!art || !art.img) return;
  const { x0, y0, w, h } = box;
  const dw = w * art.s;
  const dh = dw * (art.img.height / art.img.width);
  ctx.save();
  ctx.translate(x0 + w * art.x, y0 + h * art.y);
  ctx.drawImage(art.img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// ---------- componente ----------
export function initManto(stage, { onSideChange, onDrag, onArtMove, reduced = false } = {}) {
  const scene = document.createElement('div'); scene.className = 'mshirt';
  const card = document.createElement('div'); card.className = 'mshirt__card';
  const front = document.createElement('canvas'); front.className = 'mshirt__face mshirt__face--front';
  const back = document.createElement('canvas'); back.className = 'mshirt__face mshirt__face--back';
  [front, back].forEach((c) => { c.width = W; c.height = H; });
  const shadow = document.createElement('div'); shadow.className = 'mshirt__shadow';
  const loading = document.createElement('div'); loading.className = 'mshirt__loading'; loading.textContent = 'Carregando a camisa…';
  card.append(front, back);
  scene.append(shadow, card, loading);
  stage.prepend(scene);

  const printF = document.createElement('canvas'); printF.width = W; printF.height = H;
  const printB = document.createElement('canvas'); printB.width = W; printB.height = H;
  const cache = new Map();
  function getModel(mod) {
    if (cache.has(mod.id)) {
      const p = cache.get(mod.id); cache.delete(mod.id); cache.set(mod.id, p); // mais recente no fim
      return p;
    }
    const p = Promise.all([loadImage(mod.front), loadImage(mod.back)]).then(([f, b]) => ({ front: analyse(f), back: analyse(b) }));
    p.catch(() => cache.delete(mod.id));
    cache.set(mod.id, p);
    while (cache.size > 2) cache.delete(cache.keys().next().value);
    return p;
  }

  let state = { modelo: null, nome: '', numero: '', art: null };
  let drawnFront = '', job = 0, artVer = 0;
  async function redraw() {
    const mod = state.modelo; if (!mod) return;
    const my = ++job;
    loading.classList.add('is-on');
    let M;
    try { M = await getModel(mod); } catch { loading.textContent = 'Não deu pra carregar a foto da camisa.'; return; }
    if (my !== job) return;
    loading.classList.remove('is-on');
    const art = state.art;
    const frontSig = mod.id + (art && art.side === 'front' ? ':' + artVer : '');
    const changed = drawnFront.split(':')[0] !== mod.id;
    if (frontSig !== drawnFront) {
      const fx = printF.getContext('2d');
      drawFront(fx, mod, M.front.box);
      if (art && art.side === 'front') drawArt(fx, art, M.front.box);
      composite(M.front, printF, front, changed);
      drawnFront = frontSig;
    }
    const bx = printB.getContext('2d');
    drawBack(bx, mod, M.back.box, state.nome, state.numero);
    if (art && art.side === 'back') drawArt(bx, art, M.back.box);
    composite(M.back, printB, back, changed);
    boxes = { front: M.front.box, back: M.back.box };
  }
  let pending = 0;
  const schedule = (ms = 60) => { clearTimeout(pending); pending = setTimeout(redraw, ms); };

  // ---------- rotação ----------
  let rotY = -0.5, target = 0, vel = 0, lastT = 0, dragging = false, lastX = 0, dragged = 0;
  let tiltX = 0, tiltY = 0, tX = 0, tY = 0, t = 0, demoDone = false, lastSide = 'front';
  let boxes = null, moving = false, artDrag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    if (moving && state.art) {
      artDrag = { x: e.clientX, y: e.clientY, ax: state.art.x, ay: state.art.y };
      try { stage.setPointerCapture(e.pointerId); } catch { /* ok */ }
      e.preventDefault();
      return;
    }
    dragging = true; lastX = e.clientX; vel = 0; dragged = 0; lastT = performance.now();
    try { stage.setPointerCapture(e.pointerId); } catch { /* ok */ }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!artDrag || !boxes || !state.art) return;
    const box = boxes[state.art.side];
    const k = W / card.clientWidth; // px da tela -> px da foto
    state.art.x = Math.min(0.95, Math.max(0.05, artDrag.ax + ((e.clientX - artDrag.x) * k) / box.w));
    state.art.y = Math.min(0.95, Math.max(0.05, artDrag.ay + ((e.clientY - artDrag.y) * k) / box.h));
    artVer++; schedule(16);
  });
  const endArt = () => { if (artDrag) { artDrag = null; onArtMove?.(state.art); } };
  stage.addEventListener('pointerup', endArt);
  stage.addEventListener('pointercancel', endArt);
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tX = ((e.clientY - r.top) / r.height - 0.5) * -10;
    tY = ((e.clientX - r.left) / r.width - 0.5) * 12;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    rotY += dx * 0.011; vel = dx * 0.011; lastT = performance.now();
    dragged += Math.abs(dx);
    if (dragged > 12 && onDrag) { onDrag(); onDrag = null; }
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (performance.now() - lastT > 90) vel = 0; // parou antes de soltar: não vira
    if (Math.abs(vel) > 0.04) target = (vel > 0 ? Math.ceil(rotY / Math.PI + 0.001) : Math.floor(rotY / Math.PI - 0.001)) * Math.PI;
    else target = Math.round(rotY / Math.PI) * Math.PI;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('pointerleave', () => { tX = 0; tY = 0; });

  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(stage);
  // primeira vez na tela: gira sozinha e mostra as costas com nome e número
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting || demoDone) return;
    demoDone = true; obs.disconnect();
    setTimeout(() => { if (!dragging && Math.abs(target) < 0.01) target = Math.PI; }, 900);
  }, { threshold: 0.6 }).observe(stage);

  let prev = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    if (!visible) return;
    if (!reduced) t += dt;
    if (!dragging) rotY += (target - rotY) * Math.min(1, dt * (reduced ? 20 : 4));
    const still = moving; // ajustando a imagem: camisa parada e de frente pro lado certo
    tiltX += ((still ? 0 : tX) - tiltX) * Math.min(1, dt * 5);
    tiltY += ((still ? 0 : tY) - tiltY) * Math.min(1, dt * 5);
    const deg = (rotY * 180) / Math.PI;
    const bob = reduced || still ? 0 : Math.sin(t * 1.1) * 6;
    const sway = reduced || dragging || still ? 0 : Math.sin(t * 0.6) * 2.5;
    card.style.transform = `translateY(${bob.toFixed(2)}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${(deg + tiltY + sway).toFixed(2)}deg)`;
    const facing = Math.abs(Math.cos(rotY));
    card.style.setProperty('--lit', (0.84 + 0.16 * facing).toFixed(3));
    shadow.style.transform = `translateX(-50%) scale(${(0.55 + 0.45 * facing - bob * 0.01).toFixed(3)}, 1)`;
    shadow.style.opacity = (0.5 + 0.4 * facing).toFixed(3);
    const side = Math.cos(rotY) >= 0 ? 'front' : 'back';
    if (side !== lastSide) { lastSide = side; onSideChange?.(side); }
  }
  requestAnimationFrame(tick);

  return {
    set(next) { state = { ...state, ...next }; schedule(); },
    preload(mods) {
      // só baixa as fotos (cache do navegador); o processamento acontece ao escolher
      const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
      idle(() => mods.forEach((m) => { new Image().src = m.front; new Image().src = m.back; }), { timeout: 6000 });
    },
    showBack() {
      if (Math.cos(target) > 0) target = (Math.round(rotY / Math.PI) + 1) * Math.PI;
    },
    flip() { target = (Math.round(rotY / Math.PI) + 1) * Math.PI; },
    showSide(side) {
      const k = Math.round(rotY / Math.PI);
      const isBack = Math.abs(k % 2) === 1;
      if ((side === 'back') !== isBack) target = (k + 1) * Math.PI; else target = k * Math.PI;
    },
    setArt(art) { state.art = art; artVer++; schedule(16); },
    setMoving(v) { moving = v; stage.classList.toggle('is-moving', v); },
    // prévia com frente e costas lado a lado, pra mandar no WhatsApp
    snapshot() {
      const c = document.createElement('canvas'); c.width = W * 2 + 120; c.height = H + 80;
      const x = c.getContext('2d');
      x.fillStyle = '#f5f1ea'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(front, 40, 40); x.drawImage(back, W + 80, 40);
      return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
    },
    get side() { return lastSide; },
  };
}
