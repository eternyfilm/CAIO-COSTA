import { MODELOS, CATEGORIAS, waLink } from './config.js';
import { initHero } from './hero.js';
import { initManto } from './manto.js';

const { gsap, ScrollTrigger } = window;
if (!gsap || !ScrollTrigger) throw new Error('GSAP não carregou'); // a trava do CSS abre o site
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true }); // barra de endereço do celular não recalcula as seções travadas
document.documentElement.classList.add('js-ok');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mqMobile = matchMedia('(max-width: 720px)');
const EASE = { out: 'expo.out', inOut: 'expo.inOut', micro: 'power3.out' };

document.body.classList.add('is-loading');
const preInert = [document.querySelector('main'), document.querySelector('.header'), document.querySelector('.skip')].filter(Boolean);
preInert.forEach((n) => { n.inert = true; });
document.getElementById('year').textContent = new Date().getFullYear();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// ---------------- links da loja ----------------
$$('.js-wa').forEach((a) => { a.href = waLink(a.dataset.wa || 'Olá! Vim pelo site da Fonte.'); });

// ---------------- scroll suave ----------------
let lenis = null;
if (!reduced && typeof window.Lenis === 'function') {
  lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  const dest = typeof target === 'string' ? document.querySelector(target) : target;
  if (!dest) return;
  const focusDest = () => {
    if (!dest.hasAttribute('tabindex')) dest.setAttribute('tabindex', '-1');
    dest.focus({ preventScroll: true });
  };
  if (lenis) lenis.scrollTo(dest, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: focusDest, force: true });
  else { dest.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); focusDest(); }
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    const wasOpen = menuIsOpen;
    if (wasOpen) toggleMenu(false, false);
    if (location.hash !== id) history.pushState(null, '', id);
    setTimeout(() => scrollToTarget(id), wasOpen ? 450 : 0);
  });
});
window.addEventListener('popstate', () => scrollToTarget(location.hash || '#inicio'));
var menuIsOpen = false;

// ---------------- hero ----------------
// sem WebGL o site continua funcionando, só sem as partículas
const noop = () => {};
let hero;
try { hero = initHero($('#heroCanvas'), { reduced }); }
catch (err) { console.warn('Partículas desligadas:', err); hero = { setMorph: noop, intro: noop, setRunning: noop }; $('#heroCanvas').remove(); $('.hero__sticky').classList.add('no-gl'); }
const states = $$('.hero__state');
const heroNum = $('#heroNum');
const heroBar = $('#heroBar');
const heroCta = $('#heroCta');
let currentState = -1;
let lastMorph = 0;
function setHeroState(i) {
  if (i === currentState) return;
  currentState = i;
  states.forEach((s, k) => {
    s.classList.toggle('is-active', k === i);
    s.classList.toggle('is-past', k < i);
  });
  heroCta.classList.toggle('is-on', i === 0);
  document.body.classList.toggle('hero-cta-on', i === 0 && mqMobile.matches);
  heroNum.textContent = String(i + 1).padStart(2, '0');
}

ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate(self) {
    const x = Math.min(self.progress * 2.25, 2);
    const fl = Math.floor(x);
    const fr = x - fl;
    const s = fr < 0.3 ? 0 : fr > 0.7 ? 1 : (fr - 0.3) / 0.4;
    lastMorph = Math.min(2, fl + s * s * (3 - 2 * s));
    hero.setMorph(lastMorph);
    heroBar.style.transform = `scaleX(${self.progress})`;
    if (document.body.classList.contains('is-ready')) setHeroState(Math.round(lastMorph));
  },
});
// partículas só desenham com o hero na tela
let heroOnScreen = true;
new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; hero.setRunning(heroOnScreen && !menuIsOpen); }).observe($('.hero'));

