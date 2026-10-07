import { describe, expect, it } from 'vitest';
import { filtrar, normalizar } from '../../src/dominio/filtros';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import { detalhar } from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, PIX, recorrente } from '../fabricas';

const itens = detalhar(
  [
    lanc({ id: 'lr2', despesaId: 'r', mes: '2026-11', vencimento: '2026-11-20' }),
    lanc({ id: 'la', despesaId: 'a', mes: '2026-10', vencimento: '2026-10-05' }),
    lanc({ id: 'lr1', despesaId: 'r', mes: '2026-10', vencimento: '2026-10-20' }),
    lanc({ id: 'ls', despesaId: 'r', mes: '2026-10' }),
  ],
  {
    despesas: [
      avulsa({ id: 'a', descricao: 'Açaí da esquina', marcaId: 'm1', categoriaId: 'cat-alimentacao', meioPagamentoId: 'mp-pix' }),
      recorrente({ id: 'r', descricao: 'Academia', categoriaId: 'cat-saude', meioPagamentoId: 'mp-cartao' }),
    ],
    categorias: CATEGORIAS_PADRAO,
    marcas: [{ id: 'm1', nome: 'Sorveteria Polo', apelidos: ['Polo Norte'] }],
    meios: [CARTAO, PIX],
  },
  '2026-10-06',
);

const ids = (f: Parameters<typeof filtrar>[1]) => filtrar(itens, f).map((i) => i.lancamento.id);

describe('normalizar', () => {
  it('tira acentos, caixa e espaços das pontas', () => {
    expect(normalizar('  Saúde ÁÇÃO ')).toBe('saude acao');
  });
});

describe('filtrar', () => {
  it('busca sem acento pela descrição, marca e apelido', () => {
    expect(ids({ texto: 'acai' })).toEqual(['la']);
    expect(ids({ texto: 'polo norte' })).toEqual(['la']);
    expect(ids({ texto: 'sorveteria' })).toEqual(['la']);
    expect(ids({ texto: 'ACADEMIA' })).toEqual(['lr1', 'ls', 'lr2']);
  });

  it('filtra por mês, categoria, situação, tipo e meio', () => {
    expect(ids({ mes: '2026-11' })).toEqual(['lr2']);
    expect(ids({ categoriaId: 'cat-saude' })).toEqual(['lr1', 'ls', 'lr2']);
    expect(ids({ situacao: 'atrasada' })).toEqual(['la']);
    expect(ids({ tipo: 'recorrente' })).toEqual(['lr1', 'ls', 'lr2']);
    expect(ids({ meioPagamentoId: 'mp-pix' })).toEqual(['la']);
    expect(ids({ texto: 'academia', mes: '2026-10' })).toEqual(['lr1', 'ls']);
  });

  it('sem filtros devolve tudo ordenado por mês e vencimento', () => {
    expect(ids({})).toEqual(['la', 'lr1', 'ls', 'lr2']);
  });
});
