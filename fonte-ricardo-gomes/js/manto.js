// Personalizador 3D: camisa "inflada" (frente e costas presas pela silhueta),
// textura desenhada em canvas com nome, número e modelo escolhido.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

// caixa da silhueta em unidades da camisa
const BX0 = -1.7, BX1 = 1.7, BY0 = -1.45, BY1 = 1.35;
const BW = BX1 - BX0, BH = BY1 - BY0;
const TEX_W = 1024, TEX_H = Math.round(1024 * (BH / BW));

function shirtPath(ctx, sx, sy) {
  // sx/sy convertem unidade -> pixel
  const P = (x, y) => [sx(x), sy(y)];
  ctx.beginPath();
  ctx.moveTo(...P(-0.36, 1.28));
  ctx.quadraticCurveTo(...P(-0.7, 1.24), ...P(-0.98, 1.1));
  ctx.lineTo(...P(-1.66, 0.58));
  ctx.lineTo(...P(-1.34, 0.12));
  ctx.lineTo(...P(-0.9, 0.46));
  ctx.quadraticCurveTo(...P(-0.84, -0.4), ...P(-0.92, -1.3));
  ctx.quadraticCurveTo(...P(0, -1.42), ...P(0.92, -1.3));
  ctx.quadraticCurveTo(...P(0.84, -0.4), ...P(0.9, 0.46));
  ctx.lineTo(...P(1.34, 0.12));
  ctx.lineTo(...P(1.66, 0.58));
  ctx.lineTo(...P(0.98, 1.1));
  ctx.quadraticCurveTo(...P(0.7, 1.24), ...P(0.36, 1.28));
  ctx.quadraticCurveTo(...P(0, 0.94), ...P(-0.36, 1.28));
  ctx.closePath();
}

const texSX = (x) => ((x - BX0) / BW) * TEX_W;
const texSY = (y) => ((BY1 - y) / BH) * TEX_H;
const PX = TEX_W / BW; // pixels por unidade

// ---------- geometria inflada ----------
function buildGeometries() {
  const GX = 170, GY = Math.round(GX * (BH / BW));
  const mc = document.createElement('canvas');
  mc.width = GX + 1; mc.height = GY + 1;
  const mctx = mc.getContext('2d', { willReadFrequently: true });
  mctx.fillStyle = '#fff';
  shirtPath(mctx, (x) => ((x - BX0) / BW) * GX, (y) => ((BY1 - y) / BH) * GY);
  mctx.fill();
  const raw = mctx.getImageData(0, 0, GX + 1, GY + 1).data;
  const NX = GX + 1, NY = GY + 1;
  let m = new Float32Array(NX * NY);
  for (let i = 0; i < NX * NY; i++) m[i] = raw[i * 4 + 3] / 255;
  const mask = m.slice();

  // blur separável (3 passadas de box blur)
  const r = 7;
  const tmp = new Float32Array(NX * NY);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < NX) { s += m[y * NX + xx]; } n++; }
        tmp[y * NX + x] = s / n;
      }
    }
    for (let y = 0; y < NY; y++) {
      for (let x = 0; x < NX; x++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < NY) { s += tmp[yy * NX + x]; } n++; }
        m[y * NX + x] = s / n;
      }
    }
  }

  const DEPTH = 0.24, BEND = 0.11;
  function side(sign) {
    const pos = new Float32Array(NX * NY * 3);
    const uv = new Float32Array(NX * NY * 2);
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        const x = BX0 + (i / GX) * BW;
        const y = BY1 - (j / GY) * BH;
        const p = Math.min(1, Math.max(0, (m[k] - 0.5) * 2));
        const z = sign * Math.sqrt(p) * DEPTH - BEND * x * x;
        pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
        const u = i / GX;
        uv[k * 2] = sign > 0 ? u : 1 - u;
        uv[k * 2 + 1] = 1 - j / GY;
      }
    }
    const idx = [];
    for (let j = 0; j < GY; j++) {
      for (let i = 0; i < GX; i++) {
        const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
        if (mask[a] + mask[b] + mask[c] + mask[d] < 0.01) continue;
        if (sign > 0) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  return { front: side(1), back: side(-1) };
}

// ---------- texturas ----------
function drawCrown(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, 22); ctx.lineTo(-48, -22); ctx.lineTo(-22, 0); ctx.lineTo(-14, -32); ctx.lineTo(0, -6);
  ctx.lineTo(14, -32); ctx.lineTo(22, 0); ctx.lineTo(48, -22); ctx.lineTo(40, 22); ctx.closePath();
  ctx.fill();
  ctx.fillRect(-40, 27, 80, 9);
  ctx.restore();
}

