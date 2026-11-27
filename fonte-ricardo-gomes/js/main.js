import { LOJA, MODELOS, CATEGORIAS, waLink } from './config.js';
import { initHero } from './hero.js';
import { initManto } from './manto.js';

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = matchMedia('(max-width: 720px)').matches;

document.getElementById('year').textContent = new Date().getFullYear();

// ---------------- links da loja ----------------
$$('.js-wa').forEach((a) => { a.href = waLink(a.dataset.wa || 'Olá! Vim pelo site da Fonte.'); });
$$('.js-map').forEach((a) => { a.href = LOJA.mapa; });

// ---------------- scroll suave ----------------
let lenis = null;
if (!reduced) {
  lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else el.scrollIntoView({ behavior: 'smooth' });
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) toggleMenu(false);
    setTimeout(() => scrollToTarget(id), document.body.classList.contains('menu-open') ? 450 : 0);
  });
});

// ---------------- hero ----------------
const hero = initHero($('#heroCanvas'));
const states = $$('.hero__state');
const heroNum = $('#heroNum');
const heroBar = $('#heroBar');
let currentState = -1;
function setHeroState(i) {
  if (i === currentState) return;
  currentState = i;
  states.forEach((s, k) => s.classList.toggle('is-active', k === i));
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
    const m = Math.min(2, fl + s * s * (3 - 2 * s));
    hero.setMorph(m);
    heroBar.style.transform = `scaleX(${self.progress})`;
    if (document.body.classList.contains('is-ready')) setHeroState(Math.round(m));
  },
});
ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: 'bottom top',
  onToggle: (self) => hero.setRunning(self.isActive),
});