// ---------------- marquee com velocidade do scroll ----------------
(function marquee() {
  if (reduced) return;
  const track = $('#marquee');
  let x = 0, dir = -1, half = track.scrollWidth / 2, on = true;
  window.addEventListener('resize', () => { half = track.scrollWidth / 2; });
  document.fonts?.ready.then(() => { half = track.scrollWidth / 2; });
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(track);
  gsap.ticker.add(() => {
    if (!on) return;
    const v = lenis ? lenis.velocity : 0;
    if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
    x += dir * (0.6 + Math.min(Math.abs(v) * 0.35, 14)) * gsap.ticker.deltaRatio();
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${Math.max(-8, Math.min(8, -v * 0.25))}deg)`;
  });
})();

// ---------------- manifesto palavra por palavra ----------------
(function manifesto() {
  const p = $('#manifestoText');
  const gold = /^(manto\.?|nome|Fonte)$/;
  const words = p.textContent.trim().split(/\s+/);
  p.textContent = '';
  words.forEach((w, i) => {
    p.appendChild(el('span', `word${gold.test(w) ? ' is-gold' : ''}`, w));
    if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
  });
  if (reduced) { $$('.word', p).forEach((w) => { w.style.opacity = 1; }); return; }
  gsap.to($$('.word', p), {
    opacity: 1, stagger: 0.08, ease: 'none',
    scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
})();

// ---------------- personalizador ----------------
function radioGroup(container, items, onSelect) {
  // padrão ARIA de radio: um único Tab, setas trocam a opção
  const pick = (i, focus) => {
    items.forEach((b, k) => {
      b.setAttribute('aria-checked', String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    if (focus) items[i].focus();
    onSelect(i);
  };
  items.forEach((b, i) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => pick(i, false));
  });
  if (!items.some((b) => b.tabIndex === 0)) items[0].tabIndex = 0;
  container.addEventListener('keydown', (e) => {
    const cur = items.indexOf(document.activeElement);
    if (cur < 0) return;
    const n = items.length;
    const map = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: n - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    pick((map[e.key] + n) % n, true);
  });
}

(function manto() {
  const stage = $('.manto__stage');
  const flipLabel = $('#mantoFlipLabel');
  const hint = $('#mantoHint');
  let api;
  try {
    api = initManto(stage, {
      reduced,
      onSideChange: (side) => { flipLabel.textContent = side === 'front' ? 'Ver costas' : 'Ver frente'; },
      onDrag: () => hint.classList.add('is-gone'),
    });
  } catch (err) {
    console.warn('Prévia 3D desligada:', err);
    api = { set: noop, showBack: noop, flip: noop, preload: noop };
    $('.manto__stage').classList.add('is-fallback');
    $('#mantoFlip').hidden = true;
    hint.textContent = 'Seu navegador não mostra a prévia 3D, mas o pedido funciona normal.';
  }
  const fNome = $('#fNome');
  const fNum = $('#fNum');
  const sw = $('#swatches');
  const modelName = $('#modelName');
  const sizeName = $('#sizeName');
  const cta = $('.js-wa-manto');
  let modelo = MODELOS[0];
  let tamanho = '';
  const touched = { nome: false, numero: false };

  const swatches = MODELOS.map((m, i) => {
    const wrap = el('div', 'swatch-wrap');
    const b = el('button', 'swatch');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.setAttribute('aria-label', m.nome);
    b.dataset.hover = '';
    const dot = el('i');
    dot.style.background = m.swatch || `linear-gradient(135deg, ${m.base} 0 50%, ${m.trim} 50% 100%)`;
    b.appendChild(dot);
    const nm = el('span', 'swatch-name', m.nome);
    nm.setAttribute('aria-hidden', 'true');
    wrap.append(b, nm);
    sw.appendChild(wrap);
    return b;
  });
  radioGroup(sw, swatches, (i) => {
    modelo = MODELOS[i];
    if (!reduced) gsap.fromTo(swatches[i], { scale: 0.88 }, { scale: 1.06, duration: 0.6, ease: EASE.out });
    update();
  });

  const SIZES = $$('#sizes button');
  radioGroup($('#sizes'), SIZES, (i) => {
    tamanho = SIZES[i].textContent.trim();
    sizeName.textContent = tamanho;
    update();
  });

  // só alfabeto latino (a fonte da camisa não tem os outros), acentos preservados
  const cleanNome = (v) => v.normalize('NFC').replace(/[^\p{Script=Latin} .'-]/gu, '').replace(/ {2,}/g, ' ').slice(0, 12);
  const cleanNum = (v) => v.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/\D/g, '').slice(0, 2);

  function update() {
    let nome = cleanNome(fNome.value).trim().toLocaleUpperCase('pt-BR').slice(0, 12);
    if (!/\p{L}/u.test(nome)) nome = '';
    const numero = cleanNum(fNum.value);
    modelName.textContent = modelo.nome;
    api.set({ modelo, nome, numero });
    stage.setAttribute('aria-label', `Prévia: camisa ${modelo.nome}, nome ${nome || 'vazio'}, número ${numero || 'vazio'}`);
    document.fonts?.load(`400 96px Anton`, nome || 'A').then(() => {});
    const nomeMsg = touched.nome ? (nome || 'sem nome') : 'quero definir no atendimento';
    const numMsg = touched.numero ? (numero || 'sem número') : 'quero definir no atendimento';
    const msg = `Olá! Montei meu manto no site da Fonte.\n\nModelo: ${modelo.nome}\nNome: ${nomeMsg}\nNúmero: ${numMsg}\nTamanho: ${tamanho || 'a definir'}\n\nQual o valor e o prazo?`;
    try { cta.href = waLink(msg); } catch { /* texto inválido: mantém o link anterior */ }
  }

  const nomeHint = $('#nomeHint');
  const updHint = () => {
    const n = fNome.value.length;
    nomeHint.textContent = n >= 12 ? 'Máximo de 12 letras. Nome grande? Abrevia (ex.: M. EDUARDA)' : `${n}/12 letras`;
    nomeHint.classList.toggle('is-max', n >= 12);
  };
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { update(); api.showBack(); }); };
  fNome.addEventListener('focus', () => fNome.select());
  const filterNome = () => {
    const v = cleanNome(fNome.value);
    if (v === fNome.value) return;
    // mantém o cursor no lugar ao remover caracteres
    const pos = fNome.selectionStart ?? v.length;
    const before = cleanNome(fNome.value.slice(0, pos)).length;
    fNome.value = v;
    try { fNome.setSelectionRange(before, before); } catch { /* ok */ }
  };
  fNome.addEventListener('input', (e) => {
    if (e.isComposing) return; // não mexe no texto no meio de um acento/IME
    filterNome();
    touched.nome = true;
    updHint(); schedule();
  });
  fNome.addEventListener('compositionend', () => { filterNome(); touched.nome = true; updHint(); schedule(); });
  fNome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fNum.focus(); } });
  fNum.addEventListener('focus', () => fNum.select());
  fNum.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fNum.blur(); } });
  fNum.addEventListener('input', () => {
    const v = cleanNum(fNum.value);
    if (v !== fNum.value) fNum.value = v;
    touched.numero = true;
    schedule();
  });
  $$('.num-ctrl button').forEach((b) => b.addEventListener('click', () => {
    const n = Math.min(99, Math.max(0, (parseInt(fNum.value, 10) || 0) + Number(b.dataset.step)));
    fNum.value = String(n).padStart(fNum.value.length > 1 ? 2 : 1, '0');
    touched.numero = true;
    update(); api.showBack();
  }));
  $('#mantoFlip').addEventListener('click', () => api.flip());
  $('#mantoForm').addEventListener('submit', (e) => e.preventDefault());

  document.fonts?.ready.then(update);
  updHint();
  update();
  api.preload?.(MODELOS.slice(1));
})();

// ---------------- drops (scroll horizontal) ----------------
const ICONES = {
  kit: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M104 112 H172 L180 176 H148 L139 142 L131 176 H98 Z" fill="#efe6d6"/><path d="M104 122 H172"/><path d="M58 30 L40 37 L20 63 L34 74 L45 65 L45 132 L96 132 L96 112 L117 112 L117 65 L128 74 L142 63 L122 37 L104 30 Q81 48 58 30 Z" fill="rgba(184,134,43,.08)"/><path d="M58 30 Q81 48 104 30"/></svg>`,
  manto: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M72 30 L48 40 L20 76 L38 90 L52 78 L52 172 L148 172 L148 78 L162 90 L180 76 L152 40 L128 30 Q100 52 72 30 Z" fill="rgba(184,134,43,.08)"/><path d="M72 30 Q100 52 128 30"/><text x="100" y="146" text-anchor="middle" font-family="Anton, Impact" font-size="72" fill="currentColor" stroke="none">10</text><text x="100" y="78" text-anchor="middle" font-family="Anton, Impact" font-size="15" fill="currentColor" stroke="none" letter-spacing="2">SEU NOME</text></svg>`,
  tenis: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M22 128 L24 92 Q26 82 36 84 L58 90 Q70 70 88 72 L96 74 L112 96 Q140 104 166 110 Q184 114 186 128 Z" fill="rgba(184,134,43,.1)"/><path d="M18 128 H190 Q192 140 180 142 H28 Q16 140 18 128 Z" fill="rgba(184,134,43,.18)"/><path d="M26 136 H184"/><path d="M24 92 Q40 96 44 116"/><path d="M78 80 L90 92 M86 76 L100 90 M94 74 L108 90"/><path d="M120 108 Q150 112 176 124" stroke-dasharray="4 6"/></svg>`,
  moletom: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M70 46 Q100 6 130 46 L156 56 L182 140 L162 148 L146 100 L146 176 L54 176 L54 100 L38 148 L18 140 L44 56 Z" fill="rgba(184,134,43,.08)"/><path d="M70 46 Q100 74 130 46"/><path d="M92 62 L90 96 M108 62 L110 96"/><path d="M74 128 H126 L134 158 H66 Z"/></svg>`,
  frase: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M72 30 L48 40 L20 76 L38 90 L52 78 L52 172 L148 172 L148 78 L162 90 L180 76 L152 40 L128 30 Q100 52 72 30 Z" fill="rgba(184,134,43,.08)"/><path d="M72 30 Q100 52 128 30"/><text x="100" y="124" text-anchor="middle" font-family="Instrument Serif, serif" font-style="italic" font-size="96" fill="currentColor" stroke="none">“</text><path d="M72 128 H128 M80 142 H120" stroke-width="3"/></svg>`,
  infantil: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M50 36 L32 44 L12 72 L26 82 L37 73 L37 160 L109 160 L109 73 L120 82 L134 72 L114 44 L96 36 Q73 54 50 36 Z" fill="rgba(184,134,43,.08)"/><path d="M50 36 Q73 54 96 36"/><path d="M136 92 L124 97 L112 115 L121 121 L128 116 L128 170 L178 170 L178 116 L185 121 L194 115 L182 97 L170 92 Q153 104 136 92 Z" fill="#efe6d6"/><path d="M136 92 Q153 104 170 92"/></svg>`,
};
const MSG_CATEGORIA = {
  kits: 'Olá! Vim pelo site da Fonte. Quero ver os kits (camisa e short) disponíveis. Meu tamanho é: ',
  mantos: 'Olá! Vim pelo site da Fonte. Quero ver os mantos de time e seleção. Meu tamanho é: ',
  tenis: 'Olá! Vim pelo site da Fonte. Quero ver os tênis disponíveis. Calço número: ',
  moletons: 'Olá! Vim pelo site da Fonte. Quero ver os moletons. Meu tamanho é: ',
  fe: 'Olá! Vim pelo site da Fonte. Quero ver as camisas com frases de fé. Meu tamanho é: ',
  infantil: 'Olá! Vim pelo site da Fonte. Quero ver os kits infantis. Idade da criança: ',
};
const FOTO_OK = /^img\/[\w-]+\.(jpe?g|png|webp|avif)$/;

(function drops() {
  const track = $('#dropsTrack');
  CATEGORIAS.forEach((c, i) => {
    const card = el('a', 'drop');
    card.href = waLink(MSG_CATEGORIA[c.id] || `Olá! Vim pelo site da Fonte. Quero ver: ${c.titulo}`);
    card.target = '_blank';
    card.rel = 'noopener';
    card.dataset.cursor = 'Ver';
    card.style.setProperty('--card-bg', c.cor);
    const media = el('div', 'drop__media');
    media.setAttribute('aria-hidden', 'true');
    if (c.foto && FOTO_OK.test(c.foto)) {
      const img = el('img');
      img.src = c.foto; img.alt = ''; img.loading = 'lazy';
      media.appendChild(img);
    } else media.innerHTML = ICONES[c.icone] || '';
    const num = el('span', 'drop__num', String(i + 1).padStart(2, '0'));
    num.setAttribute('aria-hidden', 'true');
    const inner = el('div', 'drop__inner');
    const info = el('div', 'drop__info');
    info.append(el('h3', 'drop__title', c.titulo), el('p', 'drop__text', c.texto), el('span', 'drop__cta', 'Ver no WhatsApp ↗'));
    inner.append(el('span', 'drop__tag', c.tag), info);
    const glare = el('span', 'drop__glare');
    card.append(media, num, inner, glare);
    track.appendChild(card);
  });
  const end = el('div', 'drop drop--end');
  const box = el('div');
  const link = el('a', 'pill', 'Chama no Zap ↗');
  link.href = waLink('Olá! Vim pelo site da Fonte e quero ver as novidades da semana. Meu tamanho é: ');
  link.target = '_blank'; link.rel = 'noopener'; link.dataset.magnetic = '';
  box.append(el('h3', 'drop__title', 'Viu algo?'), el('p', null, 'Manda o print no Zap que a gente separa pra você.'), link);
  end.appendChild(box);
  track.appendChild(end);

  const head = $('.drops__head');
  const bar = $('#dropsBar');
  const distance = () => track.scrollWidth - window.innerWidth;
  const st = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.drops',
      pin: '.drops__pin',
      start: 'top top',
      end: () => '+=' + distance(),
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        bar.style.transform = `scaleX(${self.progress})`;
        head.style.opacity = mqMobile.matches ? '1' : String(Math.max(0, 1 - self.progress * 12));
      },
    },
  }).scrollTrigger;

  // teclado: focar um card leva o scroll até ele, sem deslocar o pin
  track.addEventListener('focusin', (e) => {
    const card = e.target.closest('.drop');
    if (!card || !st) return;
    $('.drops__pin').scrollLeft = 0;
    const p = Math.min(1, Math.max(0, (card.offsetLeft - window.innerWidth * 0.3) / distance()));
    const y = st.start + (st.end - st.start) * p;
    if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });

  if (finePointer && !reduced) {
    $$('.drop:not(.drop--end)', track).forEach((card) => {
      const inner = $('.drop__inner', card);
      const media = $('.drop__media', card);
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: EASE.micro });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: EASE.micro });
      const mx = gsap.quickTo(media, 'x', { duration: 0.6, ease: EASE.micro });
      const my = gsap.quickTo(media, 'y', { duration: 0.6, ease: EASE.micro });
      const ix = gsap.quickTo(inner, 'x', { duration: 0.6, ease: EASE.micro });
      const iy = gsap.quickTo(inner, 'y', { duration: 0.6, ease: EASE.micro });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
        ry(px * 10); rx(-py * 10); mx(px * -18); my(py * -18); ix(px * 8); iy(py * 8);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); mx(0); my(0); ix(0); iy(0); });
    });
  }
})();

