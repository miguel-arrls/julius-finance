export type Centavos = number;
/** Data no formato 'AAAA-MM-DD', sem fuso. */
export type DataISO = string;
/** Mês no formato 'AAAA-MM'. */
export type MesISO = string;

export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDominio';
  }
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  ordem: number;
}

export interface Marca {
  id: string;
  nome: string;
  apelidos: string[];
  cor?: string;
  icone?: string;
  /** Chave do catálogo embutido (simple-icons). */
  logoSlug?: string;
  /** Imagem enviada pelo usuário, como data URL. */
  logoImagem?: string;
}

export type TipoMeio = 'credito' | 'debito' | 'pix' | 'boleto' | 'dinheiro' | 'outro';

export interface MeioPagamento {
  id: string;
  nome: string;
  tipo: TipoMeio;
  diaFechamento?: number;
  diaVencimento?: number;
}

export type TipoDespesa = 'avulsa' | 'parcelada' | 'recorrente';

export type CampoAConfirmar =
  | 'vencimento'
  | 'loja'
  | 'valor'
  | 'valorTotal'
  | 'categoria'
  | 'dataCompra'
  | 'meioPagamento';

interface DespesaBase {
  id: string;
  descricao: string;
  categoriaId: string;
  marcaId?: string;
  meioPagamentoId?: string;
  dataCompra?: DataISO;
  observacoes: string;
  aConfirmar: CampoAConfirmar[];
  criadaEm: string;
  atualizadaEm: string;
}

export interface DespesaAvulsa extends DespesaBase {
  tipo: 'avulsa';
  valor: Centavos;
  vencimento?: DataISO;
  /** Mês em que conta nos totais; igual ao mês do vencimento quando ele existe. */
  mes: MesISO;
}

export interface DespesaParcelada extends DespesaBase {
  tipo: 'parcelada';
  valorTotal: Centavos;
  numParcelas: number;
  valorParcela?: Centavos;
  /** Vencimento da parcela `comecaNaParcela`. */
  primeiroVencimento?: DataISO;
  /** Mês da parcela `comecaNaParcela` quando não há vencimento. */
  mesPrimeira: MesISO;
  comecaNaParcela: number;
}

export type Frequencia = 'mensal' | 'semanal' | 'anual';

export interface Pausa {
  de: DataISO;
  /** Data da retomada (exclusiva). Ausente = ainda pausada. */
  ate?: DataISO;
}

export interface DespesaRecorrente extends DespesaBase {
  tipo: 'recorrente';
  valor: Centavos;
  valorVariavel: boolean;
  frequencia: Frequencia;
  /** Data da primeira cobrança; o dia dela define o dia das seguintes. */
  inicio: DataISO;
  fim?: DataISO;
  pausas: Pausa[];
}

export type Despesa = DespesaAvulsa | DespesaParcelada | DespesaRecorrente;

export interface Lancamento {
  id: string;
  despesaId: string;
  numero?: number;
  chavePeriodo?: string;
  mes: MesISO;
  dataCobranca?: DataISO;
  vencimento?: DataISO;
  valor: Centavos;
  estimado: boolean;
  pagoEm?: DataISO;
  valorPago?: Centavos;
}

export type Situacao = 'paga' | 'pendente' | 'atrasada' | 'sem-vencimento';

export type AcaoHistorico =
  | 'criada'
  | 'editada'
  | 'paga'
  | 'pagamento desfeito'
  | 'pausada'
  | 'retomada'
  | 'encerrada'
  | 'importada';

export interface Mudanca {
  campo: string;
  de: unknown;
  para: unknown;
}

export interface RegistroHistorico {
  id: string;
  despesaId: string;
  lancamentoId?: string;
  quando: string;
  acao: AcaoHistorico;
  mudancas: Mudanca[];
}

export interface Configuracao {
  versaoEsquema: number;
  ultimoBackupEm?: string;
}

/** Resultado de regerar lançamentos: o que gravar e quais IDs apagar. */
export interface Mudancas {
  salvar: Lancamento[];
  remover: string[];
}
