/* Moldes e Art v2: interface (loader, rolagem suave, cursor, colagem, catálogo, lightbox, WhatsApp). */
(function () {
  'use strict';

  // >>> Confirmar com o cliente o número do WhatsApp de vendas (DDI + DDD + número, só dígitos).
  var WHATSAPP = '5561994538021';
  var EXCLUIR = ['richaud'];
  var POR_PAGINA = 24;
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mouse = matchMedia('(pointer: fine)').matches;

  function zapUrl(msg) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var raiz = document.documentElement;

  // ---------- sem 3D (iOS antigo sem import map, ou CDN fora) ----------
  var temImportMap = window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');
  if (!temImportMap) raiz.classList.add('sem-3d');

  // ---------- loader com contador ----------
  // sobe sozinho até ~85% e só fecha quando a cena 3D avisar que está pronta (ou no tempo limite)
  var ldNum = $('#ldNum'), ldVal = 0, ldAlvo = 85, ldFim = false;
  function tickLoader() {
    ldVal += (ldAlvo - ldVal) * (ldFim ? 0.22 : 0.05);
    if (ldNum) ldNum.textContent = Math.min(100, Math.round(ldVal));
    if (ldFim && ldVal > 99.4) { if (ldNum) ldNum.textContent = '100'; return fechaLoader(); }
    requestAnimationFrame(tickLoader);
  }
  function fechaLoader() {
    setTimeout(function () {
      $('#loader').classList.add('fora');
      document.body.classList.add('pronto');
    }, 180);
  }
  function terminaLoader() { if (ldFim) return; ldFim = true; ldAlvo = 100; }
  requestAnimationFrame(tickLoader);
  window.addEventListener('cena-pronta', terminaLoader);
  setTimeout(function () { terminaLoader(); if (!window.__3dOk) raiz.classList.add('sem-3d'); }, temImportMap ? 7000 : 600);

  // ---------- links de WhatsApp ----------
  $$('[data-zap]').forEach(function (a) { a.href = zapUrl(a.getAttribute('data-zap')); });
  var numBonito = '(' + WHATSAPP.slice(2, 4) + ') ' + WHATSAPP.slice(4, 9) + '-' + WHATSAPP.slice(9);
  $$('[data-zap-num]').forEach(function (el) { el.textContent = numBonito; if (el.tagName === 'A') el.href = 'tel:+' + WHATSAPP; });

  // ---------- rolagem suave (só com mouse; no celular a rolagem nativa é melhor) ----------
  var lenis = null;
  function rolarPara(alvo) {
    if (lenis) lenis.scrollTo(alvo, { offset: -70, duration: 1.4 });
    else alvo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
  }
  if (mouse && !calmo) {
    var sc = document.createElement('script');
    sc.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js';
    sc.onload = function () {
      if (!window.Lenis) return;
      lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      raiz.classList.add('lenis');
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    };
    document.head.appendChild(sc);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id.length < 2) return;
    var alvo = document.querySelector(id); if (!alvo) return;
    e.preventDefault(); rolarPara(alvo);
  });

  // ---------- topo: some ao descer, volta ao subir, escurece sobre blocos escuros ----------
  var topo = $('#topo'), ultimoY = 0, escuros = $$('.processo, .rodape .cartao');
  function onScroll() {
    var y = window.scrollY;
    topo.classList.toggle('solido', y > 40);
    topo.classList.toggle('escondido', y > 600 && y > ultimoY + 4 && lb.hidden);
    if (y < ultimoY - 4) topo.classList.remove('escondido');
    ultimoY = y;
    var meio = 36, esc = false;
    escuros.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < meio && r.bottom > meio) esc = true; });
    topo.classList.toggle('escuro', esc);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- botão flutuante some quando já há um botão de WhatsApp na tela ----------
  var flut = $('.zap-flutuante');
  if (flut && 'IntersectionObserver' in window) {
    var visiveis = new Set();
    var ioZap = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) visiveis.add(en.target); else visiveis.delete(en.target); });
      flut.classList.toggle('some', visiveis.size > 0);
    });
    $$('.hero, #formSm, .cartao .ctas').forEach(function (el) { ioZap.observe(el); });
  }

  // ---------- cursor ----------
  var cur = $('.cursor');
  if (mouse && cur) {
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      var t = e.target;
      cur.classList.toggle('ver', !!t.closest('.card, .foto'));
      cur.classList.toggle('link', !t.closest('.card') && !!t.closest('a, button, input, select, textarea, label'));
      cur.classList.toggle('escuro', !!t.closest('.processo, .cartao, .lightbox, .sm-bloco'));
      cur.classList.toggle('some', !!t.closest('#gl'));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.add('some'); });
    (function anda() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(anda);
    })();
  }

  // ---------- botões magnéticos ----------
  if (mouse && !calmo) {
    $$('.pill').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25, y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  // ---------- manifesto: cada palavra acende conforme a rolagem ----------
  var mTexto = $('[data-palavras]'), palavras = [];
  if (mTexto) {
    mTexto.innerHTML = mTexto.textContent.trim().split(/\s+/).map(function (w) { return '<span class="p">' + w + '</span>'; }).join(' ');
    palavras = $$('.p', mTexto);
    if (calmo) palavras.forEach(function (p) { p.classList.add('on'); });
  }
  function acendePalavras() {
    if (!palavras.length || calmo) return;
    var r = mTexto.getBoundingClientRect();
    var prog = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35);
    var n = Math.round(Math.max(0, Math.min(1, prog)) * palavras.length);
    palavras.forEach(function (p, i) { p.classList.toggle('on', i < n); });
  }

  // ---------- colagem do processo ----------
  // posições em % do palco (x, y, largura, velocidade). Celular usa outra grade.
  var POS_DESK = [[4, 8, 15, 1.1], [24, 2, 11, .6], [70, 6, 13, .9], [86, 18, 11, 1.4], [8, 42, 12, .7], [80, 44, 14, 1.0],
    [30, 62, 10, 1.5], [60, 66, 12, .8], [14, 78, 11, 1.2], [74, 82, 10, .6], [44, 88, 13, 1.1]];
  var POS_CEL = [[3, 2, 30, 1.0], [67, 12, 30, .6], [2, 40, 26, 1.3], [72, 50, 26, .8], [4, 72, 30, .7], [66, 82, 30, 1.2]];
  var colagem = $('#colagem'), palco = $('.proc-palco'), fotos = [];
  function montaColagem(itens) {
    if (!colagem) return;
    var cel = innerWidth < 760, pos = cel ? POS_CEL : POS_DESK;
    var escolha = [], vistos = {};
    // uma foto padronizada de cada categoria, para a colagem mostrar variedade
    itens.forEach(function (i) { if (i.pad && !vistos[i.cat] && escolha.length < pos.length) { vistos[i.cat] = 1; escolha.push(i); } });
    colagem.innerHTML = escolha.map(function (i, k) {
      var p = pos[k];
      return '<figure class="foto" data-v="' + p[3] + '" style="--x:' + p[0] + '%;--y:' + p[1] + '%;--w:' + p[2] + '%">' +
        '<img loading="lazy" decoding="async" src="' + i.src.replace('assets/catalogo/', 'assets/catalogo/mini/') + '" alt="">' +
        '<figcaption><span>' + i.codigo + '</span><span>' + i.catNome + '</span></figcaption></figure>';
    }).join('');
    fotos = $$('.foto', colagem).map(function (f) { return { el: f, v: +f.getAttribute('data-v') }; });
    colagem.addEventListener('click', function (e) { if (e.target.closest('.foto')) rolarPara($('#catalogo')); });
  }
  function moveColagem() {
    if (!fotos.length || calmo) return;
    var r = palco.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) return;
    var prog = (innerHeight - r.top) / (r.height + innerHeight); // 0 → 1 enquanto o palco cruza a tela
    fotos.forEach(function (f) { f.el.style.transform = 'translate3d(0,' + ((0.5 - prog) * f.v * 60) + 'vh,0)'; });
  }

  // ---------- painéis de materiais ----------
  var paineis = $$('.painel');
  function abrePainel(p) { paineis.forEach(function (x) { x.classList.toggle('on', x === p); x.setAttribute('aria-expanded', x === p); }); }
  paineis.forEach(function (p) {
    p.addEventListener('click', function () { abrePainel(p); });
    if (mouse) p.addEventListener('pointerenter', function () { abrePainel(p); });
  });

  // ---------- estados (faixa infinita) ----------
  var UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  var trilho = $('#trilho');
  if (trilho) {
    var html = '';
    for (var k = 0; k < 2; k++) UFS.forEach(function (u) { html += '<span' + (u === 'DF' ? ' class="df"' : '') + '>' + u + '</span><span class="pt">•</span>'; });
    trilho.innerHTML = html;
  }

  // ---------- revelar ao rolar ----------
  if ('IntersectionObserver' in window && !calmo) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('vis'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.sec-cab, .m-pe, .passos li, .paineis, .sm-bloco, .selo, .final, .rod-cols').forEach(function (el, i) {
      el.classList.add('rev'); el.style.transitionDelay = (el.matches('.passos li, .selo') ? (i % 3) * 0.1 : 0) + 's'; io.observe(el);
    });
  }

  // ---------- catálogo ----------
  var dados = { categorias: [] };
  var estado = { cat: 'todos', busca: '', lista: [], mostrando: 0 };
  var grade = $('#grade'), catsEl = $('#cats'), maisBtn = $('#maisBtn');
  function siglaDe(slug) { return slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase(); }

  function prepara(json) {
    var publicavel = function (i) { return i.tipo !== 'video' && i.propria !== false && !i.oculto; };
    var cats = (json.categorias || []).filter(function (c) {
      return c.publico !== false && EXCLUIR.indexOf(c.slug) === -1 && c.itens && c.itens.some(publicavel);
    });
    cats.forEach(function (c) {
      var n = 0;
      c.itens = c.itens.filter(publicavel).map(function (i) {
        n++;
        return { id: i.id, src: i.padrao || i.arquivo, pad: !!i.padrao, cat: c.slug, catNome: c.nome,
          codigo: i.codigo || (siglaDe(c.slug) + '-N' + String(n).padStart(2, '0')),
          titulo: (i.titulo || '').trim(), medidas: (i.medidas || '').trim() };
      });
      c.itens.sort(function (a, b) { return (b.pad ? 1 : 0) - (a.pad ? 1 : 0); });
    });
    return cats;
  }
  function todosItens() {
    var filas = dados.categorias.map(function (c) { return c.itens.slice(); });
    var out = [], resta = true;
    while (resta) { resta = false; filas.forEach(function (f) { if (f.length) { out.push(f.shift()); resta = true; } }); }
    return out;
  }
  var SINONIMOS = {
    'santo': ['religiosos', 'anjos'], 'santa': ['religiosos', 'anjos'], 'nossa senhora': ['religiosos'], 'religio': ['religiosos', 'anjos'],
    'anjo': ['anjos', 'religiosos'], 'casamento': ['casal', 'coracao'], 'noiva': ['casal', 'coracao'], 'lembranc': ['casal', 'coracao', 'infantis', 'maes'],
    'bebe': ['infantis'], 'maternidade': ['infantis', 'maes'], 'cha de bebe': ['infantis'], 'batizado': ['religiosos', 'anjos', 'infantis'],
    'mae': ['maes'], 'dia das maes': ['maes', 'flores-rosas', 'coracao'], 'rosa': ['flores-rosas'], 'flor': ['flores-rosas'],
    'letra': ['alfabetos'], 'alfabeto': ['alfabetos'], 'numero': ['alfabetos'], 'urso': ['ursos'], 'concha': ['mar'], 'estrela do mar': ['mar', 'estrela'],
    'pastilha': ['partilhas-pequenas'], 'abobora': ['halloween'], 'arvore': ['natal'], 'papai noel': ['natal'], 'cacto': ['cactos'], 'suculenta': ['cactos'],
  };
  var semAcento = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function filtra() {
    var q = semAcento(estado.busca);
    var base = estado.cat === 'todos' ? todosItens()
      : ((dados.categorias.find(function (c) { return c.slug === estado.cat; }) || {}).itens || []);
    if (!q) return base;
    var cats = [];
    Object.keys(SINONIMOS).forEach(function (k) { if (q.indexOf(k) !== -1 || k.indexOf(q) === 0 && q.length >= 3) cats = cats.concat(SINONIMOS[k]); });
    return base.filter(function (i) {
      var alvo = semAcento(i.catNome + ' ' + i.cat + ' ' + i.titulo + ' ' + i.codigo);
      return alvo.indexOf(q) !== -1 || cats.indexOf(i.cat) !== -1;
    });
  }
  function desenhaCats() {
    var total = dados.categorias.reduce(function (s, c) { return s + c.itens.length; }, 0);
    var h = '<button class="chip' + (estado.cat === 'todos' ? ' on' : '') + '" data-cat="todos" aria-pressed="' + (estado.cat === 'todos') + '">Todos <small>' + total + '</small></button>';
    dados.categorias.forEach(function (c) {
      var on = estado.cat === c.slug;
      h += '<button class="chip' + (on ? ' on' : '') + '" data-cat="' + c.slug + '" aria-pressed="' + on + '">' + c.nome + ' <small>' + c.itens.length + '</small></button>';
    });
    catsEl.innerHTML = h;
  }
  function cardHtml(i, idx) {
    var nome = i.titulo || ('Molde ' + i.catNome.toLowerCase());
    return '<article class="card" tabindex="0" role="button" aria-label="Ver ' + nome.replace(/"/g, '') + ', código ' + i.codigo + '" data-i="' + idx + '" style="animation-delay:' + ((idx % POR_PAGINA) * 30) + 'ms">' +
      '<div class="img"><img loading="lazy" decoding="async" width="560" height="700" src="' + i.src.replace('assets/catalogo/', 'assets/catalogo/mini/') + '" alt="' + nome.replace(/"/g, '') + ', categoria ' + i.catNome + '"></div>' +
      '<div class="info"><span>' + i.codigo + '</span><strong>' + nome + '</strong></div></article>';
  }
  function desenhaGrade(reset) {
    if (reset) { estado.lista = filtra(); estado.mostrando = 0; grade.innerHTML = ''; }
    if (!estado.lista.length) {
      grade.innerHTML = '<div class="vazio">' + (dados.categorias.length ? 'Nenhum molde encontrado com esse nome. Tente outra palavra ou chame a gente no WhatsApp.' : 'O catálogo está sendo carregado.') + '</div>';
      maisBtn.hidden = true; return;
    }
    var fim = Math.min(estado.mostrando + POR_PAGINA, estado.lista.length), h = '';
    for (var k = estado.mostrando; k < fim; k++) h += cardHtml(estado.lista[k], k);
    grade.insertAdjacentHTML('beforeend', h);
    estado.mostrando = fim;
    maisBtn.hidden = estado.mostrando >= estado.lista.length;
    if (!maisBtn.hidden) maisBtn.textContent = 'Ver mais moldes (' + (estado.lista.length - estado.mostrando) + ')';
    if (lenis) lenis.resize();
  }
  catsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    estado.cat = b.getAttribute('data-cat'); desenhaCats(); desenhaGrade(true);
  });
  var tBusca;
  $('#busca').addEventListener('input', function (e) {
    clearTimeout(tBusca);
    tBusca = setTimeout(function () { estado.busca = e.target.value.trim(); desenhaGrade(true); }, 180);
  });
  maisBtn.addEventListener('click', function () { desenhaGrade(false); });

  // ---------- lightbox ----------
  var lb = $('#lb'), lbIdx = 0, focoAntes = null;
  function abreLb(idx) {
    lbIdx = idx; var i = estado.lista[idx]; if (!i) return;
    if (lb.hidden) focoAntes = document.activeElement;
    $('#lbImg').src = i.src;
    $('#lbImg').alt = (i.titulo || 'Molde') + ', ' + i.catNome;
    $('#lbCat').textContent = i.catNome + ' · ' + (idx + 1) + ' de ' + estado.lista.length;
    $('#lbCod').textContent = (i.titulo ? i.titulo + ' · ' : 'Molde ') + i.codigo + (i.medidas ? ' · ' + i.medidas : '');
    $('#lbZap').href = zapUrl('Olá! Tenho interesse no molde ' + i.codigo + ' (' + i.catNome + (i.titulo ? ', ' + i.titulo : '') + ') que vi no site. Pode me passar valor e prazo?');
    lb.hidden = false; document.body.style.overflow = 'hidden'; if (lenis) lenis.stop(); $('#lbFechar').focus();
  }
  function fechaLb() {
    lb.hidden = true; document.body.style.overflow = ''; if (lenis) lenis.start();
    if (focoAntes && focoAntes.focus) focoAntes.focus({ preventScroll: true });
  }
  var proxLb = function () { abreLb((lbIdx + 1) % estado.lista.length); };
  var antLb = function () { abreLb((lbIdx - 1 + estado.lista.length) % estado.lista.length); };
  grade.addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) abreLb(+c.getAttribute('data-i')); });
  grade.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { var c = e.target.closest('.card'); if (c) { e.preventDefault(); abreLb(+c.getAttribute('data-i')); } }
  });
  var toqueX = null, toqueY = null;
  lb.addEventListener('touchstart', function (e) { toqueX = e.touches[0].clientX; toqueY = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (toqueX === null) return;
    var dx = e.changedTouches[0].clientX - toqueX, dy = e.changedTouches[0].clientY - toqueY; toqueX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) proxLb(); else antLb(); }
  }, { passive: true });
  lb.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = $$('button:not([hidden]), a[href]', lb).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  $('#lbFechar').addEventListener('click', fechaLb);
  $('#lbAnt').addEventListener('click', antLb);
  $('#lbProx').addEventListener('click', proxLb);
  lb.addEventListener('click', function (e) { if (e.target === lb) fechaLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') fechaLb();
    if (e.key === 'ArrowRight') proxLb();
    if (e.key === 'ArrowLeft') antLb();
  });

  fetch('assets/catalogo/catalogo.json').then(function (r) { return r.ok ? r.json() : { categorias: [] }; })
    .catch(function () { return { categorias: [] }; })
    .then(function (json) {
      dados.categorias = prepara(json); desenhaCats(); desenhaGrade(true);
      montaColagem(todosItens()); moveColagem();
    });

  // ---------- formulário sob medida -> WhatsApp ----------
  $('#formSm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, v = function (n) { return (f.elements[n].value || '').trim(); };
    var linhas = ['Olá! Quero um molde sob medida.'];
    if (v('nome')) linhas.push('Nome: ' + v('nome'));
    linhas.push('Ideia: ' + (v('ideia') || 'vou mandar a foto aqui'));
    linhas.push('Material: ' + v('material'));
    linhas.push('Quantos moldes: ' + (v('qtd') || '1'));
    if (v('pecas')) linhas.push('Quantas peças pretendo fazer: ' + v('pecas'));
    if (v('prazo')) linhas.push('Preciso para: ' + v('prazo'));
    if (v('cidade')) linhas.push('Cidade para o frete: ' + v('cidade'));
    linhas.push('(vou mandar a foto ou o logo de referência aqui na conversa)');
    var url = zapUrl(linhas.join('\n'));
    var w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch (err) {} }
    if (!w) $('#notaForm').innerHTML = 'Se o WhatsApp não abriu, <a href="' + url + '" target="_blank" rel="noopener">toque aqui para abrir a mensagem</a>.';
  });

  // ---------- laço de rolagem ----------
  var pedido = false;
  function quadro() { pedido = false; acendePalavras(); moveColagem(); }
  window.addEventListener('scroll', function () { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } }, { passive: true });
  window.addEventListener('resize', function () { quadro(); });
  onScroll(); quadro();
})();