// ---------------- frases de fé ----------------
(function fe() {
  const lines = $$('.fe__line');
  if (reduced) { document.documentElement.classList.add('reduced'); return; }
  // seção travada enquanto as frases passam inteiras, devagar
  const gutter = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 24;
  const over = () => Math.max(...lines.map((l) => $('p', l).offsetWidth)) - window.innerWidth + gutter() * 2;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.fe__lines',
      pin: '.fe__lines',
      start: 'center center',
      end: () => '+=' + Math.max(400, over() * 1.1),
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  lines.forEach((line) => {
    const dir = Number(line.dataset.dir);
    const p = $('p', line);
    const a = () => gutter();
    const b = () => -(p.offsetWidth - window.innerWidth + gutter());
    tl.fromTo(p, { x: () => (dir > 0 ? a() : b()) }, { x: () => (dir > 0 ? b() : a()), ease: 'none' }, 0);
  });
})();

// ---------------- VEM PRA FONTE ----------------
$$('.split-big').forEach((block) => {
  if (block.classList.contains('gold-text')) {
    // a palavra dourada sobe inteira pra manter o degradê contínuo
    if (!reduced) gsap.from(block, { yPercent: 60, opacity: 0, ease: EASE.micro, scrollTrigger: { trigger: block, start: 'top 95%', end: 'top 55%', scrub: 0.8 } });
    return;
  }
  const chars = [...block.textContent];
  block.textContent = '';
  chars.forEach((c) => block.appendChild(el('span', 'char', c === ' ' ? ' ' : c)));
  if (reduced) return;
  gsap.from($$('.char', block), {
    yPercent: 100, rotate: 8, opacity: 0, stagger: 0.04, ease: EASE.micro,
    scrollTrigger: { trigger: block, start: 'top 90%', end: 'top 45%', scrub: 0.8 },
  });
});

