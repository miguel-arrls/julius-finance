import { describe, expect, it } from 'vitest';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import {
  backupAtrasado,
  contarAConfirmar,
  detalhar,
  faturasDoMes,
  proximosVencimentos,
  resumoDoMes,
  totaisProximosMeses,
  type Cadastros,
} from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, parcelada, PIX, recorrente } from '../fabricas';

const cad: Cadastros = {
  despesas: [
    avulsa({ id: 'av1', descricao: 'Consulta', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix' }),
    recorrente({ id: 're1', descricao: 'Streaming', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
    recorrente({ id: 're2', descricao: 'Nuvem', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
    parcelada({ id: 'pa1', descricao: 'Celular', categoriaId: 'cat-compras', meioPagamentoId: 'mp-pix', numParcelas: 12 }),
  ],
  categorias: CATEGORIAS_PADRAO,
  marcas: [],
  meios: [CARTAO, PIX],
};

const lancamentos = [
  lanc({ id: 'L1', despesaId: 'av1', mes: '2026-10', vencimento: '2026-10-05', valor: 10000 }),
  lanc({ id: 'L2', despesaId: 're1', mes: '2026-10', vencimento: '2026-10-07', valor: 3990 }),
  lanc({ id: 'L3', despesaId: 're2', mes: '2026-10', vencimento: '2026-10-07', valor: 2000, pagoEm: '2026-10-06', valorPago: 2100 }),
  lanc({ id: 'L4', despesaId: 'pa1', numero: 11, mes: '2026-10', valor: 45000 }),
  lanc({ id: 'L5', despesaId: 're1', mes: '2026-11', vencimento: '2026-11-07', valor: 3990, estimado: true }),
  lanc({ id: 'L6', despesaId: 'pa1', numero: 12, mes: '2026-12', vencimento: '2026-12-10', valor: 45000 }),
  lanc({ id: 'L7', despesaId: 'apagada', mes: '2026-10', valor: 999 }),
];

const itens = detalhar(lancamentos, cad, '2026-10-06');

describe('detalhar', () => {
  it('liga despesa, categoria e meio, e ignora lançamento órfão', () => {
    expect(itens).toHaveLength(6);
    const l1 = itens.find((i) => i.lancamento.id === 'L1')!;
    expect(l1.situacao).toBe('atrasada');
    expect(l1.categoria?.nome).toBe('Saúde');
    expect(l1.meio?.id).toBe('mp-pix');
  });
});

describe('resumoDoMes', () => {
  it('soma total, pago (pelo valor pago), pendente, atrasado e por categoria', () => {
    expect(resumoDoMes(itens, '2026-10')).toEqual({
      total: 61090,
      pago: 2100,
      pendente: 58990,
      atrasado: 10000,
      qtdAtrasadas: 1,
      porCategoria: [
        { categoriaId: 'cat-compras', total: 45000 },
        { categoriaId: 'cat-saude', total: 10000 },
        { categoriaId: 'cat-assinaturas', total: 6090 },
      ],
    });
  });

  it('mês sem lançamentos dá zero', () => {
    expect(resumoDoMes(itens, '2027-05')).toEqual({ total: 0, pago: 0, pendente: 0, atrasado: 0, qtdAtrasadas: 0, porCategoria: [] });
  });
});

describe('proximosVencimentos', () => {
  it('atrasadas primeiro, depois por data; ignora pagas e sem vencimento', () => {
    expect(proximosVencimentos(itens).map((i) => i.lancamento.id)).toEqual(['L1', 'L2', 'L5', 'L6']);
    expect(proximosVencimentos(itens, 2).map((i) => i.lancamento.id)).toEqual(['L1', 'L2']);
  });
});

describe('faturasDoMes', () => {
  it('agrupa lançamentos do cartão pelo vencimento', () => {
    expect(faturasDoMes(itens, '2026-10')).toEqual([
      { meioId: 'mp-cartao', vencimento: '2026-10-07', total: 6090, pago: false, ids: ['L2', 'L3'], idsAbertos: ['L2'] },
    ]);
  });
});

describe('totaisProximosMeses', () => {
  it('soma os 3 meses seguintes e marca estimativas', () => {
    expect(totaisProximosMeses(itens, '2026-10')).toEqual([
      { mes: '2026-11', total: 3990, temEstimado: true },
      { mes: '2026-12', total: 45000, temEstimado: false },
      { mes: '2027-01', total: 0, temEstimado: false },
    ]);
  });
});

describe('contarAConfirmar e backupAtrasado', () => {
  it('conta despesas com pendências', () => {
    expect(contarAConfirmar([avulsa({ aConfirmar: ['vencimento'] }), avulsa()])).toBe(1);
  });

  it('backup atrasado depois de 30 dias ou se nunca feito', () => {
    expect(backupAtrasado(undefined, '2026-10-06')).toBe(true);
    expect(backupAtrasado('2026-09-06T15:00:00.000Z', '2026-10-06')).toBe(false);
    expect(backupAtrasado('2026-09-05T15:00:00.000Z', '2026-10-06')).toBe(true);
  });
});
