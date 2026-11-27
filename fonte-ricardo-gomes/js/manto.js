// Personalizador 3D: camisa modelada em volume (tronco, mangas, dobras),
// vestida num manequim cromado sobre pedestal de mármore.
// A malha é gerada por um campo de distância (SDF) + surface nets, então
// não depende de modelo 3D externo. Nome, número e modelo são desenhados
// na textura em tempo real.
import * as THREE from 'three';

// ---------------------------------------------------------------- util
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function smin(a, b, k) { const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); }
function keyed(keys, y) {
  if (y <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i][0]) {
      const [y0, v0] = keys[i - 1], [y1, v1] = keys[i];
      let t = (y - y0) / (y1 - y0); t = t * t * (3 - 2 * t);
      return lerp(v0, v1, t);
    }
  }
  return keys[keys.length - 1][1];
}
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- forma da camisa
const Y0 = -1.36, Y1 = 1.3;           // faixa vertical da textura do tronco
const Y_HEM = -1.3;
const KA = [[-1.3, 0.83], [-0.55, 0.785], [0.2, 0.88], [0.62, 0.9], [0.98, 0.86], [1.26, 0.58]];
const KBF = [[-1.3, 0.46], [-0.55, 0.43], [0.25, 0.53], [0.7, 0.47], [1.0, 0.37], [1.26, 0.24]];
const KBB = [[-1.3, 0.42], [-0.55, 0.40], [0.25, 0.44], [0.7, 0.43], [1.0, 0.35], [1.26, 0.24]];
const NSE = 2.5;

function prof(y) {
  const yc = clamp(y, Y_HEM, 1.26);
  return { a: keyed(KA, yc), bF: keyed(KBF, yc), bB: keyed(KBB, yc), r: lerp(0.045, 0.15, sstep(-0.4, 0.7, y)) };
}

const D40 = new THREE.Vector3(Math.cos(0.7), -Math.sin(0.7), 0.02).normalize();
const SLEEVES = [-1, 1].map((s) => {
  const A = new THREE.Vector3(s * 0.72, 0.73, 0);
  const d = D40.clone(); d.x *= s;
  const L = 0.74;
  const B = A.clone().addScaledVector(d, L);
  const up = new THREE.Vector3(0, 1, 0);
  const e1 = up.clone().addScaledVector(d, -up.dot(d)).normalize();
  const e2 = new THREE.Vector3().crossVectors(d, e1);
  return { s, A, B, d, L, e1, e2, ra: 0.245, rb: 0.2 };
});

function sdCappedCone(px, py, pz, A, B, ra, rb) {
  const bax = B.x - A.x, bay = B.y - A.y, baz = B.z - A.z;
  const pax = px - A.x, pay = py - A.y, paz = pz - A.z;
  const rba = rb - ra;
  const baba = bax * bax + bay * bay + baz * baz;
  const papa = pax * pax + pay * pay + paz * paz;
  const paba = (pax * bax + pay * bay + paz * baz) / baba;
  const x = Math.sqrt(Math.max(0, papa - paba * paba * baba));
  const cax = Math.max(0, x - (paba < 0.5 ? ra : rb));
  const cay = Math.abs(paba - 0.5) - 0.5;
  const k = rba * rba + baba;
  const f = clamp((rba * (x - ra) + paba * baba) / k, 0, 1);
  const cbx = x - ra - f * rba;
  const cby = paba - f;
  const s = cbx < 0 && cay < 0 ? -1 : 1;
  return s * Math.sqrt(Math.min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba));
}

function torsoSD(x, y, z, P) {
  const r = P.r;
  const a2 = P.a - r, b2 = (z > 0 ? P.bF : P.bB) - r;
  const k = Math.pow(Math.pow(Math.abs(x) / a2, NSE) + Math.pow(Math.abs(z) / b2, NSE), 1 / NSE);
  const d2 = (k - 1) * Math.min(a2, b2);
  const yTop = 1.2 - 0.27 * sstep(0.2, 0.84, Math.abs(x)) - r;
  const dy = Math.max(y - yTop, Y_HEM + r - y);
  return Math.hypot(Math.max(d2, 0), Math.max(dy, 0)) + Math.min(Math.max(d2, dy), 0) - r;
}

