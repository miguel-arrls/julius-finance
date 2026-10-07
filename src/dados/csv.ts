import { formatarData, formatarMesCsv } from '../dominio/datas';
import { valorEfetivo, type ItemLista } from '../dominio/resumo';
import type { Centavos, Situacao, TipoDespesa } from '../dominio/tipos';

const BOM = '﻿';
const COLUNAS = [
  'Descrição', 'Loja/marca', 'Categoria', 'Tipo', 'Parcela', 'Mês', 'Vencimento',
  'Valor', 'Situação', 'Pago em', 'Meio de pagamento', 'Observações',
];
const TIPO: Record<TipoDespesa, string> = { avulsa: 'Avulsa', parcelada: 'Parcelada', recorrente: 'Recorrente' };
const SITUACAO: Record<Situacao, string> = {
  paga: 'Paga',
  pendente: 'Pendente',
  atrasada: 'Atrasada',
  'sem-vencimento': 'Sem vencimento',
};

function campo(texto: string): string {
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** '1234,56' — sem separador de milhar, para o Excel em pt-BR ler como número. */
function valorCsv(c: Centavos): string {
  const abs = Math.abs(c);
  return `${c < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function gerarCsv(itens: ItemLista[]): string {
  const linhas = [
    COLUNAS,
    ...itens.map((i) => {
      const l = i.lancamento;
      const d = i.despesa;
      return [
        d.descricao,
        i.marca?.nome ?? '',
        i.categoria?.nome ?? '',
        TIPO[d.tipo],
        d.tipo === 'parcelada' && l.numero ? `${l.numero}/${d.numParcelas}` : '',
        formatarMesCsv(l.mes),
        l.vencimento ? formatarData(l.vencimento) : '',
        valorCsv(valorEfetivo(l)),
        SITUACAO[i.situacao],
        l.pagoEm ? formatarData(l.pagoEm) : '',
        i.meio?.nome ?? '',
        d.observacoes,
      ];
    }),
  ];
  return BOM + linhas.map((linha) => linha.map(campo).join(';')).join('\r\n') + '\r\n';
}
