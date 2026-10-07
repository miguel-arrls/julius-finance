import { describe, expect, it } from 'vitest';
import { descreverMudanca, resumoDespesa } from '../../src/ui/textos';
import { resolverCadastros } from '../../src/ui/telas/DetalheDespesa';
import { avulsa, lanc, parcelada, recorrente } from '../fabricas';

describe('descreverMudanca', () => {
  it.each([
    [{ campo: 'valorTotal', de: 100000, para: 120000 }, 'valor total: R$ 1.000,00 → R$ 1.200,00'],
    [{ campo: 'vencimento', de: null, para: '2026-11-07' }, 'vencimento: vazio → 07/11/2026'],
    [{ campo: 'mesPrimeira', de: '2026-10', para: '2026-11' }, 'mês da 1ª parcela: outubro de 2026 → novembro de 2026'],
    [{ campo: 'aConfirmar', de: ['vencimento', 'loja'], para: [] }, 'a confirmar: vencimento, loja ou marca → nenhum'],
    [{ campo: 'valorVariavel', de: false, para: true }, 'valor variável: não → sim'],
    [{ campo: 'frequencia', de: 'mensal', para: 'anual' }, 'frequência: mensal → anual'],
    [{ campo: 'descricao', de: 'A', para: 'B' }, 'descrição: A → B'],
  ])('%o', (m, esperado) => {
    expect(descreverMudanca(m)).toBe(esperado);
  });

  it('usa o resolvedor para nomes de cadastros', () => {
    const nomes: Record<string, string> = { a: 'Saúde', b: 'Outros' };
    expect(descreverMudanca({ campo: 'categoriaId', de: 'a', para: 'b' }, (_c, v) => nomes[v as string])).toBe('categoria: Saúde → Outros');
  });

  it('cadastro excluído (para: null) mostra vazio', () => {
    expect(descreverMudanca({ campo: 'marcaId', de: 'a', para: null }, (_c, v) => (v === 'a' ? 'Netflix' : undefined))).toBe('marca: Netflix → vazio');
  });
});

describe('descreverMudanca: pausas e campos de texto', () => {
  it('pausas', () => {
    expect(descreverMudanca({ campo: 'pausas', de: [], para: [{ de: '2026-10-06' }] })).toBe('pausas: nenhuma → pausada desde 06/10/2026');
    expect(
      descreverMudanca({ campo: 'pausas', de: [{ de: '2026-10-06' }], para: [{ de: '2026-10-06', ate: '2026-12-01' }, { de: '2027-01-05' }] }),
    ).toBe('pausas: pausada desde 06/10/2026 → pausada de 06/10/2026 a 01/12/2026; pausada desde 05/01/2027');
  });
  it('texto que parece data ou mês continua texto', () => {
    expect(descreverMudanca({ campo: 'descricao', de: '2026-10', para: '2026-10-07' })).toBe('descrição: 2026-10 → 2026-10-07');
    expect(descreverMudanca({ campo: 'observacoes', de: '2026-10', para: 'x' })).toBe('observações: 2026-10 → x');
  });
});

describe('resolverCadastros', () => {
  const estado = { categorias: [{ id: 'c1', nome: 'Saúde' }], marcas: [], meios: [] } as never;
  it('id inexistente vira "cadastro removido"; existente vira o nome', () => {
    const r = resolverCadastros(estado);
    expect(r('categoriaId', 'c1')).toBe('Saúde');
    expect(r('categoriaId', 'sumiu')).toBe('cadastro removido');
    expect(r('marcaId', 'sumiu')).toBe('cadastro removido');
    expect(r('categoriaId', null)).toBeUndefined();
    expect(r('descricao', 'abc')).toBeUndefined();
  });
});

describe('resumoDespesa', () => {
  it('recorrente', () => {
    expect(resumoDespesa(recorrente({ valorVariavel: true }), [])).toBe('Mensal · R$ 39,90 (varia)');
  });
  it('parcelada em andamento', () => {
    const d = parcelada({ numParcelas: 12, comecaNaParcela: 11, valorParcela: 45000 });
    const ls = [lanc({ id: 'pa1#11', despesaId: 'pa1', numero: 11, valor: 45000, pagoEm: '2026-10-06' }), lanc({ id: 'pa1#12', despesaId: 'pa1', numero: 12, valor: 45000 })];
    expect(resumoDespesa(d, ls)).toBe('Parcelas 11 a 12 de R$ 450,00 · 1 paga');
  });
  it('parcelada desde o início', () => {
    expect(resumoDespesa(parcelada(), [])).toBe('3 parcelas de R$ 333,34 · 0 pagas');
  });
  it('avulsa', () => {
    expect(resumoDespesa(avulsa(), [])).toBe('R$ 100,00 · vence 10/10/2026');
    expect(resumoDespesa(avulsa({ vencimento: undefined }), [])).toBe('R$ 100,00 · vencimento a confirmar');
  });
});