function sleeveSD(x, y, z, S) {
  const rr = 0.03;
  let d = sdCappedCone(x, y, z, S.A, S.B, S.ra - rr, S.rb - rr) - rr;
  // dobras em anel ao longo da manga
  const t = ((x - S.A.x) * S.d.x + (y - S.A.y) * S.d.y + (z - S.A.z) * S.d.z) / S.L;
  const qx = x - S.A.x - S.d.x * t * S.L, qy = y - S.A.y - S.d.y * t * S.L, qz = z - S.A.z - S.d.z * t * S.L;
  const phi = Math.atan2(qx * S.e2.x + qy * S.e2.y + qz * S.e2.z, qx * S.e1.x + qy * S.e1.y + qz * S.e1.z);
  d -= 0.007 * Math.sin(t * 17 + phi * 1.3) * sstep(0.2, 0.45, t) * sstep(1.0, 0.85, t);
  return d;
}

function shirtSD(x, y, z, P) {
  let d = torsoSD(x, y, z, P);
  for (const S of SLEEVES) d = smin(d, sleeveSD(x, y, z, S), 0.09);
  // dobras: repuxo saindo da cava
  const side = x < 0 ? -1 : 1;
  const qx = x - side * 0.93, qy = y - 0.3;
  const rr = Math.hypot(qx, qy);
  const ang = Math.atan2(qy, qx * side);
  const wFront = sstep(0.12, 0.32, Math.abs(z));
  d -= 0.011 * Math.sin(ang * 8 + 0.6) * sstep(0.06, 0.24, rr) * sstep(0.85, 0.35, rr) * wFront;
  // cintura: dobras suaves horizontais
  d -= 0.008 * Math.sin(y * 15 + 1.4 * Math.sin(x * 4 + z * 3)) * sstep(-0.25, -0.95, y) * sstep(-1.32, -1.16, y);
  // ondulação geral do tecido
  d -= 0.005 * Math.sin(x * 3.7 + y * 2.1) * Math.sin(y * 3.3 - z * 4.4 + x);
  return d;
}

