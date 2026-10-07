import { diferencaEmDias, hojeISO, somarMesesAoMes } from './datas';
import { situacao } from './situacao';
import type {
  Categoria,
  Centavos,
  DataISO,
  Despesa,
  Lancamento,
  Marca,
  MeioPagamento,
  MesISO,
  Situacao,
} from './tipos';

export interface Cadastros {
  despesas: Despesa[];
  categorias: Categoria[];
  marcas: Marca[];
  meios: MeioPagamento[];
}

export interface ItemLista {
  lancamento: Lancamento;
  despesa: Despesa;
  situacao: Situacao;
  categoria?: Categoria;
  marca?: Marca;
  meio?: MeioPagamento;
}

export interface ResumoMes {
  total: Centavos;
  pago: Centavos;
  pendente: Centavos;
  atrasado: Centavos;
  qtdAtrasadas: number;
  porCategoria: { categoriaId: string; total: Centavos }[];
}

export interface Fatura {
  meioId: string;
  vencimento: DataISO;
  total: Centavos;
  pago: boolean;
  ids: string[];
  idsAbertos: string[];
}

export function detalhar(lancamentos: Lancamento[], cad: Cadastros, hoje: DataISO): ItemLista[] {
  const despesas = new Map(cad.despesas.map((d) => [d.id, d]));
  const categorias = new Map(cad.categorias.map((c) => [c.id, c]));
  const marcas = new Map(cad.marcas.map((m) => [m.id, m]));
  const meios = new Map(cad.meios.map((m) => [m.id, m]));
  const itens: ItemLista[] = [];
  for (const l of lancamentos) {
    const d = despesas.get(l.despesaId);
    if (!d) continue;
    itens.push({
      lancamento: l,
      despesa: d,
      situacao: situacao(l, hoje),
      categoria: categorias.get(d.categoriaId),
      marca: d.marcaId ? marcas.get(d.marcaId) : undefined,
      meio: d.meioPagamentoId ? meios.get(d.meioPagamentoId) : undefined,
    });
  }
  return itens;
}

export function valorEfetivo(l: Lancamento): Centavos {
  return l.pagoEm ? (l.valorPago ?? l.valor) : l.valor;
}

export function resumoDoMes(itens: ItemLista[], mes: MesISO): ResumoMes {
  let total = 0;
  let pago = 0;
  let atrasado = 0;
  let qtdAtrasadas = 0;
  const porCategoria = new Map<string, Centavos>();
  for (const i of itens) {
    if (i.lancamento.mes !== mes) continue;
    const v = valorEfetivo(i.lancamento);
    total += v;
    if (i.situacao === 'paga') pago += v;
    if (i.situacao === 'atrasada') {
      atrasado += v;
      qtdAtrasadas++;
    }
    porCategoria.set(i.despesa.categoriaId, (porCategoria.get(i.despesa.categoriaId) ?? 0) + v);
  }
  return {
    total,
    pago,
    pendente: total - pago,
    atrasado,
    qtdAtrasadas,
    porCategoria: [...porCategoria]
      .map(([categoriaId, t]) => ({ categoriaId, total: t }))
      .sort((a, b) => b.total - a.total || a.categoriaId.localeCompare(b.categoriaId)),
  };
}

/** Não pagas com vencimento: atrasadas primeiro, depois pela data. */
export function proximosVencimentos(itens: ItemLista[], limite = 5): ItemLista[] {
  const peso = (i: ItemLista) => (i.situacao === 'atrasada' ? 0 : 1);
  return itens
    .filter((i) => i.situacao === 'atrasada' || i.situacao === 'pendente')
    .sort(
      (a, b) =>
        peso(a) - peso(b) ||
        a.lancamento.vencimento!.localeCompare(b.lancamento.vencimento!) ||
        a.despesa.descricao.localeCompare(b.despesa.descricao, 'pt-BR'),
    )
    .slice(0, limite);
}

export function faturasDoMes(itens: ItemLista[], mes: MesISO): Fatura[] {
  const grupos = new Map<string, Fatura>();
  for (const i of itens) {
    const l = i.lancamento;
    if (l.mes !== mes || i.meio?.tipo !== 'credito' || !l.vencimento) continue;
    const chave = `${i.meio.id}|${l.vencimento}`;
    const f = grupos.get(chave) ?? { meioId: i.meio.id, vencimento: l.vencimento, total: 0, pago: true, ids: [], idsAbertos: [] };
    f.total += valorEfetivo(l);
    f.ids.push(l.id);
    if (!l.pagoEm) {
      f.pago = false;
      f.idsAbertos.push(l.id);
    }
    grupos.set(chave, f);
  }
  return [...grupos.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function totaisProximosMeses(
  itens: ItemLista[],
  mesAtual: MesISO,
  n = 3,
): { mes: MesISO; total: Centavos; temEstimado: boolean }[] {
  return Array.from({ length: n }, (_, k) => {
    const mes = somarMesesAoMes(mesAtual, k + 1);
    const doMes = itens.filter((i) => i.lancamento.mes === mes);
    return {
      mes,
      total: doMes.reduce((s, i) => s + valorEfetivo(i.lancamento), 0),
      temEstimado: doMes.some((i) => i.lancamento.estimado && !i.lancamento.pagoEm),
    };
  });
}

export function contarAConfirmar(despesas: Despesa[]): number {
  return despesas.filter((d) => d.aConfirmar.length > 0).length;
}

/** `ultimoBackupEm` é um instante ISO completo; compara pelo dia local. */
export function backupAtrasado(ultimoBackupEm: string | undefined, hoje: DataISO, dias = 30): boolean {
  if (!ultimoBackupEm) return true;
  return diferencaEmDias(hojeISO(new Date(ultimoBackupEm)), hoje) > dias;
}