// ---------------- marquee com velocidade do scroll ----------------
(function marquee() {
  const track = $('#marquee');
  let x = 0, dir = -1;
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0;
    if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
    x += dir * (0.6 + Math.min(Math.abs(v) * 0.35, 14));
    const half = track.scrollWidth / 2;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${Math.max(-8, Math.min(8, -v * 0.25))}deg)`;
  });
})();

// ---------------- manifesto palavra por palavra ----------------
(function manifesto() {
  const el = $('#manifestoText');
  const gold = /^(manto\.?|nome|Fonte)$/;
  el.innerHTML = el.textContent.trim().split(/\s+/)
    .map((w) => `<span class="word${gold.test(w) ? ' is-gold' : ''}">${w}</span>`).join(' ');
  gsap.to($$('.word', el), {
    opacity: 1,
    stagger: 0.08,
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
})();

// ---------------- personalizador ----------------
(function manto() {
  const flipLabel = $('#mantoFlipLabel');
  const api = initManto($('#mantoCanvas'), {
    onSideChange: (side) => { flipLabel.textContent = side === 'front' ? 'Ver costas' : 'Ver frente'; },
  });
  const fNome = $('#fNome');
  const fNum = $('#fNum');
  const sw = $('#swatches');
  const modelName = $('#modelName');
  const cta = $('.js-wa-manto');
  let modelo = MODELOS[0];

  MODELOS.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.setAttribute('aria-label', m.nome);
    b.dataset.hover = '';
    b.innerHTML = `<i style="background:${m.swatch || `linear-gradient(135deg, ${m.base} 0 50%, ${m.trim} 50% 100%)`}"></i>`;
    b.addEventListener('click', () => {
      modelo = m;
      $$('.swatch', sw).forEach((s) => s.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', 'true');
      gsap.fromTo(b, { scale: 0.85 }, { scale: 1.06, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      update();
    });
    sw.appendChild(b);
  });

  function update() {
    const nome = fNome.value.trim().toUpperCase();
    const numero = fNum.value.replace(/\D/g, '').slice(0, 2);
    modelName.textContent = modelo.nome;
    api.set({ modelo, nome, numero });
    const msg = `Olá! Vim pelo site da Fonte e quero personalizar um manto.\n\nModelo: ${modelo.nome}\nNome: ${nome || '(sem nome)'}\nNúmero: ${numero || '(sem número)'}\n\nQual o valor e os tamanhos disponíveis?`;
    cta.href = waLink(msg);
  }

  fNome.addEventListener('input', () => {
    fNome.value = fNome.value.replace(/[^\p{L}\s.'-]/gu, '').toUpperCase();
    update(); api.showBack();
  });
  fNum.addEventListener('input', () => {
    fNum.value = fNum.value.replace(/\D/g, '').slice(0, 2);
    update(); api.showBack();
  });
  $$('.num-ctrl button').forEach((b) => b.addEventListener('click', () => {
    const n = (parseInt(fNum.value || '0', 10) + Number(b.dataset.step) + 100) % 100;
    fNum.value = String(n);
    update(); api.showBack();
  }));
  $('#mantoFlip').addEventListener('click', () => api.flip());
  $('#mantoForm').addEventListener('submit', (e) => e.preventDefault());

  document.fonts.ready.then(update);
  update();
})();

// ---------------- drops (scroll horizontal) ----------------
const ICONES = {
  kit: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M58 30 L40 37 L20 63 L34 74 L45 65 L45 132 L117 132 L117 65 L128 74 L142 63 L122 37 L104 30 Q81 48 58 30 Z" fill="rgba(212,164,64,.08)"/><path d="M58 30 Q81 48 104 30"/><path d="M104 112 H172 L180 176 H148 L139 142 L131 176 H98 Z" fill="rgba(212,164,64,.14)"/><path d="M104 122 H172"/></svg>`,
  manto: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M72 30 L48 40 L20 76 L38 90 L52 78 L52 172 L148 172 L148 78 L162 90 L180 76 L152 40 L128 30 Q100 52 72 30 Z" fill="rgba(212,164,64,.08)"/><path d="M72 30 Q100 52 128 30"/><text x="100" y="146" text-anchor="middle" font-family="Anton, Impact" font-size="72" fill="currentColor" stroke="none">10</text><text x="100" y="78" text-anchor="middle" font-family="Anton, Impact" font-size="15" fill="currentColor" stroke="none" letter-spacing="2">SEU NOME</text></svg>`,
  tenis: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M16 132 Q16 104 36 100 L66 96 Q80 72 100 74 L118 94 Q150 108 178 114 Q190 118 188 134 L188 142 Q100 152 16 142 Z" fill="rgba(212,164,64,.1)"/><path d="M16 142 L188 142 M20 132 Q100 140 186 130"/><path d="M90 84 L100 96 M98 80 L110 94 M106 78 L120 96"/><path d="M60 118 Q100 104 150 120" stroke-dasharray="4 6"/></svg>`,
  moletom: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M70 46 Q100 6 130 46 L156 56 L182 140 L162 148 L146 100 L146 176 L54 176 L54 100 L38 148 L18 140 L44 56 Z" fill="rgba(212,164,64,.08)"/><path d="M70 46 Q100 74 130 46"/><path d="M92 62 L90 96 M108 62 L110 96"/><path d="M74 128 H126 L134 158 H66 Z"/></svg>`,
  frase: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M72 30 L48 40 L20 76 L38 90 L52 78 L52 172 L148 172 L148 78 L162 90 L180 76 L152 40 L128 30 Q100 52 72 30 Z" fill="rgba(212,164,64,.08)"/><path d="M72 30 Q100 52 128 30"/><path d="M70 82 H130 M64 98 H136 M70 114 H130 M76 130 H124" stroke-width="5"/><path d="M90 150 H110" stroke-width="2"/></svg>`,
  infantil: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M50 36 L32 44 L12 72 L26 82 L37 73 L37 160 L109 160 L109 73 L120 82 L134 72 L114 44 L96 36 Q73 54 50 36 Z" fill="rgba(212,164,64,.08)"/><path d="M50 36 Q73 54 96 36"/><path d="M136 92 L124 97 L112 115 L121 121 L128 116 L128 170 L178 170 L178 116 L185 121 L194 115 L182 97 L170 92 Q153 104 136 92 Z" fill="rgba(212,164,64,.16)"/><path d="M136 92 Q153 104 170 92"/></svg>`,
};