// ---------------------------------------------------------------- surface nets
function surfaceNets(bmin, bmax, cell) {
  const nx = Math.ceil((bmax[0] - bmin[0]) / cell) + 1;
  const ny = Math.ceil((bmax[1] - bmin[1]) / cell) + 1;
  const nz = Math.ceil((bmax[2] - bmin[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  for (let j = 0; j < ny; j++) {
    const y = bmin[1] + j * cell;
    const P = prof(y);
    for (let k = 0; k < nz; k++) {
      const z = bmin[2] + k * cell;
      const o = nx * (j + ny * k);
      for (let i = 0; i < nx; i++) F[o + i] = shirtSD(bmin[0] + i * cell, y, z, P);
    }
  }
  const idx = (i, j, k) => i + nx * (j + ny * k);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const vid = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      v[c] = F[idx(i + C[c][0], j + C[c][1], k + C[c][2])];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += C[a][0] + t * (C[b][0] - C[a][0]);
      sy += C[a][1] + t * (C[b][1] - C[a][1]);
      sz += C[a][2] + t * (C[b][2] - C[a][2]);
      n++;
    }
    vid[i + cx * (j + cy * k)] = pos.length / 3;
    pos.push(bmin[0] + (i + sx / n) * cell, bmin[1] + (j + sy / n) * cell, bmin[2] + (k + sz / n) * cell);
  }
  const V = (i, j, k) => vid[i + cx * (j + cy * k)];
  const tris = [];
  const tri = (a, b, c, ax, sign) => {
    // garante a face apontando pra fora
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const wx = pos[c * 3] - pos[a * 3], wy = pos[c * 3 + 1] - pos[a * 3 + 1], wz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const n = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    if (n[ax] * sign >= 0) tris.push(a, b, c); else tris.push(a, c, b);
  };
  const quad = (q, ax, sign) => {
    if (q[0] < 0 || q[1] < 0 || q[2] < 0 || q[3] < 0) return;
    tri(q[0], q[1], q[2], ax, sign);
    tri(q[0], q[2], q[3], ax, sign);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = F[idx(i, j, k)];
    const ins = a < 0;
    if (i < nx - 1 && j >= 1 && k >= 1 && j < ny - 1 && k < nz - 1) {
      if (ins !== (F[idx(i + 1, j, k)] < 0)) quad([V(i, j - 1, k - 1), V(i, j, k - 1), V(i, j, k), V(i, j - 1, k)], 0, ins ? 1 : -1);
    }
    if (j < ny - 1 && i >= 1 && k >= 1 && i < nx - 1 && k < nz - 1) {
      if (ins !== (F[idx(i, j + 1, k)] < 0)) quad([V(i - 1, j, k - 1), V(i, j, k - 1), V(i, j, k), V(i - 1, j, k)], 1, ins ? 1 : -1);
    }
    if (k < nz - 1 && i >= 1 && j >= 1 && i < nx - 1 && j < ny - 1) {
      if (ins !== (F[idx(i, j, k + 1)] < 0)) quad([V(i - 1, j - 1, k), V(i, j - 1, k), V(i, j, k), V(i - 1, j, k)], 2, ins ? 1 : -1);
    }
  }
  return { pos, tris };
}

// ---------------------------------------------------------------- UV do tronco (comprimento de arco)
const ROWS = 72, ANG = 256;
const ARC = (() => {
  const fr = { F: [], B: [] }, half = { F: [], B: [] };
  for (let r = 0; r < ROWS; r++) {
    const y = Y0 + (r / (ROWS - 1)) * (Y1 - Y0);
    const P = prof(y);
    for (const side of ['F', 'B']) {
      const b = side === 'F' ? P.bF : P.bB;
      const pts = [];
      for (let m = 0; m <= ANG; m++) {
        const t = (m / ANG) * Math.PI;
        const c = Math.cos(t), s = Math.sin(t);
        const rad = Math.pow(Math.pow(Math.abs(c) / P.a, NSE) + Math.pow(Math.abs(s) / b, NSE), -1 / NSE);
        pts.push([rad * c, rad * s]);
      }
      const cum = new Float32Array(ANG + 1);
      for (let m = 1; m <= ANG; m++) cum[m] = cum[m - 1] + Math.hypot(pts[m][0] - pts[m - 1][0], pts[m][1] - pts[m - 1][1]);
      const tot = cum[ANG];
      for (let m = 0; m <= ANG; m++) cum[m] /= tot;
      fr[side].push(cum); half[side].push(tot);
    }
  }
  return { fr, half };
})();
function arcFrac(side, y, theta) {
  const rf = clamp(((y - Y0) / (Y1 - Y0)) * (ROWS - 1), 0, ROWS - 1);
  const r0 = Math.floor(rf), r1 = Math.min(ROWS - 1, r0 + 1), tr = rf - r0;
  const af = clamp(theta / Math.PI, 0, 1) * ANG;
  const a0 = Math.floor(af), a1 = Math.min(ANG, a0 + 1), ta = af - a0;
  const T = ARC.fr[side];
  const v0 = lerp(T[r0][a0], T[r0][a1], ta), v1 = lerp(T[r1][a0], T[r1][a1], ta);
  return lerp(v0, v1, tr);
}
function halfPerim(side, y) {
  const rf = clamp(((y - Y0) / (Y1 - Y0)) * (ROWS - 1), 0, ROWS - 1);
  const r0 = Math.floor(rf), r1 = Math.min(ROWS - 1, r0 + 1);
  return lerp(ARC.half[side][r0], ARC.half[side][r1], rf - r0);
}
function torsoUV(x, y, z) {
  const th = Math.atan2(z, x);
  const u = z >= 0 ? 1 - 0.5 * arcFrac('F', y, th) : 0.5 * arcFrac('B', y, -th);
  return [u, (y - Y0) / (Y1 - Y0)];
}
function sleeveUV(x, y, z, S) {
  const t = ((x - S.A.x) * S.d.x + (y - S.A.y) * S.d.y + (z - S.A.z) * S.d.z) / S.L;
  const qx = x - S.A.x - S.d.x * t * S.L, qy = y - S.A.y - S.d.y * t * S.L, qz = z - S.A.z - S.d.z * t * S.L;
  let phi = Math.atan2(qx * S.e2.x + qy * S.e2.y + qz * S.e2.z, qx * S.e1.x + qy * S.e1.y + qz * S.e1.z);
  if (S.s < 0) phi = -phi;
  return [0.5 + phi / (2 * Math.PI), clamp(t, 0, 1)];
}

function buildShirtGeometry(cell) {
  const { pos, tris } = surfaceNets([-1.62, -1.38, -0.64], [1.62, 1.32, 0.66], cell);
  const nV = pos.length / 3;
  // normais pelo gradiente do campo
  const nrm = new Float32Array(nV * 3);
  const e = 0.004;
  for (let i = 0; i < nV; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const Pp = prof(y + e), Pm = prof(y - e), P = prof(y);
    let gx = shirtSD(x + e, y, z, P) - shirtSD(x - e, y, z, P);
    let gy = shirtSD(x, y + e, z, Pp) - shirtSD(x, y - e, z, Pm);
    let gz = shirtSD(x, y, z + e, P) - shirtSD(x, y, z - e, P);
    const l = Math.hypot(gx, gy, gz) || 1;
    nrm[i * 3] = gx / l; nrm[i * 3 + 1] = gy / l; nrm[i * 3 + 2] = gz / l;
  }
  // separa tronco e mangas, com UV próprio e costura tratada
  const groups = [[], []];
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const mx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
    const my = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
    const mz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
    const S = SLEEVES[mx < 0 ? 0 : 1];
    const isSleeve = Math.abs(mx) > 0.55 && sleeveSD(mx, my, mz, S) < torsoSD(mx, my, mz, prof(my));
    groups[isSleeve ? 1 : 0].push([a, b, c, isSleeve ? S : null]);
  }
  const P = [], N = [], U = [], I = [];
  const geo = new THREE.BufferGeometry();
  let start = 0;
  groups.forEach((list, gi) => {
    const map = new Map();
    for (const [a, b, c, S] of list) {
      const uv = [a, b, c].map((vi) => {
        const x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
        return S ? sleeveUV(x, y, z, S) : torsoUV(x, y, z);
      });
      const us = uv.map((q) => q[0]);
      const wrap = Math.max(...us) - Math.min(...us) > 0.5;
      [a, b, c].forEach((vi, m) => {
        const shift = wrap && uv[m][0] < 0.5 ? 1 : 0;
        const key = vi * 2 + shift;
        let ni = map.get(key);
        if (ni === undefined) {
          ni = P.length / 3;
          map.set(key, ni);
          P.push(pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2]);
          N.push(nrm[vi * 3], nrm[vi * 3 + 1], nrm[vi * 3 + 2]);
          U.push(uv[m][0] + shift, uv[m][1]);
        }
        I.push(ni);
      });
    }
    geo.addGroup(start, list.length * 3, gi);
    start += list.length * 3;
  });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setIndex(I);
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------- texturas
const TW = 2048, TH = 1024, SW = 512, SH = 512;
const VPX = TH / (Y1 - Y0);
const tx = (u) => u * TW;
const ty = (y) => ((Y1 - y) / (Y1 - Y0)) * TH;

