import { ehDataISO, ehMesISO, formatarData, formatarMes } from '../dominio/datas';
import { formatarReais } from '../dominio/dinheiro';
import type { EstadoRecorrencia } from '../dominio/recorrencias';
import type {
  AcaoHistorico,
  CampoAConfirmar,
  Despesa,
  Frequencia,
  Lancamento,
  Mudanca,
  Situacao,
  TipoDespesa,
  TipoMeio,
} from '../dominio/tipos';

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = { mensal: 'Mensal', semanal: 'Semanal', anual: 'Anual' };
export const ROTULO_TIPO: Record<TipoDespesa, string> = { avulsa: 'Avulsa', parcelada: 'Parcelada', recorrente: 'Recorrente' };
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  paga: 'Paga',
  pendente: 'Pendente',
  atrasada: 'Atrasada',
  'sem-vencimento': 'Sem vencimento',
};
export const ROTULO_MEIO: Record<TipoMeio, string> = {
  credito: 'Cartão de crédito',
  debito: 'Débito',
  pix: 'Pix',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};
export const ROTULO_A_CONFIRMAR: Record<CampoAConfirmar, string> = {
  vencimento: 'vencimento',
  loja: 'loja ou marca',
  valor: 'valor',
  valorTotal: 'valor total',
  categoria: 'categoria',
  dataCompra: 'data da compra',
  meioPagamento: 'meio de pagamento',
};
export const ROTULO_ACAO: Record<AcaoHistorico, string> = {
  criada: 'Criada',
  editada: 'Editada',
  paga: 'Paga',
  'pagamento desfeito': 'Pagamento desfeito',
  pausada: 'Pausada',
  retomada: 'Retomada',
  encerrada: 'Encerrada',
  importada: 'Importada',
};

export function plural(n: number, um: string, varios: string): string {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}

export const ROTULO_ESTADO: Record<EstadoRecorrencia, string> = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

const CAMPOS_VALOR = new Set(['valor', 'valorTotal', 'valorParcela', 'valorPago']);

const ROTULO_CAMPO: Record<string, string> = {
  descricao: 'descrição',
  categoriaId: 'categoria',
  marcaId: 'marca',
  meioPagamentoId: 'meio de pagamento',
  dataCompra: 'data da compra',
  observacoes: 'observações',
  aConfirmar: 'a confirmar',
  valor: 'valor',
  vencimento: 'vencimento',
  mes: 'mês',
  valorTotal: 'valor total',
  numParcelas: 'nº de parcelas',
  valorParcela: 'valor da parcela',
  primeiroVencimento: '1º vencimento',
  mesPrimeira: 'mês da 1ª parcela',
  comecaNaParcela: 'começa na parcela',
  valorVariavel: 'valor variável',
  frequencia: 'frequência',
  inicio: 'início',
  fim: 'fim',
  pausas: 'pausas',
  pagoEm: 'pago em',
  valorPago: 'valor pago',
  estimado: 'estimado',
};

export function formatarValorCampo(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'vazio';
  if (CAMPOS_VALOR.has(campo) && typeof valor === 'number') return formatarReais(valor);
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (campo === 'frequencia' && typeof valor === 'string') return ROTULO_FREQUENCIA[valor as Frequencia]?.toLowerCase() ?? valor;
  if (ehDataISO(valor)) return formatarData(valor);
  if (ehMesISO(valor)) return formatarMes(valor);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return 'nenhum';
    return valor
      .map((x) => (typeof x === 'string' ? (ROTULO_A_CONFIRMAR[x as CampoAConfirmar] ?? x) : JSON.stringify(x)))
      .join(', ');
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

export function descreverMudanca(
  m: Mudanca,
  resolver: (campo: string, valor: unknown) => string | undefined = () => undefined,
): string {
  const fmt = (v: unknown) => resolver(m.campo, v) ?? formatarValorCampo(m.campo, v);
  return `${ROTULO_CAMPO[m.campo] ?? m.campo}: ${fmt(m.de)} → ${fmt(m.para)}`;
}

export function resumoDespesa(d: Despesa, lancamentos: Lancamento[]): string {
  if (d.tipo === 'recorrente') {
    return `${ROTULO_FREQUENCIA[d.frequencia]} · ${formatarReais(d.valor)}${d.valorVariavel ? ' (varia)' : ''}`;
  }
  if (d.tipo === 'parcelada') {
    const pagas = lancamentos.filter((l) => l.pagoEm).length;
    const valor = d.valorParcela ?? (d.valorTotal - Math.floor(d.valorTotal / d.numParcelas) * (d.numParcelas - 1));
    const faixa = d.comecaNaParcela > 1 ? `Parcelas ${d.comecaNaParcela} a ${d.numParcelas}` : `${d.numParcelas} parcelas`;
    return `${faixa} de ${formatarReais(valor)} · ${plural(pagas, 'paga', 'pagas')}`;
  }
  return `${formatarReais(d.valor)} · ${d.vencimento ? `vence ${formatarData(d.vencimento)}` : 'vencimento a confirmar'}`;
}
