import { ehDataISO, mesDe } from '../dominio/datas';
import { normalizar } from '../dominio/filtros';
import { CATEGORIAS_PADRAO } from '../dominio/padroes';
import { regerarAvulsa, regerarParcelas } from '../dominio/parcelas';
import { sincronizarRecorrencia, vencimentoDaCobranca } from '../dominio/recorrencias';
import {
  ErroDominio,
  type AcaoHistorico,
  type Categoria,
  type Centavos,
  type DataISO,
  type Despesa,
  type DespesaRecorrente,
  type Lancamento,
  type Marca,
  type MeioPagamento,
  type MesISO,
  type Mudanca,
  type Mudancas,
} from '../dominio/tipos';
import { VERSAO_ESQUEMA, type JuliusDB, type RegistroConfig } from './db';

const agora = (): string => new Date().toISOString();
const novoId = (): string => crypto.randomUUID();
const CAMPOS_IGNORADOS = new Set(['criadaEm', 'atualizadaEm']);

export interface OpcoesSalvar {
  hoje: DataISO;
  /** Recria as ocorrências não pagas deste mês em diante (edição de valor/data de recorrente). */
  aPartirDe?: MesISO;
  /** Força uma ação no histórico (pausada, retomada, encerrada). */
  acao?: AcaoHistorico;
}

/** Campos que mudaram entre duas versões de um registro. */
export function diffCampos(anterior: object | undefined, novo: object): Mudanca[] {
  if (!anterior) return [];
  const a = anterior as Record<string, unknown>;
  const n = novo as Record<string, unknown>;
  const campos = [...new Set([...Object.keys(a), ...Object.keys(n)])].filter((c) => !CAMPOS_IGNORADOS.has(c)).sort();
  const mudancas: Mudanca[] = [];
  for (const campo of campos) {
    if (JSON.stringify(a[campo]) !== JSON.stringify(n[campo])) {
      mudancas.push({ campo, de: a[campo] ?? null, para: n[campo] ?? null });
    }
  }
  return mudancas;
}

async function mudancasDaDespesa(
  base: JuliusDB,
  d: Despesa,
  existentes: Lancamento[],
  hoje: DataISO,
  aPartirDe?: MesISO,
): Promise<Mudancas> {
  if (d.tipo === 'avulsa') return regerarAvulsa(d, existentes);
  if (d.tipo === 'parcelada') return regerarParcelas(d, existentes);
  const meio = d.meioPagamentoId ? await base.meios.get(d.meioPagamentoId) : undefined;
  return sincronizarRecorrencia(d, meio, existentes, hoje, aPartirDe);
}

async function aplicarMudancas(base: JuliusDB, m: Mudancas): Promise<void> {
  if (m.remover.length > 0) await base.lancamentos.bulkDelete(m.remover);
  if (m.salvar.length > 0) await base.lancamentos.bulkPut(m.salvar);
}

export async function salvarDespesa(base: JuliusDB, despesa: Despesa, op: OpcoesSalvar): Promise<void> {
  if (!despesa.descricao.trim()) throw new ErroDominio('Informe a descrição.');
  await base.transaction('rw', [base.despesas, base.lancamentos, base.historico, base.meios], async () => {
    const anterior = await base.despesas.get(despesa.id);
    if (anterior && anterior.tipo !== despesa.tipo) {
      throw new ErroDominio('Não é possível mudar o tipo de uma despesa já cadastrada.');
    }
    const existentes = await base.lancamentos.where('despesaId').equals(despesa.id).toArray();
    const m = await mudancasDaDespesa(base, despesa, existentes, op.hoje, op.aPartirDe);
    const momento = agora();
    const gravar: Despesa = { ...despesa, criadaEm: anterior?.criadaEm ?? momento, atualizadaEm: momento };
    await base.despesas.put(gravar);
    await aplicarMudancas(base, m);
    const mudancas = diffCampos(anterior, gravar);
    if (!anterior || mudancas.length > 0 || op.acao) {
      await base.historico.add({
        id: novoId(),
        despesaId: despesa.id,
        quando: momento,
        acao: op.acao ?? (anterior ? 'editada' : 'criada'),
        mudancas,
      });
    }
  });
}

