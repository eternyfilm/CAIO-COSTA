/* Moldes e Art v2: cena 3D do hero. Moldes de silicone e peças de cera flutuando numa janela clara;
   o cursor (ou o dedo) empurra as peças, elas trombam entre si e voltam devagar para o lugar. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('gl');
const janela = document.getElementById('janela');
const dica = document.getElementById('dica');
const cel = innerWidth < 760;
const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio, cel ? 1.6 : 1.8);
renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const cena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(cel ? 42 : 34, 1, 0.1, 100);
camera.position.set(0, 0, 15);

const sol = new THREE.DirectionalLight(0xfff4e6, 1.4);
sol.position.set(4, 7, 8);
cena.add(sol, new THREE.HemisphereLight(0xf4f0ff, 0xd9c8b4, 0.6));

// ---------- formas ----------
function retArred(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function polar(fr, n = 160, Classe = THREE.Shape) {
  const s = new Classe();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, r = fr(a);
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}
const flor = (r, petalas, Classe) => polar((a) => r * (0.7 + 0.3 * Math.pow(Math.abs(Math.cos((petalas * a) / 2)), 0.7)), 180, Classe);
const canelada = (r, n) => polar((a) => r * (1 + 0.055 * Math.cos(n * a)), 200);
function coracao(e) {
  const s = new THREE.Shape();
  s.moveTo(0, -1 * e);
  s.bezierCurveTo(-0.2 * e, -0.75 * e, -1.1 * e, -0.3 * e, -1.05 * e, 0.3 * e);
  s.bezierCurveTo(-1 * e, 0.85 * e, -0.3 * e, 1.05 * e, 0, 0.55 * e);
  s.bezierCurveTo(0.3 * e, 1.05 * e, 1 * e, 0.85 * e, 1.05 * e, 0.3 * e);
  s.bezierCurveTo(1.1 * e, -0.3 * e, 0.2 * e, -0.75 * e, 0, -1 * e);
  return s;
}
const extr = (forma, prof, bisel, seg = 5) => {
  const g = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel * 0.9, bevelSegments: seg, curveSegments: 48 });
  g.center(); return g;
};

// molde: bloco de silicone com a cavidade em flor (o fundo da cavidade é uma placa atrás)
const gMoldeFrente = (() => { const s = retArred(2.5, 2.1, 0.42); s.holes.push(polar((a) => 0.8 * (0.66 + 0.34 * Math.pow(Math.abs(Math.cos((5 * a) / 2)), 0.5)), 180, THREE.Path)); return extr(s, 0.42, 0.14); })();
const gMoldeFundo = extr(retArred(2.5, 2.1, 0.42), 0.2, 0.08);
const gFlor5 = extr(flor(0.62, 5), 0.32, 0.22, 6);
const gFlor6 = extr(flor(0.58, 6), 0.3, 0.2, 6);
const gVela = (() => { const g = extr(canelada(0.52, 14), 1.7, 0.1); g.rotateX(Math.PI / 2); return g; })();
const gPavio = new THREE.CylinderGeometry(0.025, 0.025, 0.28, 8);
const gCoracao = extr(coracao(0.55), 0.3, 0.2, 6);
const gGota = (() => {
  const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI; pts.push(new THREE.Vector2(Math.sin(a) * 0.55 * Math.pow(1 - t, 0.85) * (t < 0.02 ? 0 : 1), -Math.cos(a) * 0.62 + t * 0.5)); }
  return new THREE.LatheGeometry(pts, 48);
})();

// ---------- materiais (cores tiradas das fotos do catálogo) ----------
const silicone = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff') });
const cera = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.58, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color('#fff6e8'), clearcoat: 0.08 });
const M = {
  azul: silicone('#93B2EE'), azul2: silicone('#7FA0E6'), fundo: silicone('#6F92DD'),
  rosa: cera('#F2B3C1'), creme: cera('#F4E5C6'), ambar: cera('#F1B45A'), salvia: cera('#BCD0B2'), vermelho: cera('#D9475A'),
  pavio: new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 0.9 }),
};

// ---------- peças ----------
function molde(mat) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(gMoldeFrente, mat), b = new THREE.Mesh(gMoldeFundo, M.fundo);
  b.position.z = -0.27; g.add(f, b); g.userData.raio = 1.45; return g;
}
function vela(mat) {
  const g = new THREE.Group();
  const c = new THREE.Mesh(gVela, mat), p = new THREE.Mesh(gPavio, M.pavio);
  p.position.y = 0.98; g.add(c, p); g.userData.raio = 1.0; return g;
}
const simples = (geo, mat, raio) => { const m = new THREE.Mesh(geo, mat); m.userData.raio = raio; return m; };

// [fábrica, x, y, z, escala]  (x e y em fração da área visível; o rodapé da janela fica mais livre por causa do texto)
const RECEITA = [
  [() => molde(M.azul), -0.62, 0.38, -0.6, 1.0], [() => molde(M.azul2), 0.6, -0.08, -1.2, 1.1],
  [() => vela(M.creme), -0.18, 0.12, 0.4, 1.0], [() => vela(M.rosa), 0.82, 0.55, -1.8, 0.9],
  [() => simples(gFlor5, M.rosa, 0.75), 0.22, 0.55, 0.2, 1.0], [() => simples(gFlor6, M.ambar, 0.7), -0.85, -0.2, 0.0, 0.95],
  [() => simples(gCoracao, M.vermelho, 0.7), 0.34, -0.38, 1.0, 0.9], [() => simples(gFlor5, M.creme, 0.75), 0.95, -0.55, -0.6, 0.9],
  [() => simples(gGota, M.salvia, 0.65), -0.42, -0.5, 0.8, 0.9], [() => simples(gFlor6, M.salvia, 0.7), -0.05, 0.82, -1.4, 0.85],
  [() => vela(M.ambar), -1.0, 0.75, -2.2, 0.85], [() => simples(gCoracao, M.rosa, 0.7), 0.05, -0.05, -2.4, 0.85],
  [() => simples(gGota, M.ambar, 0.65), 0.62, 0.9, 0.6, 0.75], [() => simples(gFlor5, M.azul, 0.75), -0.7, 0.92, 0.5, 0.75],
];
const receita = cel ? RECEITA.filter((_, i) => [0, 1, 2, 4, 5, 6, 8, 9, 12].includes(i)) : RECEITA;
const pecas = receita.map(([fab, fx, fy, z, esc], i) => {
  const o = fab();
  o.scale.setScalar(esc * (cel ? 0.82 : 1));
  o.rotation.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2);
  cena.add(o);
  return {
    o, fx, fy, z, raio: o.userData.raio * esc * (cel ? 0.82 : 1),
    casa: new THREE.Vector3(), p: new THREE.Vector3(fx * 6, fy * 4 - 12 - i * 0.7, z), v: new THREE.Vector3(),
    w: new THREE.Vector3((Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.006, (Math.random() - 0.5) * 0.004),
    fase: Math.random() * 6.28, freq: 0.5 + Math.random() * 0.5, atraso: i * 0.07,
  };
});

// ---------- tamanho ----------
let L = 1, A = 1, meiaA = 1, meiaL = 1;
function ajusta() {
  const r = janela.getBoundingClientRect();
  L = Math.max(1, r.width); A = Math.max(1, r.height);
  renderer.setSize(L, A, false);
  camera.aspect = L / A; camera.updateProjectionMatrix();
  meiaA = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  meiaL = meiaA * camera.aspect;
  pecas.forEach((c) => c.casa.set(c.fx * meiaL * 0.92, c.fy * meiaA * 0.9 + (c.fy < -0.3 ? 0.4 : 0), c.z));
  sujo = true;
}
new ResizeObserver(ajusta).observe(janela);

// ---------- ponteiro ----------
const mira = new THREE.Vector3(999, 999, 0), miraAnt = new THREE.Vector3(999, 999, 0), miraVel = new THREE.Vector3();
let ativo = false, tocou = false;
function paraMundo(ex, ey, alvo) {
  const r = canvas.getBoundingClientRect();
  const nx = ((ex - r.left) / r.width) * 2 - 1, ny = -((ey - r.top) / r.height) * 2 + 1;
  alvo.set(nx * meiaL, ny * meiaA, 0);
}
function some() { if (!tocou) { tocou = true; dica && dica.classList.add('fora'); } }
canvas.addEventListener('pointermove', (e) => { paraMundo(e.clientX, e.clientY, mira); ativo = true; if (e.pointerType !== 'mouse') some(); else if (Math.abs(mira.x - miraAnt.x) > 0.6) some(); });
canvas.addEventListener('pointerdown', (e) => {
  paraMundo(e.clientX, e.clientY, mira); ativo = true; some();
  // toque: uma "onda" que espalha as peças em volta do dedo
  pecas.forEach((c) => {
    const d = c.p.clone().sub(mira); d.z = 0; const dist = d.length();
    if (dist < 4.5) { d.normalize().multiplyScalar((1 - dist / 4.5) * 0.55); c.v.add(d); c.w.x += d.y * 0.05; c.w.y -= d.x * 0.05; }
  });
});
canvas.addEventListener('pointerleave', () => { ativo = false; mira.set(999, 999, 0); });

// ---------- rolagem: as peças sobem um pouco quando o hero sai da tela ----------
let rolagem = 0;
addEventListener('scroll', () => { rolagem = Math.min(1, scrollY / Math.max(1, A)); }, { passive: true });

// ---------- laço ----------
let visivel = true, sujo = true, rodando = false, t0 = performance.now(), ultimo = t0, iniciou = false, tInicio = 0;
new IntersectionObserver(([en]) => { visivel = en.isIntersecting; if (visivel) liga(); }, { rootMargin: '80px' }).observe(janela);
document.addEventListener('visibilitychange', () => { if (!document.hidden) liga(); });

const tmp = new THREE.Vector3();
const quadros = []; let qualidadeVista = false;
function passo(dt, t) {
  miraVel.copy(mira).sub(miraAnt); miraAnt.copy(mira);
  if (miraVel.lengthSq() > 4) miraVel.set(0, 0, 0); // pulo de entrada do cursor não conta como empurrão
  const R = cel ? 2.6 : 2.3;
  for (const c of pecas) {
    const solto = iniciou && (t - tInicio) / 1000 > c.atraso;
    // alvo: casa + flutuação + subida com a rolagem
    tmp.copy(c.casa);
    tmp.y += Math.sin(t * 0.0006 * c.freq + c.fase) * 0.18 + rolagem * (1.5 + c.z * 0.4);
    tmp.x += Math.cos(t * 0.0005 * c.freq + c.fase) * 0.1;
    if (solto) c.v.addScaledVector(tmp.sub(c.p), 0.012 * dt);
    // empurrão do ponteiro
    if (ativo) {
      const dx = c.p.x - mira.x, dy = c.p.y - mira.y, dist = Math.hypot(dx, dy);
      if (dist < R) {
        const f = Math.pow(1 - dist / R, 2) * 0.045 * dt;
        c.v.x += (dx / (dist || 1)) * f + miraVel.x * 0.06; c.v.y += (dy / (dist || 1)) * f + miraVel.y * 0.06;
        c.w.x += -miraVel.y * 0.004; c.w.y += miraVel.x * 0.004;
      }
    }
  }
  // trombadas (esferas simples, só no plano da tela)
  for (let i = 0; i < pecas.length; i++) for (let j = i + 1; j < pecas.length; j++) {
    const a = pecas[i], b = pecas[j];
    if (Math.abs(a.p.z - b.p.z) > 1.4) continue;
    const dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, d = Math.hypot(dx, dy), min = (a.raio + b.raio) * 0.78;
    if (d < min && d > 0.0001) {
      const s = ((min - d) / d) * 0.5 * 0.08 * dt;
      a.v.x -= dx * s; a.v.y -= dy * s; b.v.x += dx * s; b.v.y += dy * s;
    }
  }
  const amort = Math.pow(0.9, dt), amortW = Math.pow(0.985, dt);
  for (const c of pecas) {
    c.v.multiplyScalar(amort); c.p.addScaledVector(c.v, dt);
    c.w.multiplyScalar(amortW);
    c.w.x += (Math.sin(c.fase) * 0.0015 - c.w.x) * 0.01 * dt; c.w.y += (Math.cos(c.fase) * 0.002 - c.w.y) * 0.01 * dt;
    c.o.position.copy(c.p);
    c.o.rotation.x += c.w.x * dt; c.o.rotation.y += c.w.y * dt; c.o.rotation.z += c.w.z * dt;
  }
  camera.position.x += (((ativo ? mira.x : 0) / Math.max(meiaL, 1)) * 0.35 - camera.position.x) * 0.03 * dt;
  camera.lookAt(0, 0, 0);
}
function quadro(agora) {
  if (!visivel || document.hidden) { rodando = false; return; }
  const dt = Math.min(3, (agora - ultimo) / 16.667); ultimo = agora;
  if (!calmo) passo(dt, agora);
  renderer.render(cena, camera);
  // qualidade adaptativa: se os primeiros quadros estão lentos, baixa a resolução
  if (!qualidadeVista && iniciou) {
    quadros.push(dt);
    if (quadros.length === 50) {
      qualidadeVista = true;
      const media = quadros.slice(10).reduce((s, x) => s + x, 0) / 40;
      if (media > 1.35 && pr > 1) { pr = 1; renderer.setPixelRatio(pr); ajusta(); }
    }
  }
  requestAnimationFrame(quadro);
}
function liga() { if (rodando || !visivel) return; rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); }

async function inicia() {
  ajusta();
  if (calmo) pecas.forEach((c) => c.p.copy(c.casa));
  try { await renderer.compileAsync(cena, camera); } catch (e) { /* navegador sem compileAsync: compila no primeiro quadro */ }
  renderer.render(cena, camera);
  window.__3dOk = true;
  dispatchEvent(new Event('cena-pronta'));
  // as peças só sobem quando o loader sai
  setTimeout(() => { iniciou = true; tInicio = performance.now(); }, 900);
  liga();
}
inicia();