function veinPath(ctx, R, W, x, y, ang, segs, lenMin, lenMax) {
  ctx.beginPath(); ctx.moveTo(x, y);
  const pts = [[x, y]];
  for (let s = 0; s < segs; s++) {
    ang += (R() - 0.5) * 0.7;
    const len = (lenMin + R() * (lenMax - lenMin)) * W;
    const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
    ctx.quadraticCurveTo(x + Math.cos(ang + 1.2) * len * 0.35 * (R() - 0.5) * 2, y + Math.sin(ang + 1.2) * len * 0.35 * (R() - 0.5) * 2, nx, ny);
    x = nx; y = ny; pts.push([x, y]);
  }
  ctx.stroke();
  return pts;
}

function veins(ctx, W, H, seed, mod, density = 1) {
  const R = rng(seed);
  const hasFilter = 'filter' in ctx;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // nuvens
  for (let i = 0; i < 14 * density; i++) {
    const x = R() * W, y = R() * H, r = (0.1 + R() * 0.25) * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, mod.veinSoft); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const flows = Math.round(7 * density);
  for (let f = 0; f < flows; f++) {
    const x = R() * W, y = R() * H;
    const ang = (R() < 0.5 ? 0.55 : 2.6) + (R() - 0.5) * 0.5;
    const segs = 7 + Math.floor(R() * 6);
    // faixa larga e esfumada
    if (hasFilter) ctx.filter = `blur(${Math.round(W / 140)}px)`;
    ctx.strokeStyle = mod.vein; ctx.globalAlpha = 0.1 + R() * 0.08; ctx.lineWidth = W * (0.012 + R() * 0.02);
    const pts = veinPath(ctx, rng(seed * 7 + f), W, x, y, ang, segs, 0.05, 0.1);
    // veio médio por cima
    if (hasFilter) ctx.filter = `blur(${Math.max(1, Math.round(W / 700))}px)`;
    ctx.globalAlpha = 0.28 + R() * 0.15; ctx.lineWidth = W * (0.0018 + R() * 0.002);
    veinPath(ctx, rng(seed * 7 + f), W, x, y, ang, segs, 0.05, 0.1);
    // ramificações finas
    if (hasFilter) ctx.filter = 'blur(0.5px)';
    for (let b = 0; b < 4; b++) {
      const [bx, by] = pts[Math.floor(R() * pts.length)];
      ctx.strokeStyle = R() < 0.3 ? mod.veinGold : mod.vein;
      ctx.globalAlpha = 0.3 + R() * 0.3; ctx.lineWidth = W * (0.0006 + R() * 0.0008);
      veinPath(ctx, R, W, bx, by, ang + (R() - 0.5) * 1.6, 3 + Math.floor(R() * 4), 0.015, 0.045);
    }
  }
  ctx.restore();
}

