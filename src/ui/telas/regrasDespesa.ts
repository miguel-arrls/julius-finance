import { vencimentoNoCartao } from '../../dominio/cartao';
import { ehDataISO, ehMesISO, mesDe } from '../../dominio/datas';
import { formatarNumero, lerReais } from '../../dominio/dinheiro';
import { normalizar } from '../../dominio/filtros';
import { gerarAvulsa, gerarParcelas } from '../../dominio/parcelas';
import { gerarOcorrencias } from '../../dominio/recorrencias';
import type {
  CampoAConfirmar,
  DataISO,
  Despesa,
  Frequencia,
  Lancamento,
  Marca,
  MeioPagamento,
  MesISO,
  Pausa,
  TipoDespesa,
} from '../../dominio/tipos';
import { identificarMarca } from '../../marcas/identificar';

export interface ValoresForm {
  tipo: TipoDespesa;
  descricao: string;
  marca: string;
  categoriaId: string;
  meioPagamentoId: string;
  dataCompra: string;
  observacoes: string;
  valor: string;
  vencimento: string;
  mes: string;
  valorTotal: string;
  numParcelas: string;
  valorParcela: string;
  primeiroVencimento: string;
  mesPrimeira: string;
  comecaNaParcela: string;
  frequencia: Frequencia;
  inicio: string;
  fim: string;
  valorVariavel: boolean;
  aConfirmar: CampoAConfirmar[];
}

export type ErrosForm = Partial<Record<keyof ValoresForm, string>>;

const MSG_VALOR = 'Informe um valor maior que zero.';
const MSG_DATA = 'Data inválida.';

export function valoresIniciais(mesAtual: MesISO): ValoresForm {
  return {
    tipo: 'avulsa', descricao: '', marca: '', categoriaId: '', meioPagamentoId: '', dataCompra: '', observacoes: '',
    valor: '', vencimento: '', mes: mesAtual,
    valorTotal: '', numParcelas: '2', valorParcela: '', primeiroVencimento: '', mesPrimeira: mesAtual, comecaNaParcela: '1',
    frequencia: 'mensal', inicio: '', fim: '', valorVariavel: false,
    aConfirmar: [],
  };
}

export function valoresDeDespesa(d: Despesa, marcas: Marca[], mesAtual: MesISO): ValoresForm {
  const v = valoresIniciais(mesAtual);
  v.tipo = d.tipo;
  v.descricao = d.descricao;
  v.marca = marcas.find((m) => m.id === d.marcaId)?.nome ?? '';
  v.categoriaId = d.categoriaId;
  v.meioPagamentoId = d.meioPagamentoId ?? '';
  v.dataCompra = d.dataCompra ?? '';
  v.observacoes = d.observacoes;
  v.aConfirmar = [...d.aConfirmar];
  if (d.tipo === 'avulsa') {
    v.valor = formatarNumero(d.valor);
    v.vencimento = d.vencimento ?? '';
    v.mes = d.mes;
  } else if (d.tipo === 'parcelada') {
    v.valorTotal = formatarNumero(d.valorTotal);
    v.numParcelas = String(d.numParcelas);
    v.valorParcela = d.valorParcela !== undefined ? formatarNumero(d.valorParcela) : '';
    v.primeiroVencimento = d.primeiroVencimento ?? '';
    v.mesPrimeira = d.mesPrimeira;
    v.comecaNaParcela = String(d.comecaNaParcela);
  } else {
    v.valor = formatarNumero(d.valor);
    v.valorVariavel = d.valorVariavel;
    v.frequencia = d.frequencia;
    v.inicio = d.inicio;
    v.fim = d.fim ?? '';
  }
  return v;
}

function valorPositivo(texto: string): boolean {
  const c = lerReais(texto);
  return c !== null && c > 0;
}

