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
  { id: 'marmore', nome: 'Mármore', base: '#f7f4ee', alt: '#ece7de', trim: '#c69a3e', rib: '#f3efe7', num: '#c69a3e', numStroke: '#4a3814', sponsor: '#9c9488', vein: '#7a7266', veinGold: '#c39b4e', veinSoft: 'rgba(140,130,115,0.12)', padrao: 'marmore', swatch: 'linear-gradient(135deg, #f7f4ee 0 55%, #c69a3e 55% 100%)' },
  { id: 'canarinho', nome: 'Canarinho', base: '#f6cf1d', alt: '#ecc312', trim: '#0f8a43', rib: '#0f8a43', num: '#0b5a2e', numStroke: '#f6cf1d', sponsor: '#0b5a2e', padrao: 'faixas-sutis' },
  { id: 'azulao', nome: 'Azulão', base: '#1f43a8', alt: '#173584', trim: '#f6cf1d', rib: '#f6cf1d', num: '#ffffff', numStroke: '#0f2466', sponsor: '#ffffff', padrao: 'gradiente' },
  { id: 'rubronegro', nome: 'Rubro-negro', base: '#c8102e', alt: '#151515', trim: '#151515', rib: '#151515', num: '#ffffff', numStroke: '#151515', sponsor: '#ffffff', padrao: 'listras' },
  { id: 'esmeralda', nome: 'Esmeralda', base: '#0f5a5c', alt: '#0c4a4c', trim: '#ffffff', rib: '#ffffff', num: '#ffffff', numStroke: '#0b2c2d', sponsor: '#ffffff', padrao: 'geometrico' },
  { id: 'fonte', nome: 'Black Gold', base: '#151412', alt: '#1e1c18', trim: '#d4a440', rib: '#d4a440', num: '#e3bf68', numStroke: '#4a3410', sponsor: '#d4a440', padrao: 'diagonal' },
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
