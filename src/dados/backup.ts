import { ehDataISO, ehMesISO } from '../dominio/datas';
import type { Configuracao, DataISO } from '../dominio/tipos';
import { VERSAO_ESQUEMA, type ArquivoBackup, type DadosBackup, type JuliusDB } from './db';

export const APP_ID = 'julius-finance';
export const VERSAO_BACKUP = 1;
const MAX_SNAPSHOTS = 3;

type TipoCampo = 'string' | 'number' | 'inteiro' | 'boolean' | 'array' | 'data' | 'mes';
type Tabela = Exclude<keyof DadosBackup, 'configuracao'>;

/** Campos obrigatórios de cada lista. Campos opcionais não são exigidos. */
const ESQUEMAS: Record<Tabela, Record<string, TipoCampo>> = {
  categorias: { id: 'string', nome: 'string', cor: 'string', icone: 'string', ordem: 'number' },
  marcas: { id: 'string', nome: 'string', apelidos: 'array' },
  meiosPagamento: { id: 'string', nome: 'string', tipo: 'string' },
  despesas: { id: 'string', tipo: 'string', descricao: 'string', categoriaId: 'string', observacoes: 'string', aConfirmar: 'array' },
  lancamentos: { id: 'string', despesaId: 'string', mes: 'mes', valor: 'inteiro', estimado: 'boolean' },
  historico: { id: 'string', despesaId: 'string', quando: 'string', acao: 'string', mudancas: 'array' },
};
const TIPOS_DESPESA = new Set(['avulsa', 'parcelada', 'recorrente']);
const TIPOS_MEIO = new Set(['credito', 'debito', 'pix', 'boleto', 'dinheiro', 'outro']);
const FREQUENCIAS = new Set(['mensal', 'semanal', 'anual']);

/** Campos obrigatórios que dependem do tipo da despesa. */
const POR_TIPO_DESPESA: Record<string, Record<string, TipoCampo>> = {
  avulsa: { valor: 'inteiro', mes: 'mes' },
  parcelada: { valorTotal: 'inteiro', numParcelas: 'inteiro', comecaNaParcela: 'inteiro', mesPrimeira: 'mes' },
  recorrente: { valor: 'inteiro', valorVariavel: 'boolean', inicio: 'data', pausas: 'array' },
};

/** Campos opcionais: quando presentes, precisam ter o tipo certo. */
const OPCIONAIS: Partial<Record<Tabela, Record<string, TipoCampo>>> = {
  lancamentos: { numero: 'inteiro', valorPago: 'inteiro', vencimento: 'data', pagoEm: 'data', dataCobranca: 'data' },
  despesas: { vencimento: 'data', primeiroVencimento: 'data', dataCompra: 'data', fim: 'data', valorParcela: 'inteiro' },
};

export type ResultadoLeitura = { ok: true; arquivo: ArquivoBackup } | { ok: false; erro: string };

const falha = (erro: string): ResultadoLeitura => ({ ok: false, erro });
const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function confere(valor: unknown, tipo: TipoCampo): boolean {
  if (tipo === 'array') return Array.isArray(valor);
  if (tipo === 'inteiro') return Number.isInteger(valor);
  if (tipo === 'data') return ehDataISO(valor);
  if (tipo === 'mes') return ehMesISO(valor);
  return typeof valor === tipo;
}

export async function exportar(base: JuliusDB, agora = new Date().toISOString()): Promise<ArquivoBackup> {
  return base.transaction(
    'r',
    [base.categorias, base.marcas, base.meios, base.despesas, base.lancamentos, base.historico, base.config],
    async () => {
      const [categorias, marcas, meiosPagamento, despesas, lancamentos, historico, cfg] = await Promise.all([
        base.categorias.toArray(),
        base.marcas.toArray(),
        base.meios.toArray(),
        base.despesas.toArray(),
        base.lancamentos.toArray(),
        base.historico.toArray(),
        base.config.get('config'),
      ]);
      const configuracao: Configuracao = cfg
        ? { versaoEsquema: cfg.versaoEsquema, ...(cfg.ultimoBackupEm ? { ultimoBackupEm: cfg.ultimoBackupEm } : {}) }
        : { versaoEsquema: VERSAO_ESQUEMA };
      return {
        app: APP_ID,
        versao: VERSAO_BACKUP,
        exportadoEm: agora,
        dados: { categorias, marcas, meiosPagamento, despesas, lancamentos, historico, configuracao },
      };
    },
  );
}

