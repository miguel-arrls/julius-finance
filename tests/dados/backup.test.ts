import { beforeEach, describe, expect, it } from 'vitest';
import {
  desfazerImportacao,
  exportar,
  importar,
  lerBackup,
  nomeArquivoBackup,
  resumirBackup,
  serializar,
  temImportacaoParaDesfazer,
} from '../../src/dados/backup';
import { JuliusDB, type ArquivoBackup } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { avulsa, CARTAO, parcelada, recorrente } from '../fabricas';

const HOJE = '2026-10-06';
const novaBase = async () => {
  const b = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await b.open();
  return b;
};

async function popular(base: JuliusDB): Promise<void> {
  await repo.inicializarPadrao(base);
  await repo.salvarMeio(base, CARTAO, HOJE);
  await repo.salvarMarca(base, { id: 'm1', nome: 'Padaria São João', apelidos: ['Pão ⟦quente⟧'] });
  await repo.salvarDespesa(base, avulsa({ descricao: 'Açaí & Cia — ção ⟦⟧', marcaId: 'm1', observacoes: 'aspas "duplas"\nlinha 2' }), { hoje: HOJE });
  await repo.salvarDespesa(base, recorrente({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
  await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
  await repo.marcarPaga(base, 'pa1#1', HOJE);
}

function arquivoValido(): Record<string, any> {
  return {
    app: 'julius-finance',
    versao: 1,
    exportadoEm: '2026-10-06T12:00:00.000Z',
    dados: {
      categorias: [{ id: 'c', nome: 'Outros', cor: '#000000', icone: 'dots', ordem: 1 }],
      marcas: [],
      meiosPagamento: [],
      despesas: [{ ...avulsa({ id: 'd', categoriaId: 'c' }) }],
      lancamentos: [{ id: 'd#1', despesaId: 'd', mes: '2026-10', valor: 10000, estimado: false }],
      historico: [],
      configuracao: { versaoEsquema: 1 },
    },
  };
}

let base: JuliusDB;
beforeEach(async () => {
  base = await novaBase();
});

describe('exportar e importar', () => {
  it('round-trip preserva tudo, inclusive acentos e caracteres especiais', async () => {
    await popular(base);
    const original = await exportar(base, '2026-10-06T12:00:00.000Z');
    const lido = lerBackup(serializar(original));
    expect(lido.ok).toBe(true);
    const destino = await novaBase();
    await importar(destino, (lido as { ok: true; arquivo: ArquivoBackup }).arquivo);
    const copia = await exportar(destino, '2026-10-06T12:00:00.000Z');
    expect(copia.dados).toEqual(original.dados);
    expect(copia.dados.despesas.find((d) => d.id === 'av1')!.descricao).toBe('Açaí & Cia — ção ⟦⟧');
  });

  it('importação que falha no meio não altera nada', async () => {
    await popular(base);
    const antes = await exportar(base, 'x');
    const ruim = arquivoValido() as ArquivoBackup;
    ruim.dados.lancamentos.push({ ...ruim.dados.lancamentos[0]! }); // ID repetido: bulkAdd falha
    await expect(importar(base, ruim)).rejects.toBeDefined();
    expect((await exportar(base, 'x')).dados).toEqual(antes.dados);
    expect(await temImportacaoParaDesfazer(base)).toBe(false);
  });

  it('desfazer importação restaura os dados anteriores', async () => {
    await popular(base);
    const antes = await exportar(base, 'x');
    await importar(base, lerBackupOk(JSON.stringify(arquivoValido())));
    expect(await base.despesas.count()).toBe(1);
    expect(await desfazerImportacao(base)).toBe(true);
    expect((await exportar(base, 'x')).dados).toEqual(antes.dados);
    expect(await desfazerImportacao(base)).toBe(false);
  });

  it('guarda no máximo 3 cópias para desfazer', async () => {
    for (let i = 0; i < 4; i++) await importar(base, lerBackupOk(JSON.stringify(arquivoValido())));
    expect(await base.snapshots.count()).toBe(3);
  });
});

function lerBackupOk(texto: string): ArquivoBackup {
  const r = lerBackup(texto);
  if (!r.ok) throw new Error(r.erro);
  return r.arquivo;
}

describe('lerBackup rejeita arquivos ruins com mensagem clara', () => {
  const casos: [string, (a: Record<string, any>) => unknown, string][] = [
    ['JSON quebrado', () => '{ isto não é json', 'O arquivo não é um JSON válido.'],
    ['outro app', (a) => ({ ...a, app: 'outro' }), 'Este arquivo não é um backup do Julius.'],
    ['sem versão', (a) => ({ ...a, versao: undefined }), 'Versão do backup ausente.'],
    [
      'versão futura',
      (a) => ({ ...a, versao: 2 }),
      'Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.',
    ],
    ['sem dados', (a) => ({ ...a, dados: undefined }), 'Arquivo incompleto: faltam os dados.'],
    ['sem despesas', (a) => ({ ...a, dados: { ...a.dados, despesas: undefined } }), 'Arquivo incompleto: falta a lista "despesas".'],
    [
      'descrição numérica',
      (a) => ({ ...a, dados: { ...a.dados, despesas: [{ ...a.dados.despesas[0], descricao: 5 }] } }),
      'Arquivo inválido: despesas[0].descricao ausente ou com tipo errado.',
    ],
    [
      'valor com centavos fracionados',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [{ ...a.dados.lancamentos[0], valor: 10.5 }] } }),
      'Arquivo inválido: lancamentos[0].valor ausente ou com tipo errado.',
    ],
    [
      'tipo de despesa desconhecido',
      (a) => ({ ...a, dados: { ...a.dados, despesas: [{ ...a.dados.despesas[0], tipo: 'xyz' }] } }),
      'Arquivo inválido: despesas[0].tipo ausente ou com tipo errado.',
    ],
    [
      'lançamento órfão',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [{ ...a.dados.lancamentos[0], despesaId: 'nada' }] } }),
      'Arquivo inválido: o lançamento "d#1" aponta para uma despesa que não existe.',
    ],
    ['versão zero', (a) => ({ ...a, versao: 0 }), 'Versão do backup ausente.'],
    [
      'parcelada sem numParcelas',
      (a) => {
        const { numParcelas: _n, ...resto } = parcelada({ id: 'd', categoriaId: 'c' });
        return { ...a, dados: { ...a.dados, despesas: [resto] } };
      },
      'Arquivo inválido: despesas[0].numParcelas ausente ou com tipo errado.',
    ],
    [
      'recorrente com frequência desconhecida',
      (a) => ({
        ...a,
        dados: { ...a.dados, despesas: [{ ...recorrente({ id: 'd', categoriaId: 'c' }), frequencia: 'diaria' }] },
      }),
      'Arquivo inválido: despesas[0].frequencia ausente ou com tipo errado.',
    ],
    [
      'lançamento com vencimento inexistente',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [{ ...a.dados.lancamentos[0], vencimento: '2026-13-01' }] } }),
      'Arquivo inválido: lancamentos[0].vencimento ausente ou com tipo errado.',
    ],
    [
      'meio com tipo desconhecido',
      (a) => ({ ...a, dados: { ...a.dados, meiosPagamento: [{ id: 'x', nome: 'Talão', tipo: 'cheque' }] } }),
      'Arquivo inválido: meiosPagamento[0].tipo ausente ou com tipo errado.',
    ],
    [
      'despesa com data de compra inválida',
      (a) => ({ ...a, dados: { ...a.dados, despesas: [{ ...a.dados.despesas[0], dataCompra: 'ontem' }] } }),
      'Arquivo inválido: despesas[0].dataCompra ausente ou com tipo errado.',
    ],
    [
      'ID repetido',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [a.dados.lancamentos[0], a.dados.lancamentos[0]] } }),
      'Arquivo inválido: ID repetido em lancamentos ("d#1").',
    ],
  ];

  it.each(casos)('%s', (_nome, alterar, mensagem) => {
    const r = alterar(arquivoValido());
    const texto = typeof r === 'string' ? r : JSON.stringify(r);
    expect(lerBackup(texto)).toEqual({ ok: false, erro: mensagem });
  });

  it('aceita arquivo válido sem configuração, usando o padrão', () => {
    const a = arquivoValido();
    delete a.dados.configuracao;
    const r = lerBackup(JSON.stringify(a));
    expect(r.ok && r.arquivo.dados.configuracao).toEqual({ versaoEsquema: 1 });
  });
});

describe('auxiliares', () => {
  it('resumirBackup e nomeArquivoBackup', () => {
    expect(resumirBackup(lerBackupOk(JSON.stringify(arquivoValido())))).toEqual({
      despesas: 1,
      lancamentos: 1,
      exportadoEm: '2026-10-06T12:00:00.000Z',
    });
    expect(nomeArquivoBackup('2026-10-06')).toBe('julius-backup-2026-10-06.json');
  });
});