function basePattern(ctx, W, H, mod, seed, isSleeve) {
  ctx.fillStyle = mod.base;
  ctx.fillRect(0, 0, W, H);
  switch (mod.padrao) {
    case 'marmore': veins(ctx, W, H, seed, mod, isSleeve ? 0.5 : 1.4); break;
    case 'listras': {
      ctx.fillStyle = mod.alt;
      const band = isSleeve ? H / 5.5 : 0.19 * VPX;
      const startY = isSleeve ? 0 : ty(1.05);
      for (let y = startY; y < H; y += band * 2) ctx.fillRect(0, y, W, band);
      break;
    }
    case 'faixas-sutis': {
      ctx.fillStyle = mod.alt;
      const step = isSleeve ? W / 10 : TW / 34;
      for (let x = 0; x < W; x += step * 2) ctx.fillRect(x, 0, step, H);
      break;
    }
    case 'gradiente': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mod.base); g.addColorStop(1, mod.alt);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      break;
    }
    case 'diagonal': {
      ctx.strokeStyle = mod.alt; ctx.lineWidth = isSleeve ? 6 : 12;
      const step = isSleeve ? 22 : 40;
      for (let x = -H; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
      break;
    }
    case 'geometrico': {
      ctx.fillStyle = mod.alt;
      const s = isSleeve ? 40 : 0.2 * VPX;
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        if ((Math.round(x / s) + Math.round(y / s)) % 2) continue;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.closePath(); ctx.fill();
      }
      break;
    }
  }
}

// escreve texto num ponto da camisa (unidades), corrigindo a proporção da UV
function onShirt(ctx, side, xUnits, y, fn) {
  const hp = halfPerim(side, y);
  const hpx = (TW * 0.5) / hp;                      // px por unidade na horizontal
  const center = side === 'F' ? 0.75 : 0.25;
  const u = center + (xUnits * 0.5) / hp;
  ctx.save();
  ctx.translate(tx(u), ty(y));
  ctx.scale(hpx / VPX, 1);
  fn(ctx);
  ctx.restore();
}

function drawCrown(ctx, s, color) {
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-40, 22); ctx.lineTo(-48, -22); ctx.lineTo(-22, 0); ctx.lineTo(-14, -32); ctx.lineTo(0, -6);
  ctx.lineTo(14, -32); ctx.lineTo(22, 0); ctx.lineTo(48, -22); ctx.lineTo(40, 22); ctx.closePath();
  ctx.fill();
  ctx.fillRect(-40, 27, 80, 9);
  ctx.restore();
}

