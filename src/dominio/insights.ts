import { somarMesesAoMes, ultimoDia } from './datas';
import { resumoDoMes, valorEfetivo, type ItemLista } from './resumo';
import type { Centavos, Despesa, DespesaRecorrente, MesISO } from './tipos';

export interface VariacaoCategoria {
  categoriaId: string;
  atual: Centavos;
  anterior: Centavos;
  variacao: Centavos;
}

export interface ComparacaoMensal {
  atual: Centavos;
  anterior: Centavos;
  /** atual - anterior, em centavos. */
  variacao: Centavos;
  /** Fração para exibição (0.23 = 23%); null quando o mês anterior é zero. */
  percentual: number | null;
  porCategoria: VariacaoCategoria[];
}

export interface GastoPorMeio {
  meioId: string | undefined;
  total: Centavos;
  qtd: number;
}

export interface MesEvolucao {
  mes: MesISO;
  total: Centavos;
  pago: Centavos;
  pendente: Centavos;
  temEstimado: boolean;
}

export interface Evolucao {
  meses: MesEvolucao[];
  media: Centavos | null;
}

export interface ParceladaEmAberto {
  despesaId: string;
  descricao: string;
  restante: Centavos;
  parcelasRestantes: number;
  ultimoMes: MesISO;
}

export interface CompromissosFuturos {
  parceladas: ParceladaEmAberto[];
  fixosMensal: Centavos;
  variaveisEstimado: Centavos;
}

/**
 * Compara o mês com o anterior pelo valor efetivo (valor pago quando pago).
 * Categorias de qualquer um dos dois meses entram; maior aumento primeiro.
 */
export function compararComAnterior(itens: ItemLista[], mes: MesISO): ComparacaoMensal {
  const atual = resumoDoMes(itens, mes);
  const anterior = resumoDoMes(itens, somarMesesAoMes(mes, -1));
  const cats = new Map<string, { atual: Centavos; anterior: Centavos }>();
  for (const c of atual.porCategoria) cats.set(c.categoriaId, { atual: c.total, anterior: 0 });
  for (const c of anterior.porCategoria) {
    const v = cats.get(c.categoriaId) ?? { atual: 0, anterior: 0 };
    v.anterior = c.total;
    cats.set(c.categoriaId, v);
  }
  return {
    atual: atual.total,
    anterior: anterior.total,
    variacao: atual.total - anterior.total,
    percentual: anterior.total === 0 ? null : (atual.total - anterior.total) / anterior.total,
    porCategoria: [...cats]
      .map(([categoriaId, v]) => ({ categoriaId, atual: v.atual, anterior: v.anterior, variacao: v.atual - v.anterior }))
      .sort((a, b) => b.variacao - a.variacao || a.categoriaId.localeCompare(b.categoriaId)),
  };
}

/** Total e quantidade por meio de pagamento no mês; sem meio vira `undefined`. */
export function gastosPorMeio(itens: ItemLista[], mes: MesISO): GastoPorMeio[] {
  const grupos = new Map<string | undefined, GastoPorMeio>();
  for (const i of itens) {
    if (i.lancamento.mes !== mes) continue;
    const meioId = i.despesa.meioPagamentoId;
    const g = grupos.get(meioId) ?? { meioId, total: 0, qtd: 0 };
    g.total += valorEfetivo(i.lancamento);
    g.qtd++;
    grupos.set(meioId, g);
  }
  return [...grupos.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.meioId === b.meioId) return 0;
    if (a.meioId === undefined) return 1;
    if (b.meioId === undefined) return -1;
    return a.meioId.localeCompare(b.meioId);
  });
}

/**
 * Os `n` meses terminando em `mes`, em ordem cronológica.
 * A média considera só os meses anteriores a `mes` com total > 0.
 */
export function evolucao(itens: ItemLista[], mes: MesISO, n = 6): Evolucao {
  const meses = Array.from({ length: n }, (_, k): MesEvolucao => {
    const m = somarMesesAoMes(mes, k - n + 1);
    const r = resumoDoMes(itens, m);
    return {
      mes: m,
      total: r.total,
      pago: r.pago,
      pendente: r.pendente,
      temEstimado: itens.some((i) => i.lancamento.mes === m && i.lancamento.estimado && !i.lancamento.pagoEm),
    };
  });
  const fechados = meses.filter((m) => m.mes < mes && m.total > 0);
  const media = fechados.length
    ? Math.round(fechados.reduce((s, m) => s + m.total, 0) / fechados.length)
    : null;
  return { meses, media };
}

/** Recorrente ativa em `mes`: já começou, não terminou antes do mês e sem pausa em aberto. */
function recorrenteAtiva(d: DespesaRecorrente, mes: MesISO): boolean {
  if (d.inicio > ultimoDia(mes)) return false;
  if (d.fim && d.fim < `${mes}-01`) return false;
  return !d.pausas.some((p) => !p.ate);
}

/** Valor equivalente por mês: anual / 12, semanal × 52 / 12, arredondados. */
function equivalenteMensal(d: DespesaRecorrente): Centavos {
  if (d.frequencia === 'anual') return Math.round(d.valor / 12);
  if (d.frequencia === 'semanal') return Math.round((d.valor * 52) / 12);
  return d.valor;
}

/**
 * Parceladas com parcelas não pagas a partir de `mes` (pelo `valor` previsto) e
 * custo mensal das recorrentes ativas, separando fixas de variáveis.
 */
export function compromissosFuturos(itens: ItemLista[], despesas: Despesa[], mes: MesISO): CompromissosFuturos {
  const grupos = new Map<string, ParceladaEmAberto>();
  for (const i of itens) {
    const l = i.lancamento;
    if (i.despesa.tipo !== 'parcelada' || l.pagoEm || l.mes < mes) continue;
    const g = grupos.get(i.despesa.id) ?? {
      despesaId: i.despesa.id,
      descricao: i.despesa.descricao,
      restante: 0,
      parcelasRestantes: 0,
      ultimoMes: l.mes,
    };
    g.restante += l.valor;
    g.parcelasRestantes++;
    if (l.mes > g.ultimoMes) g.ultimoMes = l.mes;
    grupos.set(i.despesa.id, g);
  }

  let fixosMensal = 0;
  let variaveisEstimado = 0;
  for (const d of despesas) {
    if (d.tipo !== 'recorrente' || !recorrenteAtiva(d, mes)) continue;
    if (d.valorVariavel) variaveisEstimado += equivalenteMensal(d);
    else fixosMensal += equivalenteMensal(d);
  }

  return {
    parceladas: [...grupos.values()].sort(
      (a, b) => b.ultimoMes.localeCompare(a.ultimoMes) || a.descricao.localeCompare(b.descricao, 'pt-BR'),
    ),
    fixosMensal,
    variaveisEstimado,
  };
}
