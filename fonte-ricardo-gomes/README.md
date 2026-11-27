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
| Monte seu manto | Camisa 3D: arrasta pra girar, digita nome e número, troca o modelo. Botão manda tudo pro WhatsApp já preenchido | `js/manto.js` |
| A loja | Scroll horizontal com as categorias, cards com tilt 3D | `js/main.js` + `CATEGORIAS` em `js/config.js` |
| Fé | Versículos e frases correndo em direções opostas | `index.html` |
| Visite | Endereço, WhatsApp, Instagram | `index.html` |

Dados da loja (WhatsApp, endereço, link do mapa, modelos de camisa e categorias) ficam todos em `js/config.js`.

## Pendências com o cliente

- [ ] **Fotos reais dos produtos.** Hoje os cards da loja usam ilustração em linha dourada. Pra trocar, salvar a foto em `img/` e preencher `foto: 'img/kits.jpg'` na categoria em `js/config.js`. Ideal: fundo escuro ou foto de estúdio, vertical 3:4.
- [ ] **Logo em vetor (SVG).** A coroa + cabide do site foi redesenhada a partir do perfil. Se existir o arquivo original, substituir em `img/coroa.svg` e no `<svg class="brand__mark">` do `index.html`.
- [ ] **Horário de funcionamento.** Não estava no Instagram, por isso não entrou. Quando tiver, adicionar um card na seção Visite.
- [ ] **Confirmar endereço completo** (Av. Paranoá, Qd 12, conjunto/loja) e se o pin do Google Maps está certo.
- [ ] **Modelos do personalizador.** Os 6 modelos são genéricos (Edição Fonte, Canarinho, Azulão, Rubro-negro, Branco Real, Esmeralda). Ajustar pros que a loja realmente personaliza.
- [ ] **Domínio** e hospedagem.

## Notas técnicas

- Partículas do hero param de renderizar quando a seção sai da tela; a camisa 3D só renderiza quando visível.
- Mobile usa metade das partículas e pixel ratio limitado.
- `prefers-reduced-motion` desliga scroll suave e animações longas.
- A camisa é gerada sem modelo 3D externo: silhueta desenhada em canvas, "inflada" a partir de um blur da máscara, frente e costas presas pela borda. Nome e número são desenhados na textura em tempo real.
