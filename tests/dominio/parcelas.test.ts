import { describe, expect, it } from 'vitest';
import { diferencaParcelas, gerarAvulsa, gerarParcelas, regerarAvulsa, regerarParcelas } from '../../src/dominio/parcelas';
import type { Lancamento } from '../../src/dominio/tipos';
import { aplicar, avulsa, esperarErroDominio, parcelada } from '../fabricas';

const pagar = (l: Lancamento, pagoEm = '2026-11-09'): Lancamento => ({ ...l, pagoEm, valorPago: l.valor });

describe('gerarParcelas', () => {
  it('gera parcelas com IDs fixos, centavos na 1ª e vencimentos mensais', () => {
    expect(gerarParcelas(parcelada()).map((l) => [l.id, l.numero, l.valor, l.vencimento, l.mes])).toEqual([
      ['pa1#1', 1, 33334, '2026-11-10', '2026-11'],
      ['pa1#2', 2, 33333, '2026-12-10', '2026-12'],
      ['pa1#3', 3, 33333, '2027-01-10', '2027-01'],
    ]);
  });

  it('usa o valor da parcela quando informado e calcula a diferença', () => {
    const d = parcelada({ valorParcela: 35000 });
    expect(gerarParcelas(d).map((l) => l.valor)).toEqual([35000, 35000, 35000]);
    expect(diferencaParcelas(d)).toBe(5000);
    expect(diferencaParcelas(parcelada())).toBe(0);
  });

  it('compra em andamento: gera só a partir da parcela informada, sem inventar vencimento', () => {
    const d = parcelada({
      numParcelas: 12,
      comecaNaParcela: 11,
      valorParcela: 45000,
      valorTotal: 540000,
      primeiroVencimento: undefined,
      mesPrimeira: '2026-10',
    });
    expect(gerarParcelas(d).map((l) => [l.id, l.mes, l.vencimento, l.valor])).toEqual([
      ['pa1#11', '2026-10', undefined, 45000],
      ['pa1#12', '2026-11', undefined, 45000],
    ]);
  });

  it('vencimento no dia 31 acompanha o fim de cada mês', () => {
    expect(gerarParcelas(parcelada({ primeiroVencimento: '2026-01-31' })).map((l) => l.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('começa na parcela 2: centavos ficam na parcela 1 não gerada', () => {
    expect(gerarParcelas(parcelada({ comecaNaParcela: 2 })).map((l) => [l.id, l.valor])).toEqual([
      ['pa1#2', 33333],
      ['pa1#3', 33333],
    ]);
  });

  it.each([
    [{ numParcelas: 0 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ numParcelas: 2.5 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ numParcelas: 121 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ comecaNaParcela: 4 }, 'A parcela inicial deve estar entre 1 e 3.'],
    [{ valorTotal: 0 }, 'Informe um valor maior que zero.'],
  ])('rejeita %o', (o, mensagem) => {
    esperarErroDominio(() => gerarParcelas(parcelada(o)), mensagem);
  });
});

describe('regerarParcelas', () => {
  it('editar o total recalcula só as parcelas não pagas', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    const m = regerarParcelas(parcelada({ valorTotal: 120000 }), atual);
    expect(m.salvar.map((l) => [l.id, l.valor])).toEqual([
      ['pa1#2', 40000],
      ['pa1#3', 40000],
    ]);
    expect(m.remover).toEqual([]);
    const final = aplicar(atual, m);
    expect(final[0]).toEqual(atual[0]);
    expect(final).toHaveLength(3);
  });

  it('reduzir parcelas remove só as não pagas excedentes', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    const m = regerarParcelas(parcelada({ numParcelas: 2 }), atual);
    expect(m.remover).toEqual(['pa1#3']);
    expect(m.salvar.map((l) => [l.id, l.valor])).toEqual([['pa1#2', 50000]]);
  });

  it('aumentar parcelas cria as novas', () => {
    const atual = gerarParcelas(parcelada());
    const final = aplicar(atual, regerarParcelas(parcelada({ numParcelas: 5 }), atual));
    expect(final.map((l) => l.id)).toEqual(['pa1#1', 'pa1#2', 'pa1#3', 'pa1#4', 'pa1#5']);
  });

  it('bloqueia reduzir abaixo de uma parcela paga', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [...inicial.slice(0, 2), pagar(inicial[2]!)];
    esperarErroDominio(
      () => regerarParcelas(parcelada({ numParcelas: 2 }), atual),
      'Já existe pagamento na parcela 3. O número de parcelas não pode ser menor que 3.',
    );
  });

  it('bloqueia começar depois de uma parcela paga', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    esperarErroDominio(
      () => regerarParcelas(parcelada({ comecaNaParcela: 2 }), atual),
      'A parcela 1 já foi paga. "Começa na parcela" não pode ser maior que 1.',
    );
  });

  it('começar na parcela 2 sem pagas: remove a 1ª e regera as outras', () => {
    const atual = gerarParcelas(parcelada());
    const m = regerarParcelas(parcelada({ comecaNaParcela: 2 }), atual);
    expect(m.remover).toEqual(['pa1#1']);
    expect(m.salvar.map((l) => l.id)).toEqual(['pa1#2', 'pa1#3']);
  });

  it('sem mudança com parcela paga: não lança erro e não remove nada', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [...inicial.slice(0, 2), pagar(inicial[2]!)];
    const m = regerarParcelas(parcelada(), atual);
    expect(m.remover).toEqual([]);
  });

  it('regerar duas vezes não duplica nem muda nada', () => {
    const primeira = aplicar([], regerarParcelas(parcelada(), []));
    const segunda = aplicar(primeira, regerarParcelas(parcelada(), primeira));
    expect(segunda).toEqual(primeira);
    expect(segunda).toHaveLength(3);
  });

  it('ignora lançamentos de outra despesa', () => {
    const outroDespesa = { id: 'outra#1', despesaId: 'outra', mes: '2026-10', valor: 5000, estimado: false };
    const m = regerarParcelas(parcelada(), [outroDespesa]);
    expect(m.remover).not.toContain('outra#1');
    expect(m.salvar.map((l) => l.id)).not.toContain('outra#1');
  });
});

describe('despesa avulsa', () => {
  it('gera um lançamento no mês do vencimento', () => {
    expect(gerarAvulsa(avulsa())).toEqual({
      id: 'av1#1',
      despesaId: 'av1',
      mes: '2026-10',
      vencimento: '2026-10-10',
      valor: 10000,
      estimado: false,
    });
  });

  it('sem vencimento usa o mês informado', () => {
    expect(gerarAvulsa(avulsa({ vencimento: undefined, mes: '2026-12' })).mes).toBe('2026-12');
  });

  it('editar mantém o pagamento', () => {
    const paga = { ...gerarAvulsa(avulsa()), pagoEm: '2026-10-09', valorPago: 10000 };
    const m = regerarAvulsa(avulsa({ valor: 12000 }), [paga]);
    expect(m.salvar).toEqual([{ ...paga, valor: 12000 }]);
    expect(m.remover).toEqual([]);
  });

  it('rejeita valor zero', () => {
    esperarErroDominio(() => gerarAvulsa(avulsa({ valor: 0 })), 'Informe um valor maior que zero.');
  });

  it('ignora lançamentos de outra despesa', () => {
    const outroDespesa = { id: 'outra#1', despesaId: 'outra', mes: '2026-10', valor: 5000, estimado: false };
    const m = regerarAvulsa(avulsa(), [outroDespesa]);
    expect(m.remover).not.toContain('outra#1');
    expect(m.salvar.map((l) => l.id)).not.toContain('outra#1');
  });
});
