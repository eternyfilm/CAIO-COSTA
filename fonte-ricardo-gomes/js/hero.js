// Hero: milhares de partículas douradas que formam a logo (coroa + cabide),
// depois o número 10 e por fim a cruz. O mouse/dedo empurra as partículas.
import * as THREE from '../vendor/three.module.js';

const SIZE = 512; // canvas de amostragem

function drawLogo(ctx) {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  // coroa
  ctx.beginPath();
  const pts = [
    [150, 250], [124, 140], [186, 196], [206, 108], [240, 182], [256, 70],
    [272, 182], [306, 108], [326, 196], [388, 140], [362, 250],
  ];
  ctx.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => ctx.lineTo(...p));
  ctx.closePath();
  ctx.fill();
  [[124, 140], [206, 108], [256, 70], [306, 108], [388, 140]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y - 6, 11, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillRect(146, 262, 220, 24);
  // cabide: braços saindo do centro da coroa e barra embaixo, igual à logo
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(256, 300); ctx.lineTo(48, 430); ctx.lineTo(464, 430); ctx.closePath();
  ctx.stroke();
}

function drawNumber(ctx) {
  ctx.fillStyle = '#fff';
  ctx.font = '400 430px Anton, Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('10', 256, 270);
}

function drawCross(ctx) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(228, 40, 56, 340);
  ctx.fillRect(122, 140, 268, 56);
  // raios finos
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r0 = 140, r1 = 200;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * r0, 168 + Math.sin(a) * r0);
    ctx.lineTo(256 + Math.cos(a) * r1, 168 + Math.sin(a) * r1);
    ctx.stroke();
  }
}

function sample(drawFn, count, worldScale) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  drawFn(ctx);
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const filled = [];
  for (let y = 0; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x += 2) {
      if (data[(y * SIZE + x) * 4 + 3] > 128) filled.push(x, y);
    }
  }
  const out = new Float32Array(count * 3);
  const n = filled.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * n) * 2;
    const jx = (Math.random() - 0.5) * 2;
    const jy = (Math.random() - 0.5) * 2;
    out[i * 3] = ((filled[k] + jx) / SIZE - 0.5) * worldScale;
    out[i * 3 + 1] = -((filled[k + 1] + jy) / SIZE - 0.5) * worldScale;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
  }
  return out;
}

const vertex = /* glsl */ `
  attribute vec3 aB;
  attribute vec3 aC;
  attribute float aRand;
  attribute vec3 aDir;
  uniform float uMorph;
  uniform float uTime;
  uniform float uSize;
  uniform float uPR;
  uniform vec2 uMouse;
  uniform float uMouseStr;
  uniform float uIntro;
  uniform float uMotion;
  varying float vRand;
  varying float vAlpha;

  void main() {
    float m = clamp(uMorph, 0.0, 2.0);
    float seg = m < 1.0 ? 0.0 : 1.0;
    float f = m - seg;
    float t = smoothstep(0.0, 1.0, clamp((f - aRand * 0.35) / 0.65, 0.0, 1.0));
    vec3 from = seg < 0.5 ? position : aB;
    vec3 to = seg < 0.5 ? aB : aC;
    vec3 p = mix(from, to, t);

    // explosão no meio da transição
    float burst = sin(t * 3.14159);
    p += aDir * burst * (0.9 + aRand * 0.8) * uMotion;

    // entrada: vem de longe espalhada
    p += aDir * (1.0 - uIntro) * (5.0 + aRand * 4.0);

    // respiração
    p.x += sin(uTime * 0.9 + aRand * 40.0) * 0.018 * uMotion;
    p.y += cos(uTime * 1.1 + aRand * 25.0) * 0.018 * uMotion;
    p.z += sin(uTime * 0.7 + aRand * 12.0) * 0.04 * uMotion;

    // mouse empurra
    vec2 d = p.xy - uMouse;
    float dist = length(d);
    float push = smoothstep(0.85, 0.0, dist) * uMouseStr;
    p.xy += normalize(d + 0.0001) * push * 0.55;
    p.z += push * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.65 + 0.35 * mix(1.0, sin(uTime * (1.5 + aRand * 3.0) + aRand * 60.0), uMotion);
    gl_PointSize = uSize * (0.45 + aRand * 0.9) * uPR * (1.0 / -mv.z) * (1.0 + push * 0.8);
    vRand = aRand;
    vAlpha = twinkle * uIntro;
  }
`;

