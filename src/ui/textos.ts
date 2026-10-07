import type { AcaoHistorico, CampoAConfirmar, Frequencia, Situacao, TipoDespesa, TipoMeio } from '../dominio/tipos';

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