function drawPattern(ctx, mod) {
  const W = TEX_W, H = TEX_H;
  ctx.fillStyle = mod.base;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  switch (mod.padrao) {
    case 'listras': {
      const band = 0.2 * PX;
      ctx.fillStyle = mod.alt;
      for (let y = texSY(1.0); y < H; y += band * 2) ctx.fillRect(0, y, W, band);
      break;
    }
    case 'diagonal': {
      ctx.strokeStyle = mod.alt; ctx.lineWidth = 10;
      for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(212,164,64,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'faixas-sutis': {
      ctx.fillStyle = mod.alt;
      for (let x = texSX(-0.9); x < texSX(0.9); x += 0.24 * PX) ctx.fillRect(x, 0, 0.12 * PX, H);
      break;
    }
    case 'gradiente': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mod.base); g.addColorStop(1, mod.alt);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'geometrico': {
      ctx.fillStyle = mod.alt;
      const s = 0.22 * PX;
      for (let y = 0; y < H; y += s) {
        for (let x = 0; x < W; x += s) {
          if (((x / s) + (y / s)) % 2 < 1) continue;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.closePath(); ctx.fill();
        }
      }
      break;
    }
  }
  ctx.restore();

  // punhos e gola
  ctx.save();
  ctx.strokeStyle = mod.trim;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.09 * PX;
  ctx.beginPath(); ctx.moveTo(texSX(-1.66), texSY(0.58)); ctx.lineTo(texSX(-1.34), texSY(0.12)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(texSX(1.66), texSY(0.58)); ctx.lineTo(texSX(1.34), texSY(0.12)); ctx.stroke();
  ctx.lineWidth = 0.1 * PX;
  ctx.beginPath();
  ctx.moveTo(texSX(-0.38), texSY(1.29));
  ctx.quadraticCurveTo(texSX(0), texSY(0.92), texSX(0.38), texSY(1.29));
  ctx.stroke();
  // faixa lateral fina
  ctx.lineWidth = 0.035 * PX;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(texSX(-0.89), texSY(0.44)); ctx.quadraticCurveTo(texSX(-0.83), texSY(-0.4), texSX(-0.9), texSY(-1.28)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(texSX(0.89), texSY(0.44)); ctx.quadraticCurveTo(texSX(0.83), texSY(-0.4), texSX(0.9), texSY(-1.28)); ctx.stroke();
  ctx.restore();
}

function fabricOverlay(ctx) {
  // micro furos do dry-fit + sombra suave nas bordas
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let y = 0; y < TEX_H; y += 6) {
    for (let x = (y / 6) % 2 ? 3 : 0; x < TEX_W; x += 6) ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawArcText(ctx, text, cx, cy, radius, size, fill, stroke) {
  ctx.save();
  ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const spacing = size * 0.06;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let angle = -total / radius / 2;
  [...text].forEach((ch, i) => {
    const w = widths[i];
    const a = angle + (w - spacing) / 2 / radius;
    ctx.save();
    ctx.translate(cx + Math.sin(a) * radius, cy + radius - Math.cos(a) * radius);
    ctx.rotate(a);
    if (stroke) { ctx.lineWidth = size * 0.09; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(ch, 0, 0); }
    ctx.fillStyle = fill; ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += w / radius;
  });
  ctx.restore();
}

function drawFront(ctx, mod) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  shirtPath(ctx, texSX, texSY);
  ctx.clip();
  drawPattern(ctx, mod);
  // escudo (peito esquerdo de quem veste = direita de quem olha)
  drawCrown(ctx, texSX(0.46), texSY(0.74), 0.0042 * PX, mod.trim);
  ctx.font = `400 ${0.1 * PX}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = mod.trim;
  ctx.fillText('RG', texSX(0.46), texSY(0.5));
  // marca do outro lado
  ctx.font = `700 ${0.075 * PX}px Manrope, sans-serif`;
  ctx.fillText('FONTE', texSX(-0.46), texSY(0.74));
  // patrocínio central
  ctx.font = `400 ${0.24 * PX}px Anton, Impact, sans-serif`;
  ctx.fillStyle = mod.num;
  ctx.fillText('RICARDO GOMES', texSX(0), texSY(0.12), 1.25 * PX);
  ctx.font = `700 ${0.05 * PX}px Manrope, sans-serif`;
  ctx.fillText('MODA MASCULINA', texSX(0), texSY(-0.06));
  fabricOverlay(ctx);
  ctx.restore();
}

function drawBack(ctx, mod, nome, numero) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  shirtPath(ctx, texSX, texSY);
  ctx.clip();
  drawPattern(ctx, mod);
  // nuca
  ctx.font = `700 ${0.05 * PX}px Manrope, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = mod.trim;
  ctx.fillText('JESUS É O DONO DO LUGAR', texSX(0), texSY(0.97));
  // nome em arco
  const n = (nome || '').toUpperCase().slice(0, 12);
  if (n) {
    let size = 0.27 * PX;
    ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
    const maxW = 1.45 * PX;
    const w = ctx.measureText(n).width * 1.08;
    if (w > maxW) size *= maxW / w;
    drawArcText(ctx, n, texSX(0), texSY(0.68), 3.2 * PX, size, mod.num, mod.numStroke);
  }
  // número
  const num = String(numero ?? '').slice(0, 2);
  if (num) {
    ctx.font = `400 ${1.05 * PX}px Anton, Impact, sans-serif`;
    ctx.lineWidth = 0.05 * PX; ctx.strokeStyle = mod.numStroke; ctx.lineJoin = 'round';
    ctx.strokeText(num, texSX(0), texSY(-0.22));
    ctx.fillStyle = mod.num;
    ctx.fillText(num, texSX(0), texSY(-0.22));
  }
  fabricOverlay(ctx);
  ctx.restore();
}

function bumpTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#7a7a7a';
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    x.beginPath(); x.arc(i * 8 + (j % 2 ? 4 : 0), j * 8 + 4, 1.6, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 22);
  return t;
}

export function initManto(canvas, { onSideChange } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.05, 8.2);

  const key = new THREE.DirectionalLight(0xfff1d6, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe0b04f, 2.4); rim.position.set(4, 2, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xe0b04f, 1.4); rim2.position.set(-4, 1, -3); scene.add(rim2);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const { front, back } = buildGeometries();

  const fc = document.createElement('canvas'); fc.width = TEX_W; fc.height = TEX_H;
  const bc = document.createElement('canvas'); bc.width = TEX_W; bc.height = TEX_H;
  const fctx = fc.getContext('2d'), bctx = bc.getContext('2d');
  const ftex = new THREE.CanvasTexture(fc), btex = new THREE.CanvasTexture(bc);
  [ftex, btex].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });
  const bump = bumpTexture();

  const uTime = { value: 0 };
  function makeMat(map) {
    const mat = new THREE.MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: 0.35,
      roughness: 0.62, metalness: 0,
      sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8a7550),
      envMapIntensity: 0.32,
      alphaTest: 0.5,
    });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sl = smoothstep(0.8, 1.7, abs(position.x));
         transformed.z += sin(position.y * 2.4 + uTime * 1.5) * 0.028 + sin(position.x * 2.6 + uTime * 1.1) * 0.018;
         transformed.y += sin(uTime * 1.3 + position.x) * 0.02 * sl;`
      );
    };
    return mat;
  }
  const shirt = new THREE.Group();
  shirt.add(new THREE.Mesh(front, makeMat(ftex)));
  shirt.add(new THREE.Mesh(back, makeMat(btex)));
  scene.add(shirt);

  let state = { modelo: null, nome: '', numero: '' };
  function redraw() {
    if (!state.modelo) return;
    drawFront(fctx, state.modelo);
    drawBack(bctx, state.modelo, state.nome, state.numero);
    ftex.needsUpdate = true; btex.needsUpdate = true;
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // garante a camisa inteira visível
    const needH = 3.5, needW = 4.0;
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(needH / visH, needW / (visH * camera.aspect));
    camera.position.z = dist;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // rotação por arrasto com inércia e encaixe em frente/costas
  let rotY = -0.35, target = 0, vel = 0, dragging = false, lastX = 0, tiltX = 0, tiltTarget = 0;
  let lastSide = 'front';
  const stage = canvas.parentElement;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; vel = 0;
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    rotY += dx * 0.012; vel = dx * 0.012;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    target = Math.round((rotY + vel * 8) / Math.PI) * Math.PI;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('pointerleave', () => { tiltTarget = 0; end(); });

  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    uTime.value += dt;
    if (!dragging) rotY += (target - rotY) * Math.min(1, dt * 3.2);
    tiltX += (tiltTarget - tiltX) * Math.min(1, dt * 4);
    shirt.rotation.y = rotY + (dragging ? 0 : Math.sin(uTime.value * 0.6) * 0.06);
    shirt.rotation.x = tiltX;
    shirt.position.y = Math.sin(uTime.value * 0.9) * 0.05;
    const side = Math.cos(rotY) >= 0 ? 'front' : 'back';
    if (side !== lastSide) { lastSide = side; onSideChange?.(side); }
    renderer.render(scene, camera);
  }
  tick();

  return {
    set(next) {
      state = { ...state, ...next };
      redraw();
    },
    showBack() {
      const k = Math.round(target / Math.PI);
      if (Math.abs(k % 2) !== 1) target = (k + 1) * Math.PI;
    },
    flip() {
      const k = Math.round(rotY / Math.PI);
      target = (k + 1) * Math.PI;
    },
    get side() { return lastSide; },
  };
}