const fragment = /* glsl */ `
  varying float vRand;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.3, d);
    vec3 deep = vec3(0.50, 0.34, 0.11);
    vec3 gold = vec3(0.76, 0.56, 0.21);
    vec3 hi = vec3(0.98, 0.85, 0.52);
    vec3 col = mix(deep, gold, smoothstep(0.0, 0.6, vRand));
    col = mix(col, hi, smoothstep(0.8, 1.0, vRand));
    col = mix(col, hi, smoothstep(0.22, 0.0, d) * 0.5);
    gl_FragColor = vec4(col, a * vAlpha * 0.95);
  }
`;

export function initHero(canvas, { reduced = false } = {}) {
  const isMobile = matchMedia('(max-width: 720px)').matches;
  const COUNT = isMobile ? 8000 : 14000;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const worldScale = 4.2;
  // amostra já com fallback; refaz quando a Anton carregar
  const a = sample(drawLogo, COUNT, worldScale);
  const b = sample(drawNumber, COUNT, worldScale);
  const c = sample(drawCross, COUNT, worldScale);

  const rand = new Float32Array(COUNT);
  const dir = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    rand[i] = Math.random();
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    dir[i * 3] = Math.sin(ph) * Math.cos(th);
    dir[i * 3 + 1] = Math.sin(ph) * Math.sin(th);
    dir[i * 3 + 2] = Math.cos(ph);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(a, 3));
  geo.setAttribute('aB', new THREE.BufferAttribute(b, 3));
  geo.setAttribute('aC', new THREE.BufferAttribute(c, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));

  const uniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: isMobile ? 24 : 29 },
    uPR: { value: pr },
    uMouse: { value: new THREE.Vector2(99, 99) },
    uMouseStr: { value: 0 },
    uIntro: { value: 0 },
    uMotion: { value: reduced ? 0 : 1 },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 120px Anton').then(() => {
      geo.attributes.position.array.set(sample(drawLogo, COUNT, worldScale));
      geo.attributes.aB.array.set(sample(drawNumber, COUNT, worldScale));
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aB.needsUpdate = true;
    }).catch(() => {});
  }

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // poeira dourada de fundo
  const DUST = isMobile ? 500 : 1100;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xb8862b, size: 0.022, transparent: true, opacity: 0.45, depthWrite: false,
  }));
  scene.add(dust);

  let w = 0, h = 0, groupScale = 1, groupY = 0;
  function resize() {
    const npr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (npr !== renderer.getPixelRatio()) { renderer.setPixelRatio(npr); uniforms.uPR.value = npr; }
    w = canvas.clientWidth; h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // altura visível no plano z=0
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    const fit = Math.min(visW * 0.82, visH * (isMobile ? 0.62 : 0.56)) / worldScale;
    groupScale = fit;
    groupY = isMobile ? visH * 0.13 : visH * 0.135;
    group.scale.setScalar(groupScale);
    group.position.y = groupY;
  }
  resize();
  window.addEventListener('resize', resize);

  // ponteiro
  const target = new THREE.Vector2(99, 99);
  const ndc = new THREE.Vector2();
  let pointerActive = false;
  let tilt = { x: 0, y: 0 };
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const py = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    ndc.set((px / r.width) * 2 - 1, -(py / r.height) * 2 + 1);
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    target.set((ndc.x * visW) / 2 / groupScale, ((ndc.y * visH) / 2 - groupY) / groupScale);
    pointerActive = true;
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointerActive = false; });

  let running = true;
  let started = false; // não desenha atrás do loader
  let morphTarget = 0;
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!running || !started) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    uniforms.uMorph.value += (morphTarget - uniforms.uMorph.value) * Math.min(1, dt * 5);
    uniforms.uMouse.value.lerp(target, Math.min(1, dt * 8));
    uniforms.uMouseStr.value += ((pointerActive ? 1 : 0) - uniforms.uMouseStr.value) * Math.min(1, dt * 4);
    tilt.x += (ndc.y * 0.18 - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (ndc.x * 0.28 - tilt.y) * Math.min(1, dt * 3);
    group.rotation.x = -tilt.x;
    group.rotation.y = tilt.y + Math.sin(uniforms.uTime.value * 0.3) * 0.08 * uniforms.uMotion.value;
    dust.rotation.y = uniforms.uTime.value * 0.015;
    dust.position.y = Math.sin(uniforms.uTime.value * 0.2) * 0.2;
    renderer.render(scene, camera);
  }
  tick();

  return {
    setMorph(v) { morphTarget = v; },
    intro(duration = 2.4) {
      started = true; clock.getDelta();
      if (window.gsap && !reduced) window.gsap.to(uniforms.uIntro, { value: 1, duration, ease: 'expo.out' });
      else uniforms.uIntro.value = 1;
    },
    setRunning(v) { running = v; if (v) clock.getDelta(); },
  };
}