export async function alterarRecorrencia(
  base: JuliusDB,
  id: string,
  alterar: (r: DespesaRecorrente) => DespesaRecorrente,
  acao: AcaoHistorico,
  hoje: DataISO,
): Promise<void> {
  const d = await base.despesas.get(id);
  if (!d || d.tipo !== 'recorrente') throw new ErroDominio('Recorrência não encontrada.');
  await salvarDespesa(base, alterar(d), { hoje, acao });
}

export async function marcarVariosPagos(base: JuliusDB, ids: string[], pagoEm: DataISO, valorPago?: Centavos): Promise<void> {
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const momento = agora();
    for (const id of ids) {
      const l = await base.lancamentos.get(id);
      if (!l) throw new ErroDominio('Lançamento não encontrado.');
      if (l.pagoEm) continue;
      const pago = valorPago ?? l.valor;
      await base.lancamentos.put({ ...l, pagoEm, valorPago: pago });
      await base.historico.add({
        id: novoId(),
        despesaId: l.despesaId,
        lancamentoId: id,
        quando: momento,
        acao: 'paga',
        mudancas: [
          { campo: 'pagoEm', de: null, para: pagoEm },
          { campo: 'valorPago', de: null, para: pago },
        ],
      });
    }
  });
}

export async function marcarPaga(base: JuliusDB, id: string, pagoEm: DataISO, valorPago?: Centavos): Promise<void> {
  await marcarVariosPagos(base, [id], pagoEm, valorPago);
}

export async function desfazerVariosPagamentos(base: JuliusDB, ids: string[]): Promise<void> {
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const momento = agora();
    for (const id of ids) {
      const l = await base.lancamentos.get(id);
      if (!l?.pagoEm) continue;
      const { pagoEm, valorPago: _valorPago, ...resto } = l;
      await base.lancamentos.put(resto);
      await base.historico.add({
        id: novoId(),
        despesaId: l.despesaId,
        lancamentoId: id,
        quando: momento,
        acao: 'pagamento desfeito',
        mudancas: [{ campo: 'pagoEm', de: pagoEm, para: null }],
      });
    }
  });
}

export async function desfazerPagamento(base: JuliusDB, id: string): Promise<void> {
  await desfazerVariosPagamentos(base, [id]);
}

/** Corrige valor e/ou vencimento de um lançamento. Valor informado deixa de ser estimativa. */
export async function editarLancamento(
  base: JuliusDB,
  id: string,
  campos: { valor?: Centavos; vencimento?: DataISO | null },
): Promise<void> {
  if (campos.valor !== undefined && (!Number.isInteger(campos.valor) || campos.valor <= 0)) {
    throw new ErroDominio('Informe um valor maior que zero.');
  }
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const l = await base.lancamentos.get(id);
    if (!l) throw new ErroDominio('Lançamento não encontrado.');
    const novo: Lancamento = { ...l };
    if (campos.valor !== undefined) {
      novo.valor = campos.valor;
      novo.estimado = false;
    }
    if (campos.vencimento === null) {
      delete novo.vencimento;
    } else if (campos.vencimento !== undefined) {
      novo.vencimento = campos.vencimento;
      novo.mes = mesDe(campos.vencimento);
    }
    const mudancas = diffCampos(l, novo);
    if (mudancas.length === 0) return;
    await base.lancamentos.put(novo);
    await base.historico.add({ id: novoId(), despesaId: l.despesaId, lancamentoId: id, quando: agora(), acao: 'editada', mudancas });
  });
}