function meanderBand(ctx, side, mod) {
  // faixa grega acompanhando a gola (frente e costas)
  const tile = 0.062;
  ctx.save();
  ctx.strokeStyle = mod.trim; ctx.globalAlpha = 0.9;
  const pts = [];
  for (let x = -0.4; x <= 0.4001; x += tile) pts.push(x);
  const yAt = (x) => (side === 'F' ? 0.99 : 1.05) + 0.62 * x * x;
  pts.forEach((x) => {
    onShirt(ctx, side, x, yAt(x), (c) => {
      const s = tile * VPX;
      const slope = 1.24 * x;
      c.rotate(-Math.atan(slope) * 0.9);
      c.lineWidth = s * 0.09;
      c.beginPath();
      c.moveTo(-s / 2, -s * 0.62); c.lineTo(s / 2, -s * 0.62);
      c.moveTo(-s / 2, s * 0.62); c.lineTo(s / 2, s * 0.62);
      c.moveTo(-s / 2, s * 0.42); c.lineTo(-s / 2, -s * 0.42); c.lineTo(s * 0.3, -s * 0.42);
      c.lineTo(s * 0.3, s * 0.22); c.lineTo(-s * 0.18, s * 0.22); c.lineTo(-s * 0.18, -s * 0.12); c.lineTo(s * 0.08, -s * 0.12);
      c.stroke();
    });
  });
  ctx.restore();
}

function arcText(ctx, text, size, radius, fill, stroke) {
  ctx.font = `400 ${size}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const spacing = size * 0.06;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let angle = -total / radius / 2;
  [...text].forEach((ch, i) => {
    const a = angle + (widths[i] - spacing) / 2 / radius;
    ctx.save();
    ctx.translate(Math.sin(a) * radius, radius - Math.cos(a) * radius);
    ctx.rotate(a);
    if (stroke) { ctx.lineWidth = size * 0.1; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(ch, 0, 0); }
    ctx.fillStyle = fill; ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += widths[i] / radius;
  });
}

function weave(ctx, W, H, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha; ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 5) for (let x = (y / 5) % 2 ? 2.5 : 0; x < W; x += 5) ctx.fillRect(x, y, 1.6, 1.6);
  ctx.restore();
}

function drawTorso(ctx, mod, nome, numero) {
  basePattern(ctx, TW, TH, mod, 11, false);
  meanderBand(ctx, 'F', mod);
  meanderBand(ctx, 'B', mod);

  // FRENTE: escudo (peito esquerdo de quem veste), marca e patrocínio
  onShirt(ctx, 'F', 0.3, 0.55, (c) => {
    drawCrown(c, 0.0042 * VPX, mod.trim);
    c.font = `400 ${0.085 * VPX}px Anton, Impact, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = mod.trim;
    c.fillText('RG', 0, 0.2 * VPX);
  });
  onShirt(ctx, 'F', -0.3, 0.57, (c) => {
    c.font = `800 ${0.06 * VPX}px Manrope, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = mod.trim;
    c.fillText('FONTE', 0, 0);
  });
  onShirt(ctx, 'F', 0, 0.08, (c) => {
    c.font = `400 ${0.21 * VPX}px Anton, Impact, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = mod.sponsor;
    c.fillText('RICARDO GOMES', 0, 0, 1.3 * VPX);
    c.font = `700 ${0.045 * VPX}px Manrope, sans-serif`;
    c.fillText('M O D A   M A S C U L I N A', 0, 0.17 * VPX);
  });

  // COSTAS
  onShirt(ctx, 'B', 0, 0.9, (c) => {
    c.font = `700 ${0.042 * VPX}px Manrope, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = mod.trim;
    c.fillText('JESUS É O DONO DO LUGAR', 0, 0);
  });
  const n = (nome || '').toUpperCase().slice(0, 12);
  if (n) {
    onShirt(ctx, 'B', 0, 0.64, (c) => {
      let size = 0.25 * VPX;
      c.font = `400 ${size}px Anton, Impact, sans-serif`;
      const w = c.measureText(n).width * 1.08;
      const maxW = 1.15 * VPX;
      if (w > maxW) size *= maxW / w;
      arcText(c, n, size, 3.4 * VPX, mod.num, mod.numStroke);
    });
  }
  const num = String(numero ?? '').slice(0, 2);
  if (num) {
    onShirt(ctx, 'B', 0, -0.12, (c) => {
      c.font = `400 ${1.05 * VPX}px Anton, Impact, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 0.05 * VPX; c.strokeStyle = mod.numStroke; c.lineJoin = 'round';
      c.strokeText(num, 0, 0);
      c.fillStyle = mod.num; c.fillText(num, 0, 0);
    });
  }
  weave(ctx, TW, TH, 0.05);
}