if (!reduced) {
  gsap.from('.footer__wordmark span', {
    yPercent: 60, opacity: 0, stagger: 0.1, ease: EASE.micro,
    scrollTrigger: { trigger: '.footer', start: 'top 85%', end: 'bottom bottom', scrub: 0.8 },
  });
}

// ---------------- reveals genéricos ----------------
ScrollTrigger.batch('.reveal-up:not(.hero__meta)', {
  start: 'top 88%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: EASE.out }),
});

// ---------------- header e botão flutuante ----------------
(function header() {
  const h = $('#header');
  const fab = $('.fab');
  let last = 0;
  const onScroll = (y) => {
    h.classList.toggle('is-solid', y > 40);
    const keep = menuIsOpen || !!h.querySelector(':focus-visible');
    if (!keep) h.classList.toggle('is-hidden', y > last && y > 300);
    last = y;
    // no celular o Zap fica sempre à mão; no desktop aparece depois do hero
    const show = document.body.classList.contains('is-ready') && (mqMobile.matches || y > window.innerHeight * 0.8);
    fab.classList.toggle('is-visible', show);
  };
  h.addEventListener('focusin', () => { if (h.querySelector(':focus-visible')) h.classList.remove('is-hidden'); });
  const busy = new Set();
  new IntersectionObserver((ents) => {
    ents.forEach((e) => (e.isIntersecting ? busy.add(e.target) : busy.delete(e.target)));
    fab.classList.toggle('is-muted', busy.size > 0);
  }).observe($('.manto__panel'));
  [$('#fonte .fonte__grid'), $('.footer')].forEach((n) => n && new IntersectionObserver(([e]) => {
    e.isIntersecting ? busy.add(n) : busy.delete(n);
    fab.classList.toggle('is-muted', busy.size > 0);
  }).observe(n));
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  window.__fabUpdate = () => onScroll(window.scrollY);
})();