function inteiro(texto: string): number | null {
  return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

export function validar(v: ValoresForm): ErrosForm {
  const e: ErrosForm = {};
  if (!v.descricao.trim()) e.descricao = 'Informe a descrição.';
  if (!v.categoriaId) e.categoriaId = 'Escolha uma categoria.';
  if (v.dataCompra && !ehDataISO(v.dataCompra)) e.dataCompra = MSG_DATA;

  if (v.tipo === 'avulsa') {
    if (!valorPositivo(v.valor)) e.valor = MSG_VALOR;
    if (v.vencimento && !ehDataISO(v.vencimento)) e.vencimento = MSG_DATA;
    if (!v.vencimento && !ehMesISO(v.mes)) e.mes = 'Informe o mês.';
  } else if (v.tipo === 'parcelada') {
    const n = inteiro(v.numParcelas);
    const nValido = n !== null && n >= 2 && n <= 120;
    if (!nValido) e.numParcelas = 'Informe de 2 a 120 parcelas.';
    const temTotal = v.valorTotal.trim() !== '';
    const temParcela = v.valorParcela.trim() !== '';
    if (!temTotal && !temParcela) e.valorTotal = 'Informe o valor total ou o valor da parcela.';
    if (temTotal && !valorPositivo(v.valorTotal)) e.valorTotal = MSG_VALOR;
    if (temParcela && !valorPositivo(v.valorParcela)) e.valorParcela = MSG_VALOR;
    const k = inteiro(v.comecaNaParcela);
    if (nValido && (k === null || k < 1 || k > n!)) e.comecaNaParcela = `A parcela inicial deve estar entre 1 e ${n}.`;
    if (v.primeiroVencimento && !ehDataISO(v.primeiroVencimento)) e.primeiroVencimento = MSG_DATA;
    if (!v.primeiroVencimento && !ehMesISO(v.mesPrimeira)) e.mesPrimeira = 'Informe o mês.';
  } else {
    if (!valorPositivo(v.valor)) e.valor = MSG_VALOR;
    if (!ehDataISO(v.inicio)) e.inicio = 'Informe a data da primeira cobrança.';
    if (v.fim && !ehDataISO(v.fim)) e.fim = MSG_DATA;
    else if (v.fim && ehDataISO(v.inicio) && v.fim < v.inicio) e.fim = 'O fim não pode ser antes do início.';
  }
  return e;
}

/** Tira de "a confirmar" o que o usuário acabou de preencher. */
export function atualizarAConfirmar(v: ValoresForm): CampoAConfirmar[] {
  return v.aConfirmar.filter((c) => {
    if (c === 'vencimento') {
      return !((v.tipo === 'avulsa' && v.vencimento) || (v.tipo === 'parcelada' && v.primeiroVencimento) || v.tipo === 'recorrente');
    }
    if (c === 'loja') return !v.marca.trim();
    if (c === 'dataCompra') return !v.dataCompra;
    if (c === 'meioPagamento') return !v.meioPagamentoId;
    return true;
  });
}

/** Monta a despesa a partir de valores já validados. */
export function montarDespesa(v: ValoresForm, ctx: { id: string; marcaId?: string; pausas?: Pausa[] }): Despesa {
  const comum = {
    id: ctx.id,
    descricao: v.descricao.trim(),
    categoriaId: v.categoriaId,
    marcaId: ctx.marcaId,
    meioPagamentoId: v.meioPagamentoId || undefined,
    dataCompra: v.dataCompra || undefined,
    observacoes: v.observacoes.trim(),
    aConfirmar: atualizarAConfirmar(v),
    criadaEm: '',
    atualizadaEm: '',
  };
  if (v.tipo === 'avulsa') {
    return { ...comum, tipo: 'avulsa', valor: lerReais(v.valor)!, vencimento: v.vencimento || undefined, mes: v.vencimento ? mesDe(v.vencimento) : v.mes };
  }
  if (v.tipo === 'parcelada') {
    const n = Number(v.numParcelas);
    const parcela = v.valorParcela.trim() ? lerReais(v.valorParcela)! : undefined;
    const total = v.valorTotal.trim() ? lerReais(v.valorTotal)! : parcela! * n;
    return {
      ...comum,
      tipo: 'parcelada',
      valorTotal: total,
      numParcelas: n,
      valorParcela: parcela,
      primeiroVencimento: v.primeiroVencimento || undefined,
      mesPrimeira: v.primeiroVencimento ? mesDe(v.primeiroVencimento) : v.mesPrimeira,
      comecaNaParcela: Number(v.comecaNaParcela),
    };
  }
  return {
    ...comum,
    tipo: 'recorrente',
    valor: lerReais(v.valor)!,
    valorVariavel: v.valorVariavel,
    frequencia: v.frequencia,
    inicio: v.inicio,
    fim: v.fim || undefined,
    pausas: ctx.pausas ?? [],
  };
}

export function sugerirVencimento(dataCompra: string, meio?: MeioPagamento): DataISO | undefined {
  if (!ehDataISO(dataCompra) || meio?.tipo !== 'credito' || !meio.diaFechamento || !meio.diaVencimento) return undefined;
  return vencimentoNoCartao(dataCompra, meio.diaFechamento, meio.diaVencimento);
}

/**
 * Decide a marca: o texto digitado (marca existente por nome/apelido, ou nova, com logo do catálogo
 * se houver) ou, sem texto, uma marca reconhecida na descrição.
 */
export function resolverMarca(
  texto: string,
  descricao: string,
  marcas: Marca[],
  novoId: () => string = () => crypto.randomUUID(),
): { marcaId?: string; nova?: Marca } {
  const t = texto.trim();
  if (t) {
    const existente = marcas.find((m) => [m.nome, ...m.apelidos].some((n) => normalizar(n) === normalizar(t)));
    if (existente) return { marcaId: existente.id };
    const doCatalogo = identificarMarca(t, []);
    return {
      nova: { id: novoId(), nome: t, apelidos: [], ...(doCatalogo?.tipo === 'catalogo' ? { logoSlug: doCatalogo.item.slug } : {}) },
    };
  }
  const achada = identificarMarca(descricao, marcas);
  if (achada?.tipo === 'marca') return { marcaId: achada.marca.id };
  if (achada?.tipo === 'catalogo') {
    const mesmaLogo = marcas.find((m) => m.logoSlug === achada.item.slug);
    if (mesmaLogo) return { marcaId: mesmaLogo.id };
    return { nova: { id: novoId(), nome: achada.item.nome, apelidos: [], logoSlug: achada.item.slug } };
  }
  return {};
}

/** A edição muda valor/datas das cobranças? Só então pergunta "a partir de qual mês". */
export function mudouCobranca(antes: Despesa, depois: Despesa): boolean {
  if (antes.tipo !== 'recorrente' || depois.tipo !== 'recorrente') return false;
  return (
    antes.valor !== depois.valor ||
    antes.valorVariavel !== depois.valorVariavel ||
    antes.frequencia !== depois.frequencia ||
    antes.inicio !== depois.inicio ||
    antes.fim !== depois.fim ||
    antes.meioPagamentoId !== depois.meioPagamentoId
  );
}

export function previa(d: Despesa, meio: MeioPagamento | undefined, hoje: DataISO): { lancamentos: Lancamento[]; anteriores: number } {
  try {
    if (d.tipo === 'avulsa') return { lancamentos: [gerarAvulsa(d)], anteriores: 0 };
    if (d.tipo === 'parcelada') return { lancamentos: gerarParcelas(d), anteriores: 0 };
    const todas = gerarOcorrencias(d, meio, hoje);
    const futuras = todas.filter((l) => l.dataCobranca! >= hoje);
    return { lancamentos: futuras.slice(0, 3), anteriores: todas.length - futuras.length };
  } catch {
    return { lancamentos: [], anteriores: 0 };
  }
}