function drawSleeve(ctx, mod) {
  basePattern(ctx, SW, SH, mod, 29, true);
  // duas faixas douradas no topo da manga
  ctx.fillStyle = mod.trim;
  ctx.fillRect(SW * 0.455, 0, SW * 0.022, SH * 0.88);
  ctx.fillRect(SW * 0.523, 0, SW * 0.022, SH * 0.88);
  // punho
  ctx.fillStyle = mod.cuff || mod.trim;
  ctx.fillRect(0, SH * 0.885, SW, SH * 0.115);
  ctx.fillStyle = mod.base; ctx.globalAlpha = 0.35;
  ctx.fillRect(0, SH * 0.93, SW, SH * 0.012);
  ctx.globalAlpha = 1;
  weave(ctx, SW, SH, 0.05);
}

function marbleTexture(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f0ea'; x.fillRect(0, 0, size, size);
  veins(x, size, size, 77, { vein: '#8a8276', veinGold: '#c39b4e', veinSoft: 'rgba(150,140,125,0.10)' }, 1.2);
  return c;
}

function weaveBump() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#808080';
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    x.beginPath(); x.arc(i * 8 + (j % 2 ? 4 : 0), j * 8 + 4, 1.7, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------- ambiente (céu de fim de tarde)
function sunsetEnvironment(renderer) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 top = vec3(0.62, 0.72, 0.84);
          vec3 hor = vec3(1.25, 0.92, 0.58);
          vec3 band = vec3(0.30, 0.25, 0.20);
          vec3 flo = vec3(0.16, 0.13, 0.11);
          vec3 c = h > 0.0 ? mix(hor, top, smoothstep(0.0, 0.5, h)) : mix(mix(hor, band, smoothstep(0.0, 0.08, -h)), flo, smoothstep(0.08, 0.5, -h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 7, 4.5) }));
  sun.position.set(-28, 14, 26);
  scene.add(sun);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.8, 1.75), side: THREE.DoubleSide }));
  panel.position.set(30, 8, 10); panel.lookAt(0, 0, 0);
  scene.add(panel);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(scene, 0.02).texture;
  pm.dispose();
  return tex;
}