// ---------------- menu ----------------
const menuBtn = $('#menuBtn');
const menuLabel = $('.sr-only', menuBtn);
const inertTargets = () => [$('main'), $('.fab'), $('.header__nav'), $('.header .pill'), $('.brand'), $('.skip')].filter(Boolean);
let menuTl = null;
function toggleMenu(open, restoreFocus = true) {
  const body = document.body;
  const isOpen = open ?? !menuIsOpen;
  menuIsOpen = isOpen;
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  menuLabel.textContent = isOpen ? 'Fechar menu' : 'Abrir menu';
  $('#menu').setAttribute('aria-hidden', String(!isOpen));
  inertTargets().forEach((n) => { n.inert = isOpen; });
  if (menuTl) menuTl.kill();
  hero.setRunning(!isOpen && heroOnScreen);
  if (isOpen) {
    body.classList.add('menu-open');
    $('#header').classList.remove('is-hidden');
    lenis?.stop();
    menuTl = gsap.timeline()
      .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 46px) 38px)', duration: reduced ? 0.01 : 1, ease: EASE.inOut })
      .to('.menu__word', { y: 0, duration: reduced ? 0.01 : 0.9, stagger: 0.06, ease: EASE.out }, '-=0.45')
      .to('.menu__num, .menu__foot', { opacity: 1, duration: 0.5, stagger: 0.04 }, '-=0.7');
    setTimeout(() => $('.menu__links a')?.focus(), 60);
  } else {
    lenis?.start();
    menuTl = gsap.timeline({ onComplete: () => { if (!menuIsOpen) body.classList.remove('menu-open'); } })
      .to('.menu__word', { y: '110%', duration: 0.45, stagger: 0.03, ease: 'expo.in' })
      .to('.menu__num, .menu__foot', { opacity: 0, duration: 0.2 }, 0)
      .to('.menu__bg', { clipPath: 'circle(0% at calc(100% - 46px) 38px)', duration: 0.7, ease: EASE.inOut }, '-=0.15');
    if (restoreFocus) menuBtn.focus();
  }
}
let menuByKey = false;
menuBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') menuByKey = true; });
menuBtn.addEventListener('click', () => { const k = menuByKey; menuByKey = false; toggleMenu(undefined, k); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuIsOpen) toggleMenu(false, true); });

