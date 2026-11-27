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

// Modelos do personalizador 3D
export const MODELOS = [
  { id: 'fonte', nome: 'Edição Fonte', base: '#0d0c0a', alt: '#17140f', trim: '#d4a440', num: '#e8c46a', numStroke: '#5a3e12', padrao: 'diagonal' },
  { id: 'canarinho', nome: 'Canarinho', base: '#f6cf1d', alt: '#ecc312', trim: '#0f8a43', num: '#0b5a2e', numStroke: '#f6cf1d', padrao: 'faixas-sutis' },
  { id: 'azulao', nome: 'Azulão', base: '#1c3d9e', alt: '#17348a', trim: '#f6cf1d', num: '#ffffff', numStroke: '#0f2466', padrao: 'gradiente' },
  { id: 'rubronegro', nome: 'Rubro-negro', base: '#c8102e', alt: '#111111', trim: '#111111', num: '#ffffff', numStroke: '#111111', padrao: 'listras' },
  { id: 'realeza', nome: 'Branco Real', base: '#f4f1ea', alt: '#e9e4d8', trim: '#c79a3c', num: '#c79a3c', numStroke: '#1b1b1b', padrao: 'gradiente' },
  { id: 'esmeralda', nome: 'Esmeralda', base: '#0f4f52', alt: '#0b3e40', trim: '#ffffff', num: '#ffffff', numStroke: '#0b2c2d', padrao: 'geometrico' },
];

// Categorias do scroll horizontal. Para usar foto real, preencha "foto" com o caminho (ex: 'img/kits.jpg').
export const CATEGORIAS = [
  { id: 'kits', tag: 'Mais pedido', titulo: 'Kits', texto: 'Camisa e short combinando. O uniforme do fim de semana.', icone: 'kit', foto: '', cor: '#16130d' },
  { id: 'mantos', tag: 'Com seu nome', titulo: 'Mantos', texto: 'Seleção, clubes e temporada nova. Nome e número do jeito que você quiser.', icone: 'manto', foto: '', cor: '#0f1310' },
  { id: 'tenis', tag: 'No pé', titulo: 'Tênis', texto: 'Os pares que tão no pé de todo mundo. E os que ainda vão estar.', icone: 'tenis', foto: '', cor: '#131012' },
  { id: 'moletons', tag: 'Noite fria', titulo: 'Moletons', texto: 'Pra noite de Brasília, que esfria sem avisar.', icone: 'moletom', foto: '', cor: '#101114' },
  { id: 'fe', tag: 'Fé', titulo: 'Frases', texto: 'Camisas com a Palavra estampada. Fé que se veste.', icone: 'frase', foto: '', cor: '#14110a' },
  { id: 'infantil', tag: 'Pai e filho', titulo: 'Infantil', texto: 'O kit do seu filho igualzinho ao seu.', icone: 'infantil', foto: '', cor: '#0f1212' },
];