/** Corrige a data e o valor de um pagamento já registrado. */
export async function editarPagamento(
  base: JuliusDB,
  id: string,
  campos: { pagoEm: DataISO; valorPago: Centavos },
): Promise<void> {
  if (!ehDataISO(campos.pagoEm)) throw new ErroDominio('Data inválida.');
  if (!Number.isInteger(campos.valorPago) || campos.valorPago <= 0) throw new ErroDominio('Informe um valor maior que zero.');
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const l = await base.lancamentos.get(id);
    if (!l) throw new ErroDominio('Lançamento não encontrado.');
    if (!l.pagoEm) throw new ErroDominio('Este lançamento não está pago.');
    const novo: Lancamento = { ...l, pagoEm: campos.pagoEm, valorPago: campos.valorPago };
    const mudancas = diffCampos(l, novo);
    if (mudancas.length === 0) return;
    await base.lancamentos.put(novo);
    await base.historico.add({ id: novoId(), despesaId: l.despesaId, lancamentoId: id, quando: agora(), acao: 'editada', mudancas });
  });
}

export async function contarLancamentos(base: JuliusDB, despesaId: string): Promise<{ total: number; pagos: number }> {
  const ls = await base.lancamentos.where('despesaId').equals(despesaId).toArray();
  return { total: ls.length, pagos: ls.filter((l) => l.pagoEm).length };
}

export async function excluirDespesa(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.despesas, base.lancamentos, base.historico, async () => {
    await base.lancamentos.where('despesaId').equals(id).delete();
    await base.historico.where('despesaId').equals(id).delete();
    await base.despesas.delete(id);
  });
}

/** Cria as ocorrências que faltam de todas as recorrentes. Roda ao abrir o app. */
export async function materializarTodas(base: JuliusDB, hoje: DataISO): Promise<string[]> {
  return base.transaction('rw', [base.despesas, base.lancamentos, base.meios], async () => {
    const ignoradas: string[] = [];
    const recorrentes = (await base.despesas.where('tipo').equals('recorrente').toArray()) as DespesaRecorrente[];
    for (const r of recorrentes) {
      const existentes = await base.lancamentos.where('despesaId').equals(r.id).toArray();
      const meio = r.meioPagamentoId ? await base.meios.get(r.meioPagamentoId) : undefined;
      let m: Mudancas;
      try {
        m = sincronizarRecorrencia(r, meio, existentes, hoje);
      } catch (e) {
        if (e instanceof ErroDominio) {
          ignoradas.push(r.id); // registro antigo inválido: não trava a abertura do app
          continue;
        }
        throw e;
      }
      await aplicarMudancas(base, m);
    }
    return ignoradas;
  });
}

export async function salvarCategoria(base: JuliusDB, c: Categoria): Promise<void> {
  const nome = c.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  const todas = await base.categorias.toArray();
  if (todas.some((o) => o.id !== c.id && normalizar(o.nome) === normalizar(nome))) {
    throw new ErroDominio('Já existe uma categoria com esse nome.');
  }
  await base.categorias.put({ ...c, nome });
}

/** Remove/troca um campo de cadastro numa despesa, com histórico e atualizadaEm. */
async function reescreverDespesa(base: JuliusDB, d: Despesa, campo: string, de: unknown, novo: Despesa, para: unknown): Promise<void> {
  const momento = agora();
  await base.despesas.put({ ...novo, atualizadaEm: momento });
  await base.historico.add({
    id: novoId(),
    despesaId: d.id,
    quando: momento,
    acao: 'editada',
    mudancas: [{ campo, de, para }],
  });
}

export async function excluirCategoria(base: JuliusDB, id: string, substitutaId?: string): Promise<void> {
  await base.transaction('rw', base.categorias, base.despesas, base.historico, async () => {
    if ((await base.categorias.count()) <= 1) throw new ErroDominio('Mantenha pelo menos uma categoria.');
    const emUso = (await base.despesas.toArray()).filter((d) => d.categoriaId === id);
    if (emUso.length > 0) {
      if (!substitutaId || substitutaId === id || !(await base.categorias.get(substitutaId))) {
        throw new ErroDominio('Escolha outra categoria para as despesas que usam esta.');
      }
      for (const d of emUso) await reescreverDespesa(base, d, 'categoriaId', d.categoriaId, { ...d, categoriaId: substitutaId }, substitutaId);
    }
    await base.categorias.delete(id);
  });
}

