import { dataNoMes, mesDe, somarMesesAoMes } from './datas';
import type { DataISO } from './tipos';

/**
 * Vencimento da fatura em que cai uma cobrança.
 * Cobrança antes do fechamento do mês → fatura que fecha neste mês.
 * Cobrança no dia do fechamento ou depois → fatura que fecha no mês seguinte.
 * O vencimento é o primeiro dia `diaVencimento` depois do fechamento.
 */
export function vencimentoNoCartao(dataCobranca: DataISO, diaFechamento: number, diaVencimento: number): DataISO {
  const mesCobranca = mesDe(dataCobranca);
  let fechamento = dataNoMes(mesCobranca, diaFechamento);
  if (dataCobranca >= fechamento) {
    fechamento = dataNoMes(somarMesesAoMes(mesCobranca, 1), diaFechamento);
  }
  const mesFechamento = mesDe(fechamento);
  let vencimento = dataNoMes(mesFechamento, diaVencimento);
  if (vencimento <= fechamento) {
    vencimento = dataNoMes(somarMesesAoMes(mesFechamento, 1), diaVencimento);
  }
  return vencimento;
}