// ---------------------------------------------------------------- cena
export function initManto(canvas, { onSideChange } = {}) {
  const isMobile = matchMedia('(max-width: 720px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = sunsetEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  const target = new THREE.Vector3(0, -0.32, 0);

  scene.add(new THREE.HemisphereLight(0xfff4e2, 0x9c8c74, 0.42));
  const sun = new THREE.DirectionalLight(0xffd29a, 3.3);
  sun.position.set(-4, 5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 16 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xeaf0ff, 0.35); fill.position.set(4, 1, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe0aa, 1.4); rim.position.set(2.5, 3, -5); scene.add(rim);

  // materiais
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe4e4ea, metalness: 1, roughness: 0.08, envMapIntensity: 1.1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd7a94b, metalness: 1, roughness: 0.22, envMapIntensity: 1.2 });
  const marbleTex = new THREE.CanvasTexture(marbleTexture());
  marbleTex.colorSpace = THREE.SRGBColorSpace;
  marbleTex.wrapS = marbleTex.wrapT = THREE.RepeatWrapping;
  const marble = new THREE.MeshPhysicalMaterial({ map: marbleTex, roughness: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.35 });

  const tc = document.createElement('canvas'); tc.width = TW; tc.height = TH;
  const sc = document.createElement('canvas'); sc.width = SW; sc.height = SH;
  const tctx = tc.getContext('2d'), sctx = sc.getContext('2d');
  const torsoTex = new THREE.CanvasTexture(tc), sleeveTex = new THREE.CanvasTexture(sc);
  [torsoTex, sleeveTex].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  });
  const bump = weaveBump();
  const bumpT = bump.clone(); bumpT.repeat.set(44, 22); bumpT.needsUpdate = true;
  const bumpS = bump.clone(); bumpS.repeat.set(12, 8); bumpS.needsUpdate = true;

  const uTime = { value: 0 };
  function fabric(map, bm) {
    const m = new THREE.MeshPhysicalMaterial({
      map, bumpMap: bm, bumpScale: 0.22,
      roughness: 0.82, metalness: 0,
      sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xfff6e6),
      envMapIntensity: 0.42,
    });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed += normal * (sin(position.y * 3.0 + uTime * 1.2) * 0.004 + sin(position.x * 4.0 - uTime * 0.9) * 0.003);`
      );
    };
    return m;
  }
  const torsoMat = fabric(torsoTex, bumpT);
  const sleeveMat = fabric(sleeveTex, bumpS);
  const ribMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff) });

  // rig que gira: camisa + manequim + haste
  const rig = new THREE.Group();
  scene.add(rig);

  // manequim cromado
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.46, 48), chrome);
  neck.position.y = 1.32; rig.add(neck);
  const neckCap = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.035, 48), gold);
  neckCap.position.y = 1.565; rig.add(neckCap);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), gold);
  knob.position.y = 1.61; rig.add(knob);
  SLEEVES.forEach((S) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.36, 8, 32), chrome);
    arm.position.copy(S.B).addScaledVector(S.d, 0.12);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), S.d);
    arm.castShadow = true;
    rig.add(arm);
  });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.72, 24), gold);
  pole.position.y = -1.62; pole.castShadow = true; rig.add(pole);

  // gola em ribana
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.038, 16, 64), ribMat);
  collar.rotation.x = Math.PI / 2 + 0.28;
  collar.scale.set(1, 0.9, 1);
  collar.position.set(0, 1.155, 0.015);
  rig.add(collar);

  // pedestal de mármore (fixo)
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.76, 0.26, 72), marble);
  ped.position.y = -2.11; ped.receiveShadow = true; scene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.014, 12, 96), gold);
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.98; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.012, 12, 96), gold);
  ring2.rotation.x = Math.PI / 2; ring2.position.y = -2.24; scene.add(ring2);

  let shirt = null;
  function buildShirt() {
    if (shirt) return;
    const geo = buildShirtGeometry(isMobile ? 0.032 : 0.024);
    shirt = new THREE.Mesh(geo, [torsoMat, sleeveMat]);
    shirt.castShadow = true;
    rig.add(shirt);
    collar.material.color.set(state.modelo ? state.modelo.rib : '#ffffff');
  }

  let state = { modelo: null, nome: '', numero: '' };
  function redraw() {
    if (!state.modelo) return;
    drawTorso(tctx, state.modelo, state.nome, state.numero);
    drawSleeve(sctx, state.modelo);
    torsoTex.needsUpdate = true; sleeveTex.needsUpdate = true;
    ribMat.color.set(state.modelo.rib);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const needH = 4.15, needW = 3.75;
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(needH / visH, needW / (visH * camera.aspect));
    camera.position.set(0, target.y + 0.35, dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // rotação por arrasto com inércia e encaixe em frente/costas
  let rotY = -0.45, targetRot = 0, vel = 0, dragging = false, lastX = 0, tiltX = 0, tiltTarget = 0;
  let lastSide = 'front';
  const stage = canvas.parentElement;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true; lastX = e.clientX; vel = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    rotY += dx * 0.011; vel = dx * 0.011;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    targetRot = Math.round((rotY + vel * 8) / Math.PI) * Math.PI;
  };
  window.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('pointerleave', () => { tiltTarget = 0; });

  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  // monta a malha antes da seção aparecer, sem travar o carregamento
  new IntersectionObserver(([en], obs) => {
    if (!en.isIntersecting) return;
    obs.disconnect();
    setTimeout(buildShirt, 30);
  }, { rootMargin: '900px' }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || !shirt) return;
    uTime.value += dt;
    if (!dragging) rotY += (targetRot - rotY) * Math.min(1, dt * 3);
    tiltX += (tiltTarget - tiltX) * Math.min(1, dt * 4);
    rig.rotation.y = rotY + (dragging ? 0 : Math.sin(uTime.value * 0.5) * 0.07);
    rig.rotation.x = tiltX * 0.5;
    const side = Math.cos(rotY) >= 0 ? 'front' : 'back';
    if (side !== lastSide) { lastSide = side; onSideChange?.(side); }
    renderer.render(scene, camera);
  }
  tick();

  return {
    set(next) { state = { ...state, ...next }; redraw(); },
    showBack() {
      const k = Math.round(targetRot / Math.PI);
      if (Math.abs(k % 2) !== 1) targetRot = (k + 1) * Math.PI;
    },
    flip() { targetRot = (Math.round(targetRot / Math.PI) + 1) * Math.PI; },
    get side() { return lastSide; },
  };
}