(function drops() {
  const track = $('#dropsTrack');
  CATEGORIAS.forEach((c, i) => {
    const card = document.createElement('a');
    card.className = 'drop';
    card.href = waLink(`Olá! Vim pelo site da Fonte e quero ver as opções de ${c.titulo.toLowerCase()}.`);
    card.target = '_blank';
    card.rel = 'noopener';
    card.dataset.cursor = 'Ver';
    card.style.setProperty('--card-bg', c.cor);
    card.innerHTML = `
      <div class="drop__media">${c.foto ? `<img src="${c.foto}" alt="${c.titulo}" loading="lazy">` : ICONES[c.icone]}</div>
      <span class="drop__num">${String(i + 1).padStart(2, '0')}</span>
      <div class="drop__inner">
        <span class="drop__tag">${c.tag}</span>
        <div class="drop__info">
          <h3 class="drop__title">${c.titulo}</h3>
          <p class="drop__text">${c.texto}</p>
          <span class="drop__cta">Ver no WhatsApp ↗</span>
        </div>
      </div>
      <span class="drop__glare"></span>`;
    track.appendChild(card);
  });
  const end = document.createElement('div');
  end.className = 'drop drop--end';
  end.innerHTML = `<div><h3 class="drop__title">Viu algo?</h3><p>Manda o print no Zap que a gente separa pra você.</p>
    <a class="pill" href="${waLink('Olá! Vim pelo site da Fonte e queria ver as novidades.')}" target="_blank" rel="noopener" data-magnetic>Chama no Zap ↗</a></div>`;
  track.appendChild(end);

  const distance = () => track.scrollWidth - window.innerWidth;
  gsap.to(track, {
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
        $('#dropsBar').style.transform = `scaleX(${self.progress})`;
        if (!isMobile) $('.drops__head').style.opacity = String(Math.max(0, 1 - self.progress * 4));
      },
    },
  });

  if (finePointer) {
    $$('.drop', track).forEach((card) => {
      const inner = $('.drop__inner', card);
      const media = $('.drop__media', card);
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--gx', `${px * 100}%`);
        card.style.setProperty('--gy', `${py * 100}%`);
        gsap.to(card, { rotateY: (px - 0.5) * 10, rotateX: -(py - 0.5) * 10, duration: 0.6, ease: 'power3.out', transformPerspective: 900 });
        if (media) gsap.to(media, { x: (px - 0.5) * -18, y: (py - 0.5) * -18, duration: 0.6, ease: 'power3.out' });
        if (inner) gsap.to(inner, { x: (px - 0.5) * 8, y: (py - 0.5) * 8, duration: 0.6, ease: 'power3.out' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 1, ease: 'elastic.out(1, 0.6)' });
        gsap.to([media, inner], { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.6)' });
      });
    });
  }
})();