// ---------------- cursor ----------------
if (finePointer) {
  const cur = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; cur.style.opacity = 1; }, { passive: true });
  document.addEventListener('mouseleave', () => { cur.style.opacity = 0; });
  gsap.ticker.add(() => {
    const k = 1 - Math.pow(0.84, gsap.ticker.deltaRatio());
    rx += (mx - rx) * k; ry += (my - ry) * k;
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, [data-hover], input');
    cur.classList.remove('is-hover', 'is-label');
    if (!t) return;
    if (t.dataset.cursor) { label.textContent = t.dataset.cursor; cur.classList.add('is-label'); }
    else cur.classList.add('is-hover');
  });
}

// ---------------- botões magnéticos ----------------
if (finePointer && !reduced) {
  $$('[data-magnetic]').forEach((t) => {
    const qx = gsap.quickTo(t, 'x', { duration: 0.5, ease: EASE.micro });
    const qy = gsap.quickTo(t, 'y', { duration: 0.5, ease: EASE.micro });
    let r = null, k = 0.3;
    t.addEventListener('pointerenter', () => {
      gsap.set(t, { x: 0, y: 0 });
      r = t.getBoundingClientRect();
      k = Math.min(0.3, 18 / (r.width / 2));
    });
    t.addEventListener('pointermove', (e) => {
      if (!r) return;
      qx((e.clientX - (r.left + r.width / 2)) * k);
      qy((e.clientY - (r.top + r.height / 2)) * k);
    });
    t.addEventListener('pointerleave', () => { r = null; qx(0); qy(0); });
  });
}

