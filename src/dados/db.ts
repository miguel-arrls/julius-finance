import Dexie, { type Table } from 'dexie';
import type {
  Categoria,
  Configuracao,
  Despesa,
  Lancamento,
  Marca,
  MeioPagamento,
  RegistroHistorico,
} from '../dominio/tipos';

export const VERSAO_ESQUEMA = 1;

export interface RegistroConfig extends Configuracao {
  id: 'config';
}

export interface DadosBackup {
  categorias: Categoria[];
  marcas: Marca[];
  meiosPagamento: MeioPagamento[];
  despesas: Despesa[];
  lancamentos: Lancamento[];
  historico: RegistroHistorico[];
  configuracao: Configuracao;
}

export interface ArquivoBackup {
  app: 'julius-finance';
  versao: number;
  exportadoEm: string;
  dados: DadosBackup;
}

/** Cópia dos dados guardada antes de cada importação, para "Desfazer importação". */
export interface Snapshot {
  id: string;
  seq: number;
  criadoEm: string;
  arquivo: ArquivoBackup;
}

export class JuliusDB extends Dexie {
  declare categorias: Table<Categoria, string>;
  declare marcas: Table<Marca, string>;
  declare meios: Table<MeioPagamento, string>;
  declare despesas: Table<Despesa, string>;
  declare lancamentos: Table<Lancamento, string>;
  declare historico: Table<RegistroHistorico, string>;
  declare config: Table<RegistroConfig, string>;
  declare snapshots: Table<Snapshot, string>;

  constructor(nome = 'julius') {
    super(nome);
    this.version(1).stores({
      categorias: 'id, ordem',
      marcas: 'id',
      meios: 'id',
      despesas: 'id, tipo',
      lancamentos: 'id, despesaId, mes',
      historico: 'id, despesaId, quando',
      config: 'id',
      snapshots: 'id, seq',
    });
  }
}

export const db = new JuliusDB();
