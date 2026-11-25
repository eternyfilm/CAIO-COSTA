# Bancada de avaliação do site (25/11/2026)

24 avaliadores simulados, em 6 grupos independentes que não viram a opinião uns dos outros:
4 web designers, 3 designers, 2 motion designers, 4 analistas, 3 críticos e 8 possíveis clientes (2 mais velhos).
Mais uma triagem das 287 fotos do catálogo, uma a uma.

## O veredito em uma frase

O site resolve o "uau" e falha no "comprar". O catálogo, que é o que vende, era a parte mais fraca. O 3D vinha antes do produto, e o produto vinha sem nome, medida, preço ou prova de que é do ateliê.

## O que os 6 grupos disseram sem combinar

1. **O botão "Pedir este molde" estava quebrado** (letra azul de 12 px sobre verde). Todos os grupos acharam esse problema. **Corrigido.**
2. **Os moldes não têm nome nem medida.** São 96 cards chamados "Molde flores / rosas", e a busca não acha "santo", "casamento" nem "lembrancinha". **A busca foi corrigida com sinônimos.** Nome e medida dependem do cliente (planilha).
3. **O código do molde mudava** quando uma foto entrava ou saía. **Corrigido:** o código agora está gravado no `catalogo.json`.
4. **As fotos contradizem o discurso.** O site diz "feito em Brasília, fale com quem faz", mas há fotos com medidas em polegadas, "Mold weight: 94g", marca d'água de outra loja e print da Shopee. Também há três grafias da marca ("Moldes & Artes" está no primeiro card). **Os prints, as duplicadas e as fotos ruins saíram (35 no total).** As fotos de fornecedor dependem do cliente.
5. **No celular não havia navegação nem o nome da loja,** e o "Envio para todo o Brasil" estava escondido. **Corrigido.**
6. **Faltam preço (ao menos "a partir de"), prazo, pagamento, CNPJ e prova social.** Depende do cliente.
7. **O botão flutuante cobria conteúdo.** **Corrigido:** ele some quando há outro botão de WhatsApp na tela.

## Já aplicado nesta rodada

- **Lightbox:**
  - botão "Pedir pelo WhatsApp" grande e legível;
  - contador "3 de 252";
  - no celular, deslizar o dedo passa a foto;
  - foco preso no lightbox e devolvido ao card ao fechar.
- **Código fixo por molde** no JSON.
- **Busca com sinônimos:** santo, Nossa Senhora, casamento, lembrancinha, bebê, flor, letra e outros.
- **Celular:**
  - nome da loja e atalho "Catálogo" no topo;
  - eyebrow com "Brasília · envio para todo o Brasil" visível;
  - "Toque na chama" junto da vela;
  - campos com 16 px, para o iPhone não dar zoom.
- **Formulário sob medida:**
  - "Quantos moldes" separado de "Quantas peças vai fazer" (a noiva ia pedir 120 moldes);
  - campo "Para quando precisa";
  - lembrete de mandar a foto ou o logo.
- **Número do WhatsApp escrito no rodapé.** Serve pra quem está no computador sem WhatsApp Web e pros clientes mais velhos.
- **Meta tags de prévia do link** (og:title, og:description, og:image). O `og:image` precisa do endereço completo quando o site tiver domínio.
- **Versão sem 3D** para iPhone antigo (sem import map), WebGL indisponível ou CDN fora. Antes ficavam 3 telas pretas presas.
- **Movimento:**
  - a vela revelada não gira mais feito pião;
  - o jato de cera cai de cima em vez de subir, e brilha menos;
  - a luz muda de cor gradualmente;
  - a rolagem do processo tem amortecimento (sensação de peso);
  - a peça de materiais acompanha o dedo e para quando o dedo para;
  - a física não muda mais com a taxa de atualização da tela;
  - "reduzir movimento" é respeitado por completo.