// ---------------- loader ----------------
(async function loader() {
  let seen = false;
  try { seen = sessionStorage.getItem('fr_seen') === '1'; sessionStorage.setItem('fr_seen', '1'); } catch { /* sem storage */ }
  const fast = seen || reduced;
  const count = $('#loaderCount');
  const counter = { v: 0 };
  const show = () => { count.textContent = String(Math.round(counter.v)).padStart(3, '0'); };
  const fonts = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
  const minTime = new Promise((r) => setTimeout(r, fast ? 150 : 650));
  gsap.to(counter, { v: 92, duration: fast ? 0.15 : 0.6, ease: 'power2.out', onUpdate: show });
  await Promise.all([fonts, minTime]);
  await gsap.to(counter, { v: 100, duration: fast ? 0.05 : 0.2, ease: 'power1.out', onUpdate: show, overwrite: true });

  const reveal = () => {
    preInert.forEach((n) => { n.inert = false; });
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    hero.intro(fast ? 1.2 : 2.4);
    ScrollTrigger.refresh();
    setHeroState(Math.round(lastMorph));
    window.__fabUpdate?.();
  };
  const tl = gsap.timeline();
  if (fast) {
    tl.add(reveal).to('.loader', { autoAlpha: 0, duration: 0.35 });
  } else {
    tl.to('.loader__inner', { y: -30, opacity: 0, duration: 0.45, ease: 'expo.in' })
      .to('.loader__curtain', { scaleY: 1, duration: 0.55, ease: EASE.inOut }, '-=0.15')
      .add(reveal)
      .to('.loader__curtain', { scaleY: 0, transformOrigin: 'top', duration: 0.6, ease: EASE.inOut })
      .to('.loader', { autoAlpha: 0, duration: 0.01 });
  }
  tl.to('.hero__meta', { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: EASE.out }, '-=0.4')
    .add(() => { if (!menuIsOpen) lenis?.start(); }, '-=0.5');
})();

let anchor = null;
const sections = () => $$('main > section, main > footer');
ScrollTrigger.addEventListener('refreshInit', () => {
  if (!document.body.classList.contains('is-ready')) return;
  const y = window.scrollY;
  const sec = sections().find((n) => { const r = n.getBoundingClientRect(); return r.top <= 1 && r.bottom > 1; });
  if (!sec) { anchor = null; return; }
  const st = ScrollTrigger.getAll().find((t) => t.isActive && t.pin && sec.contains(t.trigger));
  anchor = st ? { st, p: st.progress } : { sec, off: (y - (sec.getBoundingClientRect().top + y)) / Math.max(1, sec.offsetHeight) };
});
ScrollTrigger.addEventListener('refresh', () => {
  if (!anchor) return;
  const a = anchor; anchor = null;
  const y = a.st ? a.st.start + (a.st.end - a.st.start) * a.p : a.sec.getBoundingClientRect().top + window.scrollY + a.off * a.sec.offsetHeight;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
});
window.addEventListener('load', () => ScrollTrigger.refresh());
