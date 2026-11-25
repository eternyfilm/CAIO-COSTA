# Site Moldes e Art

Site imersivo da Moldes e Art (@moldes.art), cliente da UPS Digital. Ateliê de Brasília que faz moldes de silicone para velas, sabonetes, resina, gesso e concreto, com envio para todo o Brasil.

Este projeto nasceu num PC local (pasta `OneDrive\Desktop\MOLDES E ART\site`) e foi trazido pra cá em 25/11/2026 a partir da prévia publicada em https://claude.ai/artifact/2dAkRoH3Rdf1mBzUFYXbE2. A partir de agora a versão oficial é esta, no GitHub.

## Estrutura

- `index.html`: a página inteira (7 seções: abertura, processo, materiais, catálogo, sob medida, envio, final).
- `css/site.css`: visual. Cores em variáveis no `:root`; se o logo e a paleta mudarem, troca ali.
- `js/cena3d.js`: cena 3D (Three.js 0.160 via CDN jsdelivr, sem build).
- `js/site.js`: catálogo, lightbox, WhatsApp, formulário sob medida.
- `assets/catalogo/<categoria>/`: fotos grandes (abrem no lightbox, no máximo 1600 px).
- `assets/catalogo/mini/<categoria>/`: miniaturas dos cards (560 px).
- `assets/catalogo/catalogo.json`: lista das fotos por categoria. Só entram as com `propria != false` (as "Digitalizado" do Drive são prints de outras lojas e ficam fora).

## Rodar no computador

Qualquer servidor estático na pasta, por exemplo `python -m http.server 5173`, e abrir http://localhost:5173. Abrir o `index.html` direto com duplo clique não funciona (o navegador bloqueia o carregamento do catálogo).

## Desempenho (o que foi ajustado em 25/11/2026)

O site travava ao rolar e pesava em PC fraco. Causas e correções, todas no `js/cena3d.js`:

1. **Recompilação de shader no meio da rolagem.** Cada seção escondia o próprio grupo 3D (com as luzes das velas dentro) ao sair da tela. Mudar o número de luzes faz o Three.js recompilar todos os materiais, e isso congelava a tela. Agora o grupo fora de tela vai pra longe da câmera e as luzes continuam contadas.
2. **Troca de material recompilava o shader** (transmission/iridescence/bumpMap passando de 0 pra mais que 0). Agora ficam sempre ligados com valor mínimo.
3. **Pré-compilação mirava a variante errada** (direto na tela, em vez da textura do bloom). Corrigido, e um frame de aquecimento roda atrás do loader.
4. **O 3D desenhava 60 vezes por segundo mesmo sem nada 3D na tela** (catálogo, formulário). Agora só redesenha quando a página rola.
5. **Qualidade adaptativa:** se o aparelho não segura cerca de 40 fps, desce sozinho: resolução 1x e sem desfoque de vidro, depois sem bloom, depois resolução 0.75x.
6. **Fotos:** os cards carregavam a foto original (até 600 KB, 2200 px) num quadradinho de 220 px. Agora usam miniatura.
7. **Loader preso:** se o CDN do 3D falhasse, o site ficava no loader pra sempre. O `site.js` tira o loader em 8 s de qualquer jeito.

Medido no mesmo roteiro de rolagem: 16 recompilações de shader antes, 0 agora; o 3D desenhando com o catálogo parado: 180 chamadas em 2 s antes, 0 agora.

## Pendências com o cliente

- Confirmar o WhatsApp de vendas (`WHATSAPP` no topo do `js/site.js`, hoje 5561994538021).
- Fotos melhores: Sabonete (3), Mães (1) e Caveira (2) estão quase vazias; Folhas ficou fora por não ter foto própria. A primeira foto de Flores ainda mostra o logo antigo "Moldes & Artes".
- Nome e medida de cada molde (hoje os cards mostram "Molde flores / rosas" com um código).
- Preços, se ele quiser mostrar.
- Identidade visual: o site segue o logo atual (neon/cromado), que a própria análise mandou descartar. Quando a marca nova sair, troca as variáveis do `css/site.css` e os arquivos `assets/logo*.png`.