export async function salvarMarca(base: JuliusDB, m: Marca): Promise<void> {
  const nome = m.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  await base.marcas.put({ ...m, nome, apelidos: m.apelidos.map((a) => a.trim()).filter(Boolean) });
}

export async function excluirMarca(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.marcas, base.despesas, base.historico, async () => {
    for (const d of (await base.despesas.toArray()).filter((x) => x.marcaId === id)) {
      const { marcaId, ...resto } = d;
      await reescreverDespesa(base, d, 'marcaId', marcaId, resto as Despesa, null);
    }
    await base.marcas.delete(id);
  });
}

function diaValido(dia: number | undefined): boolean {
  return dia === undefined || (Number.isInteger(dia) && dia >= 1 && dia <= 31);
}

export async function salvarMeio(base: JuliusDB, m: MeioPagamento, hoje: DataISO): Promise<void> {
  const nome = m.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  if (m.tipo === 'credito' && (!diaValido(m.diaFechamento) || !diaValido(m.diaVencimento))) {
    throw new ErroDominio('Informe um dia entre 1 e 31.');
  }
  const limpo: MeioPagamento =
    m.tipo === 'credito' ? { ...m, nome } : { id: m.id, nome, tipo: m.tipo };
  await base.transaction('rw', [base.meios, base.despesas, base.lancamentos], async () => {
    const anterior = await base.meios.get(m.id);
    await base.meios.put(limpo);
    const mudouRegra =
      anterior !== undefined &&
      (anterior.tipo !== limpo.tipo ||
        anterior.diaFechamento !== limpo.diaFechamento ||
        anterior.diaVencimento !== limpo.diaVencimento);
    if (!mudouRegra) return;
    const recorrentes = (await base.despesas.where('tipo').equals('recorrente').toArray()).filter(
      (d) => d.meioPagamentoId === m.id,
    ) as DespesaRecorrente[];
    for (const r of recorrentes) {
      const existentes = await base.lancamentos.where('despesaId').equals(r.id).toArray();
      const atualizados = existentes.map((l) => {
        if (l.pagoEm || !l.dataCobranca || l.mes < mesDe(hoje)) return l;
        const vencimento = vencimentoDaCobranca(l.dataCobranca, limpo);
        return { ...l, vencimento, mes: mesDe(vencimento) };
      });
      const alterados = atualizados.filter((l, i) => l !== existentes[i]);
      if (alterados.length > 0) await base.lancamentos.bulkPut(alterados);
      await aplicarMudancas(base, sincronizarRecorrencia(r, limpo, atualizados, hoje));
    }
  });
}

export async function excluirMeio(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.meios, base.despesas, base.historico, async () => {
    for (const d of (await base.despesas.toArray()).filter((x) => x.meioPagamentoId === id)) {
      const { meioPagamentoId, ...resto } = d;
      await reescreverDespesa(base, d, 'meioPagamentoId', meioPagamentoId, resto as Despesa, null);
    }
    await base.meios.delete(id);
  });
}

export async function inicializarPadrao(base: JuliusDB): Promise<void> {
  await base.transaction('rw', base.categorias, base.config, async () => {
    if ((await base.categorias.count()) === 0) await base.categorias.bulkAdd(CATEGORIAS_PADRAO);
    if (!(await base.config.get('config'))) await base.config.put({ id: 'config', versaoEsquema: VERSAO_ESQUEMA });
  });
}

export async function obterConfig(base: JuliusDB): Promise<RegistroConfig> {
  return (await base.config.get('config')) ?? { id: 'config', versaoEsquema: VERSAO_ESQUEMA };
}

export async function registrarBackup(base: JuliusDB, quando: string): Promise<void> {
  const c = await obterConfig(base);
  await base.config.put({ ...c, ultimoBackupEm: quando });
}
