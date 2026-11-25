/* Moldes e Art — cena 3D (Three.js). Canvas fixo; cada grupo se ancora na seção correspondente. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const loader = $('#loader'), ldFill = $('#ldFill');
const setLoad = (v) => { if (ldFill) ldFill.style.width = v + '%'; };
const tiraLoader = () => loader && loader.classList.add('fora');
setLoad(55);
setTimeout(tiraLoader, 7000); // nunca prender a pessoa no loader

const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const celular = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------- renderer
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !celular, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('sem-3d'); canvas.remove(); tiraLoader();
  throw e;
}
// 1.8 com bloom em tela cheia pesava demais em PC fraco; a qualidade ainda cai sozinha se o FPS não segurar (ver "qualidade adaptativa")
const PR_INICIAL = Math.min(devicePixelRatio, celular ? 1.25 : 1.5);
renderer.setPixelRatio(PR_INICIAL);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#030712');
scene.fog = new THREE.Fog('#030712', 9, 20);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0, 0, 8);

// ambiente de reflexo próprio: estúdio escuro com softbox branca em cima e painéis azuis nas laterais
// (é o que dá o cromado "azul e prata" do logo, sem estourar)
function ambienteEstudio() {
  const env = new THREE.Scene();
  env.background = new THREE.Color('#02040a');
  const painel = (w, h, cor, força, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(força), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  painel(6, 2.2, '#ffffff', 2.2, [0, 5, 0], [Math.PI / 2, 0, 0]);          // softbox de cima
  painel(2.2, 7, '#1f8bff', 3.0, [-5.5, 0, -1], [0, Math.PI / 2, 0]);       // azul esquerda
  painel(1.4, 7, '#41b8ff', 2.4, [5.5, 0.5, -2], [0, -Math.PI / 2, 0]);     // azul direita
  painel(4, 0.6, '#ffffff', 1.2, [0, 1.5, 6], [0, Math.PI, 0]);            // filete frontal
  painel(8, 1.2, '#0a2a5c', 1.0, [0, -3, -5], [0, 0, 0]);                   // chão azul escuro
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(ambienteEstudio(), 0.02).texture;

// luzes: recorte azul do logo + luz fria de cima
scene.add(new THREE.HemisphereLight('#9fc4ff', '#04070f', 0.22));
const key = new THREE.DirectionalLight('#ffffff', 0.55); key.position.set(2, 5, 6); scene.add(key);
const rimA = new THREE.DirectionalLight('#1f8bff', 2.6); rimA.position.set(-6, 2, -4); scene.add(rimA);
const rimB = new THREE.DirectionalLight('#41b8ff', 1.8); rimB.position.set(6, -1, -3); scene.add(rimB);

// ---------------------------------------------------------------- texturas geradas
function texRadial(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, cor]) => gr.addColorStop(o, cor));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texPonto = texRadial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(160,215,255,.8)'], [1, 'rgba(0,0,0,0)']], 64);
const texFumaca = texRadial([[0, 'rgba(200,205,215,.55)'], [0.5, 'rgba(160,165,175,.22)'], [1, 'rgba(0,0,0,0)']], 128);
function texRuido(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), d = g.createImageData(size, size);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 110 + Math.random() * 110 + (Math.random() < 0.02 ? -90 : 0);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}

// ---------------------------------------------------------------- materiais
function matCera(cor = '#f3e6c8') {
  const glow = { value: 0.0 };
  const m = new THREE.MeshPhysicalMaterial({
    color: cor, roughness: 0.5, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffd9a0'),
    clearcoat: 0.12, clearcoatRoughness: 0.6, envMapIntensity: 0.22,
  });
  m.userData.glow = glow;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vYw;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvYw = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vYw;\nuniform float uGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0,0.55,0.2) * (0.18 + smoothstep(-0.4, 1.25, vYw)) * uGlow;');
  };
  return m;
}
const matSilicone = () => new THREE.MeshPhysicalMaterial({
  color: '#1c78ff', roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.28,
  sheen: 0.7, sheenColor: new THREE.Color('#8fd0ff'), envMapIntensity: 0.9,
});
const matSiliconeFundo = () => new THREE.MeshPhysicalMaterial({ color: '#0b4fc4', roughness: 0.3, clearcoat: 0.6, envMapIntensity: 0.8 });
const matCromo = () => new THREE.MeshStandardMaterial({ color: '#e6ecf2', metalness: 1, roughness: 0.16, envMapIntensity: 1.0 });

// ---------------------------------------------------------------- geometrias
function geoVelaCanelada(r = 0.62, h = 2.4, canais = 22, prof = 0.045) {
  const g = new THREE.CylinderGeometry(r, r, h, 160, 30, false);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const len = Math.hypot(v.x, v.z); if (len < 1e-5) { if (v.y > 0) p.setY(i, v.y - 0.07); continue; }
    const a = Math.atan2(v.z, v.x);
    const canal = 1 - Math.pow(Math.abs(Math.cos(a * canais / 2)), 0.6); // sulcos verticais
    const k = (r - prof * canal) / r;
    let y = v.y;
    if (y > h / 2 - 1e-4) y -= 0.07 * (1 - len / r) * (1 - len / r) + 0.01; // poça de cera derretida no topo
    p.setXYZ(i, v.x * k, y, v.z * k);
  }
  g.computeVertexNormals(); return g;
}
function geoFlor(raio = 0.42, petalas = 7, prof = 0.05) {
  const s = new THREE.Shape(), N = 220;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = raio * (0.58 + 0.42 * Math.pow(Math.abs(Math.cos((petalas * t) / 2)), 0.8));
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const furo = new THREE.Path(); furo.absarc(0, 0, raio * 0.16, 0, Math.PI * 2, true); s.holes.push(furo);
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); return g;
}
function geoBolhas(n = 3, r = 0.34, passo = 0.56) {
  const geos = [], off = ((n - 1) * passo) / 2;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
    const s = new THREE.SphereGeometry(r, 32, 22); s.translate(x * passo - off, y * passo - off, z * passo - off); geos.push(s);
  }
  return mergeGeometries(geos);
}

// ---------------------------------------------------------------- chama
const chamaVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const chamaFS = `
uniform float uTime; uniform float uOn; uniform float uSeed; varying vec2 vUv;
void main(){
  float y = vUv.y;
  float sway = (sin(uTime*7.0 + y*5.0 + uSeed)*0.035 + sin(uTime*13.0 + uSeed*2.0)*0.012) * y;
  float w = 0.36 * pow(sin(3.14159 * pow(clamp(y,0.0,1.0), 0.62)), 0.85);
  float d = abs(vUv.x - 0.5 - sway) / max(w, 0.001);
  float corpo = smoothstep(1.0, 0.55, d) * smoothstep(0.0, 0.07, y) * smoothstep(1.0, 0.6, y);
  float nucleo = smoothstep(0.7, 0.0, d) * smoothstep(0.78, 0.18, y);
  vec3 fora = vec3(1.0, 0.42, 0.08), meio = vec3(1.0, 0.76, 0.32), branco = vec3(1.0, 0.97, 0.88), azul = vec3(0.22, 0.5, 1.0);
  vec3 c = mix(fora, meio, smoothstep(1.0, 0.4, d));
  c = mix(c, branco, nucleo);
  c = mix(c, azul, smoothstep(0.24, 0.0, y) * smoothstep(0.95, 0.2, d) * 0.85);
  gl_FragColor = vec4(c * 2.2, corpo * uOn);
}`;
const haloFS = `
uniform float uOn; varying vec2 vUv;
void main(){ float d = length(vUv - vec2(0.5, 0.42)) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.4) * 0.38 * uOn;
  gl_FragColor = vec4(vec3(1.0, 0.62, 0.25) * 1.4, a); }`;

const chamas = [];
function criaVela({ r = 0.62, h = 2.4, canais = 22, cor = '#f3e6c8', luz = true } = {}) {
  const g = new THREE.Group();
  const mat = matCera(cor);
  const corpo = new THREE.Mesh(geoVelaCanelada(r, h, canais), mat);
  g.add(corpo);
  const pavio = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * h, 0.014 * h, 0.09 * h, 8), new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.9 }));
  pavio.position.y = h / 2 + 0.01; pavio.rotation.z = 0.12; g.add(pavio);
  const partes = [corpo, pavio];

  const fUni = { uTime: { value: 0 }, uOn: { value: 1 }, uSeed: { value: Math.random() * 10 } };
  const fMat = new THREE.ShaderMaterial({ uniforms: fUni, vertexShader: chamaVS, fragmentShader: chamaFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const chama = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * h / 2.4 * 1.1, 0.5 * h / 2.4), fMat);
  chama.position.y = h / 2 + 0.05 + 0.25 * h / 2.4; g.add(chama);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * h / 2.4, 1.4 * h / 2.4), new THREE.ShaderMaterial({ uniforms: { uOn: fUni.uOn }, vertexShader: chamaVS, fragmentShader: haloFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.position.copy(chama.position); g.add(halo);

  let ponto = null;
  if (luz) { ponto = new THREE.PointLight('#ff9a48', 3.5, 7 * h / 2.4, 2); ponto.position.set(0, chama.position.y + 0.05, 0.1); g.add(ponto); }
  const alvo = new THREE.Mesh(new THREE.SphereGeometry(0.34 * h / 2.4, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  alvo.position.copy(chama.position); g.add(alvo);

  partes.push(chama, halo);
  const v = { grupo: g, corpo, partes, mat, chama, halo, ponto, alvo, fUni, aceso: true, on: 1, h, fumaca: null, secao: null, visivel: true };
  chamas.push(v); return v;
}
// esconde a vela sem esconder o grupo: a luz dela continua contada (ver "luzes fixas")
function mostraVela(v, sim) {
  if (v.visivel === sim) return;
  v.visivel = sim; v.partes.forEach((m) => { m.visible = sim; });
  if (!sim && v.ponto) v.ponto.intensity = 0;
}
const velaAtiva = (v) => v.visivel && (!v.secao || v.secao.userData.on);

// fumaça ao apagar
function soltaFumaca(v) {
  const N = 46, pos = new Float32Array(N * 3), vel = [];
  const base = v.chama.position;
  for (let i = 0; i < N; i++) {
    pos.set([base.x + (Math.random() - 0.5) * 0.05, base.y - 0.1 + Math.random() * 0.1, base.z], i * 3);
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 0.12, 0.35 + Math.random() * 0.45, (Math.random() - 0.5) * 0.12));
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: texFumaca, size: 0.55 * v.h / 2.4, transparent: true, depthWrite: false, opacity: 0.85 });
  const pts = new THREE.Points(geo, mat); v.grupo.add(pts);
  if (v.fumaca) v.grupo.remove(v.fumaca.pts);
  v.fumaca = { pts, vel, t: 0 };
}
function alterna(v) {
  v.aceso = !v.aceso;
  if (!v.aceso) soltaFumaca(v);
  const dica = $('#dicaChama'); if (dica) dica.classList.add('some');
}

// ---------------------------------------------------------------- partículas de fundo
const NP = celular ? 260 : 620;
const pPos = new Float32Array(NP * 3);
for (let i = 0; i < NP; i++) pPos.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 30, -2 - Math.random() * 10], i * 3);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const poeira = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: texPonto, size: 0.07, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, color: '#7cc4ff' }));
scene.add(poeira);

// ---------------------------------------------------------------- HERO
const hero = new THREE.Group(); scene.add(hero);
const velaHero = criaVela({ r: 0.62, h: 2.4, canais: 22 });
velaHero.grupo.position.y = -0.25;
hero.add(velaHero.grupo);
const prato = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.12, 96), matCromo());
prato.position.y = -0.25 - 1.2 - 0.06; hero.add(prato);
const aro = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.02, 12, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#41b8ff').multiplyScalar(2.6), toneMapped: false }));
aro.rotation.x = Math.PI / 2; aro.position.y = prato.position.y + 0.065; aro.scale.setScalar(1.0); hero.add(aro);

// objetos flutuando em volta (orbitam e giram ao passar o mouse)
const deco = [];
function addDeco(mesh, pos, escala = 1, vel = 0.3) {
  mesh.position.set(...pos); mesh.scale.setScalar(escala);
  mesh.userData = { base: new THREE.Vector3(...pos), vel, giro: 0, fase: Math.random() * 6.28, rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize() };
  hero.add(mesh); deco.push(mesh); return mesh;
}
function moldeComFlor(w = 1.1, h = 0.42, d = 1.1, flor = 0.4) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 6, 0.14), matSilicone()));
  const f = new THREE.Mesh(geoFlor(flor, 7, 0.03), matSiliconeFundo()); f.position.y = h / 2 - 0.018; g.add(f);
  return g;
}
addDeco(moldeComFlor(), [-1.9, 1.3, -1.4], 0.8, 0.25);
addDeco(moldeComFlor(0.8, 0.34, 0.8, 0.28), [1.7, -1.3, 0.5], 0.8, 0.35);
addDeco(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 32, 90), matCromo()), [1.8, 1.2, -1.2], 0.8, 0.4);
addDeco(new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.09, 140, 20), matCromo()), [-1.4, -1.45, 0.4], 0.75, 0.45);
// sem transmission aqui: numa peça decorativa pequena ela obrigava a renderizar a cena inteira duas vezes por frame
const sabonete = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.34, 0.62, 6, 0.15), new THREE.MeshPhysicalMaterial({ color: '#9a6bff', roughness: 0.25, transparent: true, opacity: 0.9, clearcoat: 0.6, emissive: '#1d0b45', envMapIntensity: 0.8 }));
addDeco(sabonete, [0.2, 2.1, -1.8], 0.75, 0.3);
const bolhaMini = new THREE.Mesh(geoBolhas(3, 0.34, 0.56), new THREE.MeshPhysicalMaterial({ color: '#fff6e6', roughness: 0.45, sheen: 1, sheenColor: new THREE.Color('#ffe2b8'), envMapIntensity: 0.6 }));
addDeco(bolhaMini, [2.35, 0.05, -2.2], 0.42, 0.35);

// ---------------------------------------------------------------- PROCESSO (molde abre)
const proc = new THREE.Group(); scene.add(proc);
const metadeMat = () => { const m = matSilicone(); m.transparent = true; return m; };
const mE = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.7, 1.1, 6, 0.13), metadeMat());
const mD = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.7, 1.1, 6, 0.13), metadeMat());
mE.position.x = -0.575; mD.position.x = 0.575; proc.add(mE, mD);
const costura = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fd3ff').multiplyScalar(3), transparent: true, toneMapped: false }));
costura.position.set(0, 0, 0.56); proc.add(costura);
const velaProc = criaVela({ r: 0.36, h: 1.2, canais: 16, luz: true });
velaProc.auto = true; velaProc.aceso = false; velaProc.on = 0; velaProc.fUni.uOn.value = 0;
const luzProc = new THREE.PointLight('#fff1dc', 0, 6, 2); luzProc.position.set(0.6, 0.8, 2.2); proc.add(luzProc);
proc.add(velaProc.grupo);
const jato = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.2, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb35c').multiplyScalar(2.2), transparent: true, toneMapped: false }));
jato.position.y = 0.85 + 1.1; proc.add(jato);

// ---------------------------------------------------------------- MATERIAIS
const matsG = new THREE.Group(); scene.add(matsG);
// transmission, iridescence e bumpMap ficam SEMPRE ligados (mínimo > 0): se um deles passa de 0 pra >0 o
// three.js recompila o shader inteiro, e era isso que congelava a tela ao clicar num material
const MIN = 1e-4;
const ruido = texRuido();
const matPeca = new THREE.MeshPhysicalMaterial({ color: '#f3e6c8', roughness: 0.5, sheen: 1, sheenColor: new THREE.Color('#ffd9a0'), envMapIntensity: 0.6, thickness: 1.4, ior: 1.45, attenuationDistance: 1.1, transmission: MIN, iridescence: MIN, bumpMap: ruido, bumpScale: 0, clearcoat: 0.1 });
const peca = new THREE.Mesh(geoBolhas(3, 0.34, 0.56), matPeca);
matsG.add(peca);
const base2 = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.08, 96), matCromo()); base2.position.y = -1.05; matsG.add(base2);
const aro2 = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.018, 12, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#41b8ff').multiplyScalar(2.6), toneMapped: false }));
aro2.rotation.x = Math.PI / 2; aro2.position.y = -1.0; matsG.add(aro2);
const luzMat = new THREE.PointLight('#fff4e6', 9, 9, 2); luzMat.position.set(1.6, 2.2, 2.6); matsG.add(luzMat);


const MATERIAIS = {
  vela:     { cor: '#f3e6c8', rough: 0.5,  trans: 0,    sheen: 1,   iri: 0,   bump: 0,     att: '#ffffff', emis: '#000000', desc: 'Cera de soja ou parafina. O silicone aguenta a temperatura e desenforma sem esforço.' },
  sabonete: { cor: '#b98cff', rough: 0.22, trans: 0.55, sheen: 0.3, iri: 0.25, bump: 0,    att: '#8a55ff', emis: '#1d0b45', desc: 'Base glicerinada ou vegetal. Detalhe nítido e brilho de vitrine, sem marca de emenda.' },
  resina:   { cor: '#cfeaff', rough: 0.04, trans: 1,    sheen: 0,   iri: 0.4, bump: 0,     att: '#2f8cff', emis: '#0a3477', desc: 'Resina epóxi transparente. Superfície lisa e espelhada, do jeito que sai do molde.' },
  gesso:    { cor: '#f4f3ef', rough: 0.95, trans: 0,    sheen: 0,   iri: 0,   bump: 0.004, att: '#ffffff', emis: '#000000', desc: 'Gesso para decoração e lembrança. Copia cada relevo e seca firme.' },
  concreto: { cor: '#8f908c', rough: 0.92, trans: 0,    sheen: 0,   iri: 0,   bump: 0.02,  att: '#ffffff', emis: '#000000', desc: 'Concreto e cimento para vasos e bandejas. Molde resistente para usar várias vezes.' },
};
const alvoMat = { ...MATERIAIS.vela, corC: new THREE.Color(MATERIAIS.vela.cor), attC: new THREE.Color('#ffffff'), emisC: new THREE.Color('#000000') };
let pulso = 0;
function escolheMat(nome) {
  const m = MATERIAIS[nome]; if (!m) return;
  Object.assign(alvoMat, m); alvoMat.corC = new THREE.Color(m.cor); alvoMat.attC = new THREE.Color(m.att); alvoMat.emisC = new THREE.Color(m.emis);
  pulso = 1;
  const desc = $('#matDesc');
  if (desc) { desc.style.opacity = 0; setTimeout(() => { desc.textContent = m.desc; desc.style.opacity = 1; }, 180); }
}
document.querySelectorAll('[data-mat]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-mat]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
  escolheMat(b.dataset.mat);
}));

// arrastar para girar
const palco = $('#matPalco');
const giroMat = { x: 0.35, y: 0.6, vx: 0, vy: 0.004, arrastando: false, ux: 0, uy: 0 };
if (palco) {
  palco.addEventListener('pointerdown', (e) => { giroMat.arrastando = true; giroMat.ux = e.clientX; giroMat.uy = e.clientY; palco.setPointerCapture(e.pointerId); });
  palco.addEventListener('pointermove', (e) => {
    if (!giroMat.arrastando) return;
    giroMat.vy = (e.clientX - giroMat.ux) * 0.008; giroMat.vx = (e.clientY - giroMat.uy) * 0.008;
    giroMat.ux = e.clientX; giroMat.uy = e.clientY;
  });
  const solta = () => { giroMat.arrastando = false; };
  palco.addEventListener('pointerup', solta); palco.addEventListener('pointercancel', solta);
}

// ---------------------------------------------------------------- FINAL (trio de velas)
const fim = new THREE.Group(); scene.add(fim);
const trio = [criaVela({ r: 0.34, h: 1.3, canais: 14, luz: false }), criaVela({ r: 0.4, h: 1.8, canais: 18 }), criaVela({ r: 0.3, h: 1.0, canais: 12, luz: false })];
trio[0].grupo.position.set(-0.85, -0.25, 0); trio[1].grupo.position.set(0, 0, -0.3); trio[2].grupo.position.set(0.8, -0.4, 0.2);
trio.forEach((v) => { fim.add(v.grupo); v.secao = fim; });
velaHero.secao = hero; velaProc.secao = proc;

// ---------------------------------------------------------------- luzes fixas
// O three.js recompila TODOS os materiais quando muda o número de luzes visíveis. Antes, cada seção
// escondia o próprio grupo (com as luzes das velas dentro) ao sair da tela, então rolar a página
// recompilava tudo várias vezes: era o travamento ao rolar. Agora o grupo fora de tela só é jogado
// pra longe da câmera: as malhas somem pelo frustum culling e as luzes continuam contadas.
const LONGE = 999;
function ativa(g, sim) {
  g.userData.on = sim;
  if (!sim) g.position.set(0, LONGE, 0);
  return sim;
}
[hero, proc, matsG, fim].forEach((g) => ativa(g, false));

// ---------------------------------------------------------------- pós-processamento (brilho)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), celular ? 0.5 : 0.62, 0.5, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- ancorar grupos nas seções
const visH = () => 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
function pontoTela(px, py, out) {
  tmp.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1, 0.5).unproject(camera);
  dir.copy(tmp).sub(camera.position).normalize();
  const t = -camera.position.z / dir.z;
  return out.copy(camera.position).addScaledVector(dir, t);
}
const secHero = $('#inicio'), secProc = $('#processo'), pinProc = secProc && secProc.querySelector('.pin'), secFim = $('#contato');
const passos = Array.from(document.querySelectorAll('#passos li')), barraProc = $('#barraProc');
const noAr = (r) => r.bottom > -80 && r.top < innerHeight + 80;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const suave = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- interação (mouse, toque na chama, hover)
const mouse = new THREE.Vector2(0, 0), mouseAlvo = new THREE.Vector2(0, 0);
const ray = new THREE.Raycaster();
let sobre = null;
function ndc(e) { return new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }
const interativo = (el) => el && el.closest && el.closest('a,button,input,textarea,select,label,.card,.form-sm,.lightbox,.mat-palco');
// o mouse dispara pointermove muito mais vezes que o monitor desenha; o raycast roda no máximo 1x por frame
let moveSujo = null;
window.addEventListener('pointermove', (e) => {
  mouseAlvo.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (e.pointerType !== 'touch') moveSujo = e;
}, { passive: true });
function processaHover() {
  const e = moveSujo; moveSujo = null; if (!e) return;
  if (interativo(e.target)) { if (sobre) { document.body.style.cursor = ''; sobre = null; } return; }
  const alvos = chamas.filter((v) => velaAtiva(v) && !v.auto).map((v) => v.alvo).concat(hero.userData.on ? deco : []);
  if (!alvos.length) { if (sobre) { document.body.style.cursor = ''; sobre = null; } return; }
  ray.setFromCamera(ndc(e), camera);
  const hit = ray.intersectObjects(alvos, true)[0];
  sobre = hit ? hit.object : null;
  document.body.style.cursor = sobre ? 'pointer' : '';
  if (sobre) {
    let o = sobre; while (o && !deco.includes(o)) o = o.parent;
    if (o) o.userData.giro = Math.min(o.userData.giro + 0.6, 6);
  }
}
window.addEventListener('click', (e) => {
  if (interativo(e.target)) return;
  const candidatas = chamas.filter((c) => velaAtiva(c) && !c.auto);
  if (!candidatas.length) return;
  ray.setFromCamera(ndc(e), camera);
  const v = candidatas.find((c) => ray.intersectObject(c.alvo).length);
  if (v) alterna(v);
});

// ---------------------------------------------------------------- loop
const relogio = new THREE.Clock();
let primeiroFrame = true, rodando = false, iniciado = false;
document.addEventListener('visibilitychange', () => {
  const antes = rodando; rodando = iniciado && !document.hidden;
  if (rodando && !antes) { relogio.getDelta(); requestAnimationFrame(loop); }
});

// quando nenhuma peça 3D está na tela (catálogo, formulário, envio) só a poeira de fundo aparece,
// e ela praticamente não se mexe: aí só redesenha quando a página rola ou muda de tamanho
let sujo = true;
addEventListener('scroll', () => { sujo = true; }, { passive: true });

// ---------------------------------------------------------------- qualidade adaptativa
// mede o tempo real de cada frame; se o aparelho não segurar ~40 fps, desce um degrau:
// 1) resolução 1x e sem desfoque de vidro no CSS  2) sem bloom  3) resolução 0.75x
const qual = { nivel: 0, soma: 0, n: 0, aquece: 40 };
function setPR(pr) { renderer.setPixelRatio(pr); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight); }
function desceQualidade() {
  qual.nivel++;
  if (qual.nivel === 1) { setPR(1); document.documentElement.classList.add('lite'); }
  // desliga só o passe de bloom e mantém o composer: os shaders continuam os mesmos, sem recompilar nada
  if (qual.nivel === 2) bloom.enabled = false;
  if (qual.nivel === 3) setPR(0.75);
}
function medeQualidade(dtReal) {
  if (qual.nivel >= 3 || dtReal > 0.25) return; // >250 ms = aba voltou do segundo plano, não conta
  if (qual.aquece > 0) { qual.aquece--; return; }
  qual.soma += dtReal; qual.n++;
  if (qual.n >= 50) {
    if (qual.soma / qual.n > 1 / 38) { desceQualidade(); qual.aquece = 30; }
    qual.soma = 0; qual.n = 0;
  }
}
const corCera = new THREE.Color('#f3e6c8'), corQuente = new THREE.Color('#ff9b45');
const luzFria = new THREE.Color('#fff1dc'), luzQuente = new THREE.Color('#ff9a48');

function atualizaVela(v, t, dt) {
  const alvo = v.aceso ? 1 : 0;
  v.on += (alvo - v.on) * Math.min(1, dt * (v.aceso ? 5 : 12));
  const tremor = 1 + Math.sin(t * 17 + v.fUni.uSeed.value) * 0.04 + Math.sin(t * 7.3) * 0.05;
  v.fUni.uTime.value = t;
  v.fUni.uOn.value = v.on;
  v.chama.scale.set(1, (0.85 + 0.15 * tremor) * Math.max(v.on, 0.001), 1);
  v.chama.quaternion.copy(camera.quaternion); v.halo.quaternion.copy(camera.quaternion);
  // billboard: rotação da câmera convertida para o espaço local do grupo da vela
  v.grupo.getWorldQuaternion(qTmp); qTmp.invert();
  v.chama.quaternion.premultiply(qTmp); v.halo.quaternion.premultiply(qTmp);
  if (v.ponto) v.ponto.intensity = 3.5 * v.on * tremor;
  v.mat.userData.glow.value = 0.35 * v.on * tremor;
  if (v.fumaca) {
    const f = v.fumaca; f.t += dt;
    const p = f.pts.geometry.attributes.position;
    for (let i = 0; i < f.vel.length; i++) {
      const vv = f.vel[i];
      p.setXYZ(i, p.getX(i) + (vv.x + Math.sin(t * 2 + i) * 0.05) * dt, p.getY(i) + vv.y * dt, p.getZ(i) + vv.z * dt);
    }
    p.needsUpdate = true;
    f.pts.material.opacity = Math.max(0, 0.85 - f.t * 0.3);
    f.pts.material.size = (0.55 + f.t * 0.35) * v.h / 2.4;
    if (f.t > 3) { v.grupo.remove(f.pts); f.pts.geometry.dispose(); v.fumaca = null; }
  }
}
const qTmp = new THREE.Quaternion();

function loop() {
  if (!rodando) return;
  const dtReal = relogio.getDelta(), dt = Math.min(dtReal, 0.05), t = relogio.elapsedTime;
  const vh = visH(), vw = vh * camera.aspect;
  const escalaTela = Math.min(1, camera.aspect / 0.9); // encolhe em telas estreitas

  // câmera segue o mouse de leve
  mouse.lerp(mouseAlvo, 0.05);
  if (!reduz) { camera.position.x = mouse.x * 0.35; camera.position.y = mouse.y * 0.25; }
  camera.lookAt(0, 0, 0);

  // poeira sobe com a rolagem
  poeira.rotation.y = t * 0.01; poeira.position.y = (scrollY / innerHeight) * 1.2;

  // HERO
  const rH = secHero.getBoundingClientRect();
  if (ativa(hero, noAr(rH))) {
    const larga = innerWidth > 900;
    pontoTela(larga ? innerWidth * 0.73 : innerWidth * 0.5, rH.top + rH.height * (larga ? 0.54 : 0.27), hero.position);
    const s = (larga ? 0.5 : 0.3) * vh / 3.2 * (larga ? 1 : Math.max(escalaTela * 1.6, 0.8));
    hero.scale.setScalar(s);
    hero.rotation.y = reduz ? 0 : Math.sin(t * 0.25) * 0.15 + mouse.x * 0.25;
    velaHero.grupo.rotation.y = t * 0.12;
    deco.forEach((m, i) => {
      const u = m.userData; u.giro *= 0.96;
      const ang = (reduz ? 0 : t * 0.08 * u.vel) ;
      m.position.set(u.base.x * Math.cos(ang) - u.base.z * Math.sin(ang), u.base.y + Math.sin(t * 0.8 + u.fase) * 0.12, u.base.x * Math.sin(ang) + u.base.z * Math.cos(ang));
      m.rotateOnAxis(u.rot, (u.vel * 0.4 + u.giro) * dt);
    });
  }

  // PROCESSO
  const rP = secProc.getBoundingClientRect();
  if (ativa(proc, noAr(rP))) {
    const p = clamp01(-rP.top / (rP.height - innerHeight));
    const larga = innerWidth > 900;
    const rPin = pinProc.getBoundingClientRect();
    pontoTela(larga ? innerWidth * 0.68 : innerWidth * 0.5, rPin.top + rPin.height * (larga ? 0.52 : 0.28), proc.position);
    proc.scale.setScalar((larga ? 0.34 : 0.3) * vh / 2.2 * (larga ? 1 : escalaTela * 1.1));
    const abre = suave(0.66, 0.92, p), enche = suave(0.36, 0.62, p), despeja = suave(0.33, 0.38, p) * (1 - suave(0.6, 0.66, p));
    proc.rotation.y = -0.5 + p * 1.1 + (reduz ? 0 : Math.sin(t * 0.4) * 0.05);
    proc.rotation.x = 0.18;
    mE.position.x = -0.575 - abre * 1.25; mD.position.x = 0.575 + abre * 1.25;
    mE.rotation.y = abre * 0.55; mD.rotation.y = -abre * 0.55;
    const vidro = suave(0.3, 0.4, p) * (1 - suave(0.62, 0.7, p));
    mE.material.opacity = mD.material.opacity = 1 - vidro * 0.68;
    costura.material.opacity = (1 - abre) * (0.6 + Math.sin(t * 3) * 0.3);
    jato.visible = despeja > 0.01; jato.scale.set(1, despeja, 1); jato.position.y = 0.85 + 1.1 * despeja;
    const fill = enche;
    mostraVela(velaProc, fill > 0.01);
    velaProc.grupo.scale.set(1, Math.max(fill, 0.01), 1);
    velaProc.grupo.position.y = -0.6 + 0.6 * fill + abre * 0.12;
    velaProc.aceso = abre > 0.85;
    luzProc.intensity = abre * 2.2 + (despeja * 3 + enche * (1 - abre) * 1.5);
    luzProc.color.copy(abre > 0.5 ? luzFria : luzQuente);
    velaProc.grupo.rotation.y = abre * t * 0.5;
    velaProc.mat.color.copy(corCera).lerp(corQuente, (1 - abre) * enche * 0.7);
    velaProc.mat.userData.glow.value = (1 - abre) * enche * 1.6;
    const ativo = p < 0.36 ? 0 : p < 0.66 ? 1 : 2;
    passos.forEach((li, i) => li.classList.toggle('on', i <= ativo));
    if (barraProc) barraProc.style.width = (p * 100).toFixed(1) + '%';
  }

  // MATERIAIS
  const rM = palco ? palco.getBoundingClientRect() : null;
  if (ativa(matsG, !!rM && noAr(rM))) {
    pontoTela(rM.left + rM.width / 2, rM.top + rM.height * 0.52, matsG.position);
    const sM = (rM.height / innerHeight) * vh / 4.4;
    pulso *= 0.9;
    matsG.scale.setScalar(sM * (1 - pulso * 0.06));
    if (!giroMat.arrastando) { giroMat.vx *= 0.94; giroMat.vy += ((reduz ? 0 : 0.005) - giroMat.vy) * 0.03; }
    giroMat.x += giroMat.vx; giroMat.y += giroMat.vy + pulso * 0.08;
    giroMat.x = Math.max(-0.9, Math.min(0.9, giroMat.x));
    peca.rotation.set(giroMat.x, giroMat.y, 0);
    peca.position.y = Math.sin(t * 0.9) * 0.05;
    const k = Math.min(1, dt * 5);
    matPeca.color.lerp(alvoMat.corC, k);
    matPeca.attenuationColor.lerp(alvoMat.attC, k);
    matPeca.emissive.lerp(alvoMat.emisC, k);
    matPeca.roughness += (alvoMat.rough - matPeca.roughness) * k;
    // nunca chegam a 0 de verdade (ver MIN): evita recompilar o shader
    matPeca.transmission = Math.max(MIN, matPeca.transmission + (alvoMat.trans - matPeca.transmission) * k);
    matPeca.sheen = Math.max(MIN, matPeca.sheen + (alvoMat.sheen - matPeca.sheen) * k);
    matPeca.iridescence = Math.max(MIN, matPeca.iridescence + (alvoMat.iri - matPeca.iridescence) * k);
    matPeca.bumpScale += (alvoMat.bump - matPeca.bumpScale) * k;
    matPeca.clearcoat = matPeca.transmission > 0.4 ? 0.8 : 0.1;
  }

  // FINAL
  const rF = secFim.getBoundingClientRect();
  if (ativa(fim, noAr(rF) && innerWidth > 1100)) {
    pontoTela(innerWidth * 0.895, rF.top + rF.height * 0.66, fim.position);
    fim.scale.setScalar(0.3 * vh / 2.6);
    fim.rotation.y = Math.sin(t * 0.3) * 0.2;
  }

  const animando = hero.userData.on || proc.userData.on || matsG.userData.on || fim.userData.on;
  if (!animando && !sujo && !primeiroFrame) { requestAnimationFrame(loop); return; }
  sujo = false;

  processaHover();
  chamas.forEach((v) => { if (velaAtiva(v)) atualizaVela(v, t, dt); });

  composer.render();
  if (animando) medeQualidade(dtReal);
  if (primeiroFrame) { primeiroFrame = false; setLoad(100); setTimeout(tiraLoader, 250); }
  requestAnimationFrame(loop);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight);
  sujo = true;
});

// compila todos os shaders ANTES de mostrar o site (atrás do loader), em paralelo quando o navegador
// permite. Antes eles compilavam no meio da rolagem, cada vez que uma seção nova aparecia.
// Frame de aquecimento: põe todas as peças na frente da câmera e desenha uma vez, ainda atrás do loader.
// Pega as variantes que o compile() não cobre (a peça translúcida redesenha a cena sem tone mapping).
function aquece() {
  try {
    [hero, proc, matsG, fim].forEach((g) => { g.userData.on = true; g.position.set(0, 0, 0); });
    composer.render();
  } catch (e) { /* aquecimento é só otimização */ }
  [hero, proc, matsG, fim].forEach((g) => ativa(g, false));
}
function inicia() {
  if (iniciado) return;
  aquece();
  iniciado = true; rodando = !document.hidden;
  relogio.getDelta();
  if (rodando) requestAnimationFrame(loop);
}
setLoad(80);
// compila mirando a mesma textura intermediária em que o composer desenha (sem isso o three.js montava
// a variante "direto na tela", com tone mapping, que o site nunca usa)
renderer.setRenderTarget(composer.readBuffer);
const compila = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));
renderer.setRenderTarget(null);
compila.catch(() => {}).then(inicia);
setTimeout(inicia, 5000); // segurança: se a compilação demorar demais, começa assim mesmo
