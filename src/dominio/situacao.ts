import type { DataISO, Lancamento, Situacao } from './tipos';

/** Situação calculada; nunca é gravada. */
export function situacao(l: Lancamento, hoje: DataISO): Situacao {
  if (l.pagoEm) return 'paga';
  if (!l.vencimento) return 'sem-vencimento';
  return l.vencimento < hoje ? 'atrasada' : 'pendente';
}