export function serializar(a: ArquivoBackup): string {
  return JSON.stringify(a, null, 2);
}

export function nomeArquivoBackup(hoje: DataISO): string {
  return `julius-backup-${hoje}.json`;
}

export function lerBackup(texto: string): ResultadoLeitura {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return falha('O arquivo não é um JSON válido.');
  }
  if (!ehObjeto(json) || json.app !== APP_ID) return falha('Este arquivo não é um backup do Julius.');
  if (!Number.isInteger(json.versao) || (json.versao as number) < 1) return falha('Versão do backup ausente.');
  if ((json.versao as number) > VERSAO_BACKUP) {
    return falha('Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.');
  }
  const dados = json.dados;
  if (!ehObjeto(dados)) return falha('Arquivo incompleto: faltam os dados.');

  for (const [tabela, esquema] of Object.entries(ESQUEMAS)) {
    const lista = dados[tabela];
    if (!Array.isArray(lista)) return falha(`Arquivo incompleto: falta a lista "${tabela}".`);
    const ids = new Set<string>();
    for (const [i, registro] of lista.entries()) {
      if (!ehObjeto(registro)) return falha(`Arquivo inválido: ${tabela}[${i}] não é um registro.`);
      for (const [campo, tipo] of Object.entries(esquema)) {
        if (!confere(registro[campo], tipo)) {
          return falha(`Arquivo inválido: ${tabela}[${i}].${campo} ausente ou com tipo errado.`);
        }
      }
      for (const [campo, tipo] of Object.entries(OPCIONAIS[tabela as Tabela] ?? {})) {
        if (registro[campo] !== undefined && !confere(registro[campo], tipo)) {
          return falha(`Arquivo inválido: ${tabela}[${i}].${campo} ausente ou com tipo errado.`);
        }
      }
      const id = registro.id as string;
      if (ids.has(id)) return falha(`Arquivo inválido: ID repetido em ${tabela} ("${id}").`);
      ids.add(id);
    }
  }

  const despesas = dados.despesas as Record<string, unknown>[];
  for (const [i, d] of despesas.entries()) {
    if (!TIPOS_DESPESA.has(d.tipo as string)) return falha(`Arquivo inválido: despesas[${i}].tipo ausente ou com tipo errado.`);
    for (const [campo, tipo] of Object.entries(POR_TIPO_DESPESA[d.tipo as string]!)) {
      if (!confere(d[campo], tipo)) return falha(`Arquivo inválido: despesas[${i}].${campo} ausente ou com tipo errado.`);
    }
    if (d.tipo === 'recorrente' && !FREQUENCIAS.has(d.frequencia as string)) {
      return falha(`Arquivo inválido: despesas[${i}].frequencia ausente ou com tipo errado.`);
    }
  }
  for (const [i, m] of (dados.meiosPagamento as Record<string, unknown>[]).entries()) {
    if (!TIPOS_MEIO.has(m.tipo as string)) return falha(`Arquivo inválido: meiosPagamento[${i}].tipo ausente ou com tipo errado.`);
  }
  const idsDespesas = new Set(despesas.map((d) => d.id as string));
  for (const l of dados.lancamentos as Record<string, unknown>[]) {
    if (!idsDespesas.has(l.despesaId as string)) {
      return falha(`Arquivo inválido: o lançamento "${l.id as string}" aponta para uma despesa que não existe.`);
    }
  }

  const configuracao: Configuracao =
    ehObjeto(dados.configuracao) && typeof dados.configuracao.versaoEsquema === 'number'
      ? {
          versaoEsquema: dados.configuracao.versaoEsquema,
          ...(typeof dados.configuracao.ultimoBackupEm === 'string' ? { ultimoBackupEm: dados.configuracao.ultimoBackupEm } : {}),
        }
      : { versaoEsquema: VERSAO_ESQUEMA };

  return {
    ok: true,
    arquivo: migrar({
      app: APP_ID,
      versao: json.versao as number,
      exportadoEm: typeof json.exportadoEm === 'string' ? json.exportadoEm : '',
      dados: { ...(dados as unknown as DadosBackup), configuracao },
    }),
  };
}

