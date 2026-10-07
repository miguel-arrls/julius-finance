import { formatarDataCurta } from '../../dominio/datas';
import type { DataISO, Situacao } from '../../dominio/tipos';

export function textoSituacao(s: Situacao, vencimento?: DataISO): string {
  if (s === 'paga') return 'Paga';
  if (s === 'sem-vencimento' || !vencimento) return 'Vencimento a confirmar';
  if (s === 'atrasada') return `Atrasada · ${formatarDataCurta(vencimento)}`;
  return `Vence ${formatarDataCurta(vencimento)}`;
}

export function PilulaSituacao({ situacao, vencimento, estimado = false }: { situacao: Situacao; vencimento?: DataISO; estimado?: boolean }) {
  return (
    <span class={`pilula pilula-${situacao}`}>
      {textoSituacao(situacao, vencimento)}
      {estimado && situacao !== 'paga' ? ' · estimado' : ''}
    </span>
  );
}