// ---------------- frases de fé ----------------
$$('.fe__line').forEach((line) => {
  const dir = Number(line.dataset.dir);
  const p = $('p', line);
  gsap.fromTo(p,
    { x: () => (dir > 0 ? window.innerWidth * 0.25 : -(p.offsetWidth - window.innerWidth * 0.75)) },
    {
      x: () => (dir > 0 ? -(p.offsetWidth - window.innerWidth * 0.75) : window.innerWidth * 0.25),
      ease: 'none',
      scrollTrigger: { trigger: line, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
    });
});

// ---------------- VEM PRA FONTE ----------------
$$('.split-big').forEach((el) => {
  el.innerHTML = [...el.textContent].map((c) => `<span class="char">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  gsap.from($$('.char', el), {
    yPercent: 100, rotate: 8, opacity: 0,
    stagger: 0.04, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 45%', scrub: 0.8 },
  });
});
// a classe gold-text precisa ir pros chars pra manter o degradê
$$('.split-big.gold-text').forEach((el) => {
  el.classList.remove('gold-text');
  $$('.char', el).forEach((c) => c.classList.add('gold-text'));
});

gsap.from('.footer__wordmark span', {
  yPercent: 60, opacity: 0, stagger: 0.1, ease: 'power3.out',
  scrollTrigger: { trigger: '.footer', start: 'top 85%', end: 'bottom bottom', scrub: 0.8 },
});

// ---------------- reveals genéricos ----------------
ScrollTrigger.batch('.reveal-up:not(.hero__meta)', {
  start: 'top 88%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }),
});

// ---------------- header e botão flutuante ----------------
(function header() {
  const h = $('#header');
  const fab = $('.fab');
  let last = 0;
  const onScroll = (y) => {
    h.classList.toggle('is-solid', y > 40);
    if (!document.body.classList.contains('menu-open')) h.classList.toggle('is-hidden', y > last && y > 300);
    last = y;
    fab.classList.toggle('is-visible', y > window.innerHeight * 0.8);
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
})();

// ---------------- menu ----------------
const menuBtn = $('#menuBtn');
let menuTl = null;
function toggleMenu(open) {
  const body = document.body;
  const isOpen = open ?? !body.classList.contains('menu-open');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
  $('#menu').setAttribute('aria-hidden', String(!isOpen));
  if (menuTl) menuTl.kill();
  if (isOpen) {
    body.classList.add('menu-open');
    $('#header').classList.remove('is-hidden');
    lenis?.stop();
    menuTl = gsap.timeline()
      .to('.menu__bg', { clipPath: 'circle(150% at calc(100% - 46px) 38px)', duration: 1, ease: 'expo.inOut' })
      .to('.menu__word', { y: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, '-=0.45')
      .to('.menu__num, .menu__foot', { opacity: 1, duration: 0.5, stagger: 0.04 }, '-=0.7');
  } else {
    lenis?.start();
    menuTl = gsap.timeline({ onComplete: () => body.classList.remove('menu-open') })
      .to('.menu__word', { y: '110%', duration: 0.45, stagger: 0.03, ease: 'expo.in' })
      .to('.menu__num, .menu__foot', { opacity: 0, duration: 0.2 }, 0)
      .to('.menu__bg', { clipPath: 'circle(0% at calc(100% - 46px) 38px)', duration: 0.7, ease: 'expo.inOut' }, '-=0.15');
  }
}
menuBtn.addEventListener('click', () => toggleMenu());
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggleMenu(false); });

// ---------------- cursor ----------------
if (finePointer) {
  const cur = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  let mx = -100, my = -100, rx = -100, ry = -100;
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
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
if (finePointer) {
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest('[data-magnetic]');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    gsap.to(t, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: 'power3.out' });
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest('[data-magnetic]');
    if (t && !t.contains(e.relatedTarget)) gsap.to(t, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
  });
}

// ---------------- loader ----------------
(async function loader() {
  const count = $('#loaderCount');
  const counter = { v: 0 };
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const minTime = new Promise((r) => setTimeout(r, reduced ? 200 : 1700));
  gsap.to(counter, {
    v: 92, duration: 1.6, ease: 'power2.out',
    onUpdate: () => { count.textContent = String(Math.round(counter.v)).padStart(3, '0'); },
  });
  await Promise.all([fonts, minTime]);
  await gsap.to(counter, {
    v: 100, duration: 0.35, ease: 'power1.out',
    onUpdate: () => { count.textContent = String(Math.round(counter.v)).padStart(3, '0'); },
  });

  const tl = gsap.timeline();
  tl.to('.loader__inner', { y: -40, opacity: 0, duration: 0.6, ease: 'expo.in' })
    .to('.loader__curtain', { scaleY: 1, duration: 0.7, ease: 'expo.inOut' }, '-=0.2')
    .add(() => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      hero.intro();
      setHeroState(0);
      ScrollTrigger.refresh();
    })
    .to('.loader__curtain', { scaleY: 0, transformOrigin: 'top', duration: 0.8, ease: 'expo.inOut' })
    .to('.loader', { autoAlpha: 0, duration: 0.01 })
    .to('.hero__meta', { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }, '-=0.5')
    .add(() => lenis?.start(), '-=0.6');
})();

window.addEventListener('load', () => ScrollTrigger.refresh());