/** Converte backups de versões antigas para a atual. Hoje só existe a versão 1. */
function migrar(a: ArquivoBackup): ArquivoBackup {
  return { ...a, versao: VERSAO_BACKUP };
}

export function resumirBackup(a: ArquivoBackup): { despesas: number; lancamentos: number; exportadoEm: string } {
  return { despesas: a.dados.despesas.length, lancamentos: a.dados.lancamentos.length, exportadoEm: a.exportadoEm };
}

async function substituirTudo(base: JuliusDB, d: DadosBackup): Promise<void> {
  await Promise.all([
    base.categorias.clear(),
    base.marcas.clear(),
    base.meios.clear(),
    base.despesas.clear(),
    base.lancamentos.clear(),
    base.historico.clear(),
    base.config.clear(),
  ]);
  await base.categorias.bulkAdd(d.categorias);
  await base.marcas.bulkAdd(d.marcas);
  await base.meios.bulkAdd(d.meiosPagamento);
  await base.despesas.bulkAdd(d.despesas);
  await base.lancamentos.bulkAdd(d.lancamentos);
  await base.historico.bulkAdd(d.historico);
  await base.config.put({ ...d.configuracao, id: 'config' });
}

/** O arquivo é um backup: o último backup é o maior entre o registrado nele e a data da exportação. */
function comUltimoBackup(a: ArquivoBackup): DadosBackup {
  const datas = [a.dados.configuracao.ultimoBackupEm, a.exportadoEm].filter(
    (s): s is string => typeof s === 'string' && s !== '' && !Number.isNaN(Date.parse(s)),
  );
  if (datas.length === 0) return a.dados;
  const maior = datas.reduce((x, y) => (Date.parse(y) > Date.parse(x) ? y : x));
  return { ...a.dados, configuracao: { ...a.dados.configuracao, ultimoBackupEm: maior } };
}

/** Guarda uma cópia dos dados atuais e substitui tudo pelo arquivo. Tudo ou nada. */
export async function importar(base: JuliusDB, arquivo: ArquivoBackup): Promise<void> {
  await base.transaction('rw', base.tables, async () => {
    const atual = await exportar(base);
    const ultimo = await base.snapshots.orderBy('seq').last();
    await base.snapshots.add({
      id: crypto.randomUUID(),
      seq: (ultimo?.seq ?? 0) + 1,
      criadoEm: new Date().toISOString(),
      arquivo: atual,
    });
    const todos = await base.snapshots.orderBy('seq').toArray();
    const excesso = todos.slice(0, Math.max(0, todos.length - MAX_SNAPSHOTS));
    if (excesso.length > 0) await base.snapshots.bulkDelete(excesso.map((s) => s.id));
    await substituirTudo(base, comUltimoBackup(arquivo));
  });
}

export async function temImportacaoParaDesfazer(base: JuliusDB): Promise<boolean> {
  return (await base.snapshots.count()) > 0;
}

/** Quando foi guardada a cópia que "Desfazer importação" restauraria (a mais recente). */
export async function ultimaImportacao(base: JuliusDB): Promise<{ criadoEm: string } | null> {
  const ultimo = await base.snapshots.orderBy('seq').last();
  return ultimo ? { criadoEm: ultimo.criadoEm } : null;
}

export async function desfazerImportacao(base: JuliusDB): Promise<boolean> {
  return base.transaction('rw', base.tables, async () => {
    const ultimo = await base.snapshots.orderBy('seq').last();
    if (!ultimo) return false;
    await substituirTudo(base, ultimo.arquivo.dados);
    await base.snapshots.delete(ultimo.id);
    return true;
  });
}
