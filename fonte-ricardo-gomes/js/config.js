// Dados da loja. Troque aqui e o site inteiro atualiza.
export const LOJA = {
  whatsapp: '5561983205214',
  telefone: '(61) 98320-5214',
  instagram: 'fontericardogomes',
  endereco: 'Av. Paranoá, Qd 12, Paranoá, DF',
  mapa: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Fonte Ricardo Gomes, Av. Paranoá Qd 12, Paranoá, Brasília DF'),
};

export function waLink(msg) {
  return `https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(msg)}`;
}

// Modelos do personalizador: fotos em img/camisas (frente e costas, fundo transparente).
// gold: estampa em dourado metálico; num: cor da estampa; stroke: contorno; crest: textos pequenos.
const CAM = (id) => ({ front: `img/camisas/${id}-front.webp`, back: `img/camisas/${id}-back.webp` });
export const MODELOS = [
  { id: 'marmore', nome: 'Mármore', ...CAM('marmore'), gold: true, stroke: '#5a4114', crest: '#a07a2c', sponsor: '#9b8a66', swatch: 'linear-gradient(135deg, #f7f4ee 0 55%, #c9a24f 55% 100%)' },
  { id: 'azulreal', nome: 'Azul Real', ...CAM('azulreal'), num: '#efe3c4', crest: '#efe3c4', sponsor: '#efe3c4', swatch: 'linear-gradient(135deg, #1f2f73 0 55%, #efe3c4 55% 100%)' },
  { id: 'canarinho', nome: 'Canarinho', ...CAM('canarinho'), num: '#0d7a3c', crest: '#0d7a3c', sponsor: '#0d7a3c', swatch: 'linear-gradient(135deg, #f7d117 0 55%, #11883f 55% 100%)' },
  { id: 'rubronegro', nome: 'Rubro-negro', ...CAM('rubronegro'), num: '#ffffff', stroke: '#141414', crest: '#ffffff', sponsor: '#ffffff', swatch: 'repeating-linear-gradient(180deg, #d01b25 0 9px, #141414 9px 18px)' },
  { id: 'street', nome: 'Preto Street', ...CAM('street'), num: '#f2f2f2', crest: '#f2f2f2', sponsor: '#f2f2f2', swatch: 'linear-gradient(135deg, #1b1b1b 0 55%, #f2f2f2 55% 100%)' },
];

// Categorias do scroll horizontal. Para usar foto real, preencha "foto" com o caminho (ex: 'img/kits.jpg').
export const CATEGORIAS = [
  { id: 'kits', tag: 'Mais pedido', titulo: 'Kits', texto: 'Camisa e short combinando. O uniforme do fim de semana.', icone: 'kit', foto: '', cor: '#f1e9da' },
  { id: 'mantos', tag: 'Com seu nome', titulo: 'Mantos', texto: 'Seleção, clubes e temporada nova. Nome e número do jeito que você quiser.', icone: 'manto', foto: '', cor: '#ebe8df' },
  { id: 'tenis', tag: 'No pé', titulo: 'Tênis', texto: 'Os pares que tão no pé de todo mundo. E os que ainda vão estar.', icone: 'tenis', foto: '', cor: '#efe6e0' },
  { id: 'moletons', tag: 'Noite fria', titulo: 'Moletons', texto: 'Pra noite de Brasília, que esfria sem avisar.', icone: 'moletom', foto: '', cor: '#e6e7e6' },
  { id: 'fe', tag: 'Fé', titulo: 'Frases', texto: 'Camisas com a Palavra estampada. Fé que se veste.', icone: 'frase', foto: '', cor: '#f3e8d2' },
  { id: 'infantil', tag: 'Pai e filho', titulo: 'Infantil', texto: 'O kit do seu filho igualzinho ao seu.', icone: 'infantil', foto: '', cor: '#e8ebe6' },
];
