import { CATEGORIAS_PADRAO } from '../dominio/padroes';
import { gerarAvulsa, gerarParcelas } from '../dominio/parcelas';
import { gerarOcorrencias } from '../dominio/recorrencias';
import type { Centavos, DataISO, Despesa, Lancamento, Marca, MeioPagamento, RegistroHistorico } from '../dominio/tipos';
import { APP_ID, VERSAO_BACKUP } from './backup';
import { VERSAO_ESQUEMA, type ArquivoBackup } from './db';

export type SemDatas<T> = T extends unknown ? Omit<T, 'criadaEm' | 'atualizadaEm'> : never;

export interface DefinicaoInicial {
  meios: MeioPagamento[];
  marcas: Marca[];
  despesas: SemDatas<Despesa>[];
  pagamentos: { lancamentoId: string; pagoEm: DataISO; valorPago?: Centavos }[];
}

/** Monta um arquivo de backup a partir de uma definição escrita à mão. */
export function montarBackupInicial(def: DefinicaoInicial, hoje: DataISO, agora: string): ArquivoBackup {
  const objeto = typeof def === 'object' && def !== null && !Array.isArray(def);
  if (!objeto || ![def.meios, def.marcas, def.despesas, def.pagamentos].every(Array.isArray)) {
    throw new Error('Definição inválida: esperado um objeto com as listas meios, marcas, despesas e pagamentos.');
  }
  const categorias = new Set(CATEGORIAS_PADRAO.map((c) => c.id));
  const meios = new Map(def.meios.map((m) => [m.id, m]));
  const despesas = def.despesas.map((d) => ({ ...d, criadaEm: agora, atualizadaEm: agora }) as Despesa);

  const lancamentos = new Map<string, Lancamento>();
  for (const d of despesas) {
    if (!categorias.has(d.categoriaId)) throw new Error(`Categoria desconhecida em "${d.descricao}": ${d.categoriaId}`);
    if (d.meioPagamentoId && !meios.has(d.meioPagamentoId)) {
      throw new Error(`Meio de pagamento desconhecido em "${d.descricao}": ${d.meioPagamentoId}`);
    }
    const gerados =
      d.tipo === 'avulsa'
        ? [gerarAvulsa(d)]
        : d.tipo === 'parcelada'
          ? gerarParcelas(d)
          : gerarOcorrencias(d, d.meioPagamentoId ? meios.get(d.meioPagamentoId) : undefined, hoje);
    for (const l of gerados) lancamentos.set(l.id, l);
  }

  for (const p of def.pagamentos) {
    const l = lancamentos.get(p.lancamentoId);
    if (!l) throw new Error(`Pagamento aponta para lançamento inexistente: ${p.lancamentoId}`);
    lancamentos.set(l.id, { ...l, pagoEm: p.pagoEm, valorPago: p.valorPago ?? l.valor });
  }

  const historico: RegistroHistorico[] = despesas.map((d) => ({
    id: `hist-${d.id}`,
    despesaId: d.id,
    quando: agora,
    acao: 'importada',
    mudancas: [],
  }));

  return {
    app: APP_ID,
    versao: VERSAO_BACKUP,
    exportadoEm: agora,
    dados: {
      categorias: CATEGORIAS_PADRAO,
      marcas: def.marcas,
      meiosPagamento: def.meios,
      despesas,
      lancamentos: [...lancamentos.values()],
      historico,
      configuracao: { versaoEsquema: VERSAO_ESQUEMA },
    },
  };
}
