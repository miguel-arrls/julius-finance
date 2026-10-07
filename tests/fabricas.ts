import { expect } from 'vitest';
import { ErroDominio, type DespesaAvulsa, type DespesaParcelada, type DespesaRecorrente, type Lancamento, type Mudancas, type MeioPagamento } from '../src/dominio/tipos';

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

/** Aplica Mudancas a uma lista, como o repositório faz (remove, depois grava). */
export function aplicar(atual: Lancamento[], m: Mudancas): Lancamento[] {
  const mapa = new Map(atual.map((l) => [l.id, l]));
  m.remover.forEach((id) => mapa.delete(id));
  m.salvar.forEach((l) => mapa.set(l.id, l));
  return [...mapa.values()].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.id.localeCompare(b.id));
}

/** Garante que fn lança ErroDominio com exatamente esta mensagem. */
export function esperarErroDominio(fn: () => unknown, mensagem: string): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe(mensagem);
    return;
  }
  throw new Error(`Era esperado ErroDominio: ${mensagem}`);
}