- **Acessibilidade:** chips como botões (não abas falsas), código do card com placa de fundo legível, cards ativáveis por teclado.
- **Triagem gravada em cada foto** do `catalogo.json` (campo `triagem`). Prints, duplicadas e fotos ruins marcados com `oculto`.

## Decisões que são do Caio (com a minha recomendação)

| Decisão | Opções que apareceram | Recomendação |
|---|---|---|
| **Direção visual** | Manter o azul neon e cromado (herança do logo de IA) ou ir para "ateliê de cera" (grafite quente, âmbar da chama, azul silicone sem glow) | Híbrido: palco escuro e quente no hero e no processo, catálogo e sob medida como "página clara". Decidir junto com o logo novo, porque metade da linguagem atual vem do logo que a análise mandou descartar. |
| **Ordem das seções** | Hoje são 5 a 6 telas até o primeiro molde no celular | Hero, catálogo, sob medida, processo (encurtado), confiança/envio. O processo explica para a iniciante, mas não pode ser pedágio. |
| **O 3D** | Grupo 1: cortar. Grupo 2: refazer com matéria real. | Manter a vela do hero e o processo, que são o que a iniciante e a noiva elogiaram. Trocar as primitivas genéricas (toro, nó, cápsulas) por moldes reais e mostrar a cavidade negativa quando o molde abre: é o "momento" do site. Materiais: concreto fosco de verdade ou fotos reais. |
| **Fotos do catálogo** | Fundo escuro ou claro | **Claro e quente**, no padrão dos posts do Instagram, com o produto real recortado. Placar da bancada: 6 a 1 pelo claro. |
| **Preço** | Esconder, faixa "a partir de" ou preço cheio | Faixa "a partir de" por categoria e prazo médio. Quem quer o preço exato pergunta, mas chega menos desconfiado. |

## O que precisa do cliente (dono da Moldes e Art)

1. **Confirmar o WhatsApp de vendas**, (61) 99453-8021. Se estiver errado, o site converte zero.
2. **Preencher a `planilha-moldes.csv`** (abre no Excel ou Google Planilhas):
   - "é foto de vocês?" nas linhas marcadas "CONFIRMAR origem";
   - nome do molde;
   - medidas;
   - cavidades;
   - "serve para";
   - preço "a partir de".
3. **Dizer se revende molde importado.** Se revende, a copy muda para "fabricamos e selecionamos". Se não revende, as fotos de fornecedor saem.
4. **Prazo de produção, prazo de envio por região, formas de pagamento e CNPJ.**
5. **3 a 6 fotos de peças feitas por clientes** e 3 depoimentos reais.
6. **Exemplos de molde sob medida já feitos** (logo de cliente → molde → peça). A dona de marca de sabonete pediu isso primeiro.
7. **Fotos novas** para as categorias zeradas: alfabetos, frutas e legumes, mães, massageadores e sabonete. As 5 não têm nenhuma foto própria aproveitável.
8. **Confirmar se @moldeartebsb é a conta do ateliê.** Pode ser fonte de fotos melhores.
9. **Logo horizontal em PNG com fundo transparente** (o dos posts), para os cards padronizados.

## Números da triagem das fotos

- **Por classe:**
  - 151 próprias;
  - 101 com cara de fornecedor ou IA (41 delas com dúvida: podem ser recortes ou artes do próprio ateliê);
  - 15 duplicadas;
  - 14 prints de tela;
  - 6 ruins.
- **Aproveitáveis para o padrão novo:** 120 próprias, das quais 91 dá para recortar automaticamente.
- **Mais fortes para destaque:**
  - `velas/1Wm_VKdX…` (velas entalhadas)
  - `natal/1X2xW_GM…` (árvore com glitter)
  - `buda/14u1tAUj…` (buda azul na mandala)
  - `caveira/13IJSDYq…`
  - `flores-rosas/1HLJ03I6…` (bico-de-papagaio)
