import type { DespesaAvulsa, DespesaParcelada, DespesaRecorrente, Lancamento, MeioPagamento } from '../src/dominio/tipos';

const BASE = {
  descricao: 'Despesa teste',
  categoriaId: 'cat-outros',
  observacoes: '',
  aConfirmar: [],
  criadaEm: '2026-10-01T12:00:00.000Z',
  atualizadaEm: '2026-10-01T12:00:00.000Z',
};

export function avulsa(o: Partial<DespesaAvulsa> = {}): DespesaAvulsa {
  return { id: 'av1', tipo: 'avulsa', ...BASE, valor: 10000, vencimento: '2026-10-10', mes: '2026-10', ...o };
}

export function parcelada(o: Partial<DespesaParcelada> = {}): DespesaParcelada {
  return {
    id: 'pa1',
    tipo: 'parcelada',
    ...BASE,
    valorTotal: 100000,
    numParcelas: 3,
    primeiroVencimento: '2026-11-10',
    mesPrimeira: '2026-11',
    comecaNaParcela: 1,
    ...o,
  };
}

export function recorrente(o: Partial<DespesaRecorrente> = {}): DespesaRecorrente {
  return {
    id: 're1',
    tipo: 'recorrente',
    ...BASE,
    valor: 3990,
    valorVariavel: false,
    frequencia: 'mensal',
    inicio: '2026-10-08',
    pausas: [],
    ...o,
  };
}

export const CARTAO: MeioPagamento = { id: 'mp-cartao', nome: 'Cartão Teste', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 };
export const PIX: MeioPagamento = { id: 'mp-pix', nome: 'Pix', tipo: 'pix' };

export function lanc(o: Partial<Lancamento> & { id: string; despesaId: string }): Lancamento {
  return { mes: '2026-10', valor: 1000, estimado: false, ...o };
}
