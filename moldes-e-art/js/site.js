/* Moldes e Art — interface (catálogo, lightbox, WhatsApp, formulário). Sem dependências. */
(function () {
  'use strict';

  // >>> Confirmar com o cliente o número do WhatsApp de vendas (DDI + DDD + número, só dígitos).
  var WHATSAPP = '5561994538021';
  // Categorias do Drive que não entram no catálogo público (pedidos pessoais de cliente).
  var EXCLUIR = ['richaud'];
  var POR_PAGINA = 24;

  function zapUrl(msg) { return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---------- loader: plano B ----------
  // O cena3d.js já tira o loader, mas ele depende do three.js vindo do CDN. Se o CDN falhar ou a
  // internet estiver lenta, aquele script nem roda, e o site ficava preso no loader pra sempre.
  setTimeout(function () { var l = document.getElementById('loader'); if (l) l.classList.add('fora'); }, 8000);

  // ---------- links de WhatsApp ----------
  $$('[data-zap]').forEach(function (a) { a.href = zapUrl(a.getAttribute('data-zap')); });

  // ---------- topo sólido ao rolar ----------
  var topo = $('#top');
  function onScroll() { topo.classList.toggle('solido', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---------- estados (faixa infinita) ----------
  var UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  var trilho = $('#trilho');
  if (trilho) {
    var html = '';
    for (var k = 0; k < 2; k++) UFS.forEach(function (u) { html += '<span' + (u === 'DF' ? ' class="df"' : '') + '>' + u + '</span><span>·</span>'; });
    trilho.innerHTML = html;
  }

  // ---------- catálogo ----------
  var dados = { categorias: [] };
  var estado = { cat: 'todos', busca: '', lista: [], mostrando: 0 };
  var grade = $('#grade'), catsEl = $('#cats'), maisBtn = $('#maisBtn');

  function siglaDe(slug) { return slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase(); }

  function prepara(json) {
    // só fotos próprias do ateliê (as "Digitalizado" e prints de terceiros ficam fora)
    var publicavel = function (i) { return i.tipo !== 'video' && i.propria !== false; };
    var cats = (json.categorias || []).filter(function (c) {
      return c.publico !== false && EXCLUIR.indexOf(c.slug) === -1 && c.itens && c.itens.some(publicavel);
    });
    cats.forEach(function (c) {
      var n = 0;
      c.itens = c.itens.filter(publicavel).map(function (i) {
        n++;
        return { id: i.id, src: i.arquivo, cat: c.slug, catNome: c.nome,
          codigo: siglaDe(c.slug) + '-' + String(n).padStart(2, '0'),
          titulo: (i.titulo || '').trim() };
      });
    });
    return cats;
  }

  function todosItens() {
    // "Todos" intercala as categorias para a primeira tela já mostrar variedade
    var filas = dados.categorias.map(function (c) { return c.itens.slice(); });
    var out = [], resta = true;
    while (resta) {
      resta = false;
      filas.forEach(function (f) { if (f.length) { out.push(f.shift()); resta = true; } });
    }
    return out;
  }

  function filtra() {
    var q = estado.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    var base = estado.cat === 'todos' ? todosItens()
      : ((dados.categorias.find(function (c) { return c.slug === estado.cat; }) || {}).itens || []);
    if (!q) return base;
    return base.filter(function (i) {
      var alvo = (i.catNome + ' ' + i.titulo + ' ' + i.codigo).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return alvo.indexOf(q) !== -1;
    });
  }

  function desenhaCats() {
    var total = dados.categorias.reduce(function (s, c) { return s + c.itens.length; }, 0);
    var h = '<button class="chip' + (estado.cat === 'todos' ? ' on' : '') + '" role="tab" data-cat="todos" aria-selected="' + (estado.cat === 'todos') + '">Todos <small>' + total + '</small></button>';
    dados.categorias.forEach(function (c) {
      var on = estado.cat === c.slug;
      h += '<button class="chip' + (on ? ' on' : '') + '" role="tab" data-cat="' + c.slug + '" aria-selected="' + on + '">' + (c.emoji ? c.emoji + ' ' : '') + c.nome + ' <small>' + c.itens.length + '</small></button>';
    });
    catsEl.innerHTML = h;
  }

  function cardHtml(i, idx) {
    var nome = i.titulo || ('Molde ' + i.catNome.toLowerCase());
    return '<article class="card" tabindex="0" data-i="' + idx + '" style="animation-delay:' + ((idx % POR_PAGINA) * 35) + 'ms">' +
      // card usa a miniatura (560 px); a foto grande só carrega no lightbox
      '<img loading="lazy" decoding="async" width="560" height="700" src="' + i.src.replace('assets/catalogo/', 'assets/catalogo/mini/') + '" alt="' + nome.replace(/"/g, '') + ', categoria ' + i.catNome + '">' +
      '<div class="info"><div><span>' + i.codigo + '</span><strong>' + nome + '</strong></div><i class="mais" aria-hidden="true">+</i></div></article>';
  }

  function desenhaGrade(reset) {
    if (reset) { estado.lista = filtra(); estado.mostrando = 0; grade.innerHTML = ''; }
    if (!estado.lista.length) {
      grade.innerHTML = '<div class="vazio">' + (dados.categorias.length ? 'Nenhum molde encontrado com esse nome. Tente outra palavra ou chame a gente no WhatsApp.' : 'O catálogo está sendo carregado.') + '</div>';
      maisBtn.hidden = true; return;
    }
    var fim = Math.min(estado.mostrando + POR_PAGINA, estado.lista.length);
    var h = '';
    for (var k = estado.mostrando; k < fim; k++) h += cardHtml(estado.lista[k], k);
    grade.insertAdjacentHTML('beforeend', h);
    estado.mostrando = fim;
    maisBtn.hidden = estado.mostrando >= estado.lista.length;
    if (!maisBtn.hidden) maisBtn.textContent = 'Ver mais moldes (' + (estado.lista.length - estado.mostrando) + ')';
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

  // inclinação 3D dos cards
  grade.addEventListener('pointermove', function (e) {
    var c = e.target.closest('.card'); if (!c || e.pointerType === 'touch') return;
    var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = 'rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateZ(8px)';
  });
  grade.addEventListener('pointerout', function (e) {
    var c = e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
  });

  // ---------- lightbox ----------
  var lb = $('#lb'), lbIdx = 0;
  function abreLb(idx) {
    lbIdx = idx; var i = estado.lista[idx]; if (!i) return;
    $('#lbImg').src = i.src;
    $('#lbImg').alt = (i.titulo || 'Molde') + ', ' + i.catNome;
    $('#lbCat').textContent = i.catNome;
    $('#lbCod').textContent = (i.titulo ? i.titulo + ' · ' : 'Molde ') + i.codigo;
    $('#lbZap').href = zapUrl('Olá! Tenho interesse no molde ' + i.codigo + ' (' + i.catNome + (i.titulo ? ', ' + i.titulo : '') + ') que vi no site. Pode me passar valor e prazo?');
    lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbFechar').focus();
  }
  function fechaLb() { lb.hidden = true; document.body.style.overflow = ''; }
  grade.addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) abreLb(+c.getAttribute('data-i')); });
  grade.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var c = e.target.closest('.card'); if (c) abreLb(+c.getAttribute('data-i')); } });
  $('#lbFechar').addEventListener('click', fechaLb);
  $('#lbAnt').addEventListener('click', function () { abreLb((lbIdx - 1 + estado.lista.length) % estado.lista.length); });
  $('#lbProx').addEventListener('click', function () { abreLb((lbIdx + 1) % estado.lista.length); });
  lb.addEventListener('click', function (e) { if (e.target === lb) fechaLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') fechaLb();
    if (e.key === 'ArrowRight') $('#lbProx').click();
    if (e.key === 'ArrowLeft') $('#lbAnt').click();
  });

  fetch('assets/catalogo/catalogo.json').then(function (r) { return r.ok ? r.json() : { categorias: [] }; })
    .catch(function () { return { categorias: [] }; })
    .then(function (json) { dados.categorias = prepara(json); desenhaCats(); desenhaGrade(true); });

  // ---------- formulário sob medida -> WhatsApp ----------
  $('#formSm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, v = function (n) { return (f.elements[n].value || '').trim(); };
    var linhas = ['Olá! Quero um molde sob medida.'];
    if (v('nome')) linhas.push('Nome: ' + v('nome'));
    linhas.push('Ideia: ' + (v('ideia') || 'vou mandar a foto aqui'));
    linhas.push('Material: ' + v('material'));
    linhas.push('Quantidade de moldes: ' + (v('qtd') || '1'));
    if (v('cidade')) linhas.push('Cidade para o frete: ' + v('cidade'));
    var url = zapUrl(linhas.join('\n'));
    var w = window.open(url, '_blank'); // sem 'noopener' aqui: com ele o retorno é sempre null
    if (w) { try { w.opener = null; } catch (err) {} }
    if (!w) { var n = document.getElementById('notaForm'); n.innerHTML = 'Se o WhatsApp não abriu, <a href="' + url + '" target="_blank" rel="noopener" style="color:#41b8ff;text-decoration:underline">toque aqui para abrir a mensagem</a>.'; }
  });

  // ---------- revelar ao rolar ----------
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var alvos = $$('.sec .h2, .sec .sub, .selo, .form-sm, .etapas li');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove('espera'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    alvos.forEach(function (el) {
      var r = el.getBoundingClientRect();
      el.classList.add('rev');
      if (r.top > innerHeight) { el.classList.add('espera'); io.observe(el); }
    });
  }
})();
