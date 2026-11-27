# Fonte Ricardo Gomes · site imersivo

Site da loja @fontericardogomes (moda masculina, Paranoá DF). Referências: lusion.co (3D interativo) e landonorris.com (tipografia gigante, scroll narrativo).

Site estático, sem build. Bibliotecas ficam em `vendor/` (Three.js, GSAP + ScrollTrigger, Lenis), então funciona em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages, Hostinger).

## Rodar local

```bash
cd fonte-ricardo-gomes
python3 -m http.server 8000
# abrir http://localhost:8000
```

Precisa de servidor (não abre com duplo clique por causa dos módulos JS).

## Estrutura

| Seção | O que faz | Arquivo |
|---|---|---|
| Loader | Coroa desenhando + contador 000 a 100 | `index.html`, `js/main.js` |
| Hero | 18 mil partículas douradas: logo (coroa + cabide) → número 10 → cruz. Mouse/dedo empurra as partículas | `js/hero.js` |
| Manifesto | Texto acende palavra por palavra no scroll | `js/main.js` |
| Monte seu manto | Foto real da camisa (frente e costas) girando em 3D, com nome, número, coroa e patrocínio estampados acompanhando as dobras e a luz do tecido. 5 modelos, escolha de tamanho, botão manda o pedido pronto pro WhatsApp | `js/manto.js`, fotos em `img/camisas/` |
| A loja | Scroll horizontal com as categorias, cards com tilt 3D | `js/main.js` + `CATEGORIAS` em `js/config.js` |
| Fé | Versículos e frases correndo em direções opostas | `index.html` |
| Visite | Endereço, WhatsApp, Instagram | `index.html` |

Dados da loja (WhatsApp, endereço, link do mapa, modelos de camisa e categorias) ficam todos em `js/config.js`.

## Pendências com o cliente

- [ ] **Fotos reais dos produtos.** Hoje os cards da loja usam ilustração em linha dourada. Pra trocar, salvar a foto em `img/` e preencher `foto: 'img/kits.jpg'` na categoria em `js/config.js`. Ideal: fundo claro (branco, off-white ou mármore), luz natural lateral, vertical 3:4.
- [ ] **Logo em vetor (SVG).** A coroa + cabide do site foi redesenhada a partir do perfil. Se existir o arquivo original, substituir em `img/coroa.svg` e no `<svg class="brand__mark">` do `index.html`.
- [ ] **Horário de funcionamento.** Não estava no Instagram, por isso não entrou. Quando tiver, adicionar um card na seção Visite.
- [ ] **Confirmar endereço completo** (Av. Paranoá, Qd 12, conjunto/loja) e se o pin do Google Maps está certo.
- [ ] **Modelos do personalizador.** Os 5 modelos (Mármore, Azul Real, Canarinho, Rubro-negro, Preto Street) são renders gerados por IA, sem marca de terceiros. Trocar ou somar com fotos reais dos mantos que a loja personaliza: foto de frente e de costas, fundo transparente, 1000x1250, em `img/camisas/` e uma linha em `MODELOS` (`js/config.js`).
- [ ] **Black Gold** ficou de fora: a geração insistiu em 3 faixas no ombro (padrão Adidas). Refazer quando houver crédito na API de imagem.
- [ ] **Domínio** e hospedagem.

## Notas técnicas

- Partículas do hero param de renderizar quando a seção sai da tela; a camisa 3D só renderiza quando visível.
- Mobile usa metade das partículas e pixel ratio limitado.
- `prefers-reduced-motion` desliga scroll suave e animações longas.
- Tema claro: off-white quente, mármore e dourado.
- Personalizador sem WebGL: as fotos ficam em canvas, a estampa é desenhada numa camada e aplicada pixel a pixel deslocando pelas dobras e herdando a luz da foto (sombreamento por luminância). O giro é CSS 3D, então funciona em qualquer celular.
- Segurança: sem terceiros (fontes no próprio site), CSP por meta tag, nada lido da URL entra no HTML. Para cabeçalhos HTTP (frame-ancestors, nosniff, HSTS), configurar em Settings > Headers no Render.
- Se o JS ou o WebGL falharem, o loader sai sozinho em 7s e o site abre sem os efeitos.
