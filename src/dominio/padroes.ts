import type { Categoria } from './tipos';

/** Categorias iniciais; o usuário pode editar e remover. Ícones = chaves de src/ui/icones.tsx. */
export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: 'cat-moradia', nome: 'Moradia', cor: '#B45309', icone: 'home', ordem: 1 },
  { id: 'cat-alimentacao', nome: 'Alimentação', cor: '#C2410C', icone: 'tools-kitchen-2', ordem: 2 },
  { id: 'cat-transporte', nome: 'Transporte', cor: '#1D4ED8', icone: 'car', ordem: 3 },
  { id: 'cat-saude', nome: 'Saúde', cor: '#047857', icone: 'heartbeat', ordem: 4 },
  { id: 'cat-compras', nome: 'Compras', cor: '#BE185D', icone: 'shopping-bag', ordem: 5 },
  { id: 'cat-lazer', nome: 'Lazer', cor: '#7C3AED', icone: 'confetti', ordem: 6 },
  { id: 'cat-assinaturas', nome: 'Assinaturas', cor: '#4338CA', icone: 'repeat', ordem: 7 },
  { id: 'cat-telefone-internet', nome: 'Telefone/Internet', cor: '#0E7490', icone: 'device-mobile', ordem: 8 },
  { id: 'cat-outros', nome: 'Outros', cor: '#57534E', icone: 'dots', ordem: 9 },
];
