import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/cli-dados-iniciais';
import { lerBackup } from '../../src/dados/backup';
import type { DefinicaoInicial } from '../../src/dados/dadosIniciais';

const AGORA = new Date('2026-10-06T15:00:00.000Z'); // meio-dia em São Paulo

function definicao(): DefinicaoInicial {
  return {
    meios: [
      { id: 'mp-cartao', nome: 'Cartão Exemplo', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 },
      { id: 'mp-pix', nome: 'Pix', tipo: 'pix' },
    ],
    marcas: [{ id: 'marca-streaming', nome: 'Streaming Ação', apelidos: [], logoSlug: 'netflix' }],
    despesas: [
      {
        id: 'rec-streaming', tipo: 'recorrente', descricao: 'Streaming Ação ⟦teste⟧', categoriaId: 'cat-assinaturas',
        marcaId: 'marca-streaming', meioPagamentoId: 'mp-cartao', observacoes: '', aConfirmar: [],
        valor: 1990, valorVariavel: false, frequencia: 'mensal', inicio: '2026-10-20', pausas: [],
      },
      {
        id: 'parc-celular', tipo: 'parcelada', descricao: 'Celular', categoriaId: 'cat-compras', meioPagamentoId: 'mp-pix',
        dataCompra: '2025-12-15', observacoes: 'Pago via Pix', aConfirmar: ['vencimento', 'loja', 'valorTotal'],
        valorTotal: 540000, numParcelas: 12, valorParcela: 45000, mesPrimeira: '2026-10', comecaNaParcela: 11,
      },
    ],
    pagamentos: [{ lancamentoId: 'parc-celular#11', pagoEm: '2026-10-06' }],
  };
}

function preparar(conteudo: string | null) {
  const dir = mkdtempSync(join(tmpdir(), 'julius-'));
  const entrada = join(dir, 'definicao.json');
  if (conteudo !== null) writeFileSync(entrada, conteudo, { encoding: 'utf-8' });
  return { entrada, saida: join(dir, 'contas-iniciais.json') };
}

afterEach(() => vi.restoreAllMocks());

describe('CLI de dados iniciais', () => {
  it('gera um backup válido com acentos, pagamento e vencimento pelo cartão', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(JSON.stringify(definicao()));
    expect(main([entrada, saida], AGORA)).toBe(0);

    const r = lerBackup(readFileSync(saida, { encoding: 'utf-8' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { despesas, lancamentos, categorias, historico } = r.arquivo.dados;
    expect(despesas.find((d) => d.id === 'rec-streaming')!.descricao).toBe('Streaming Ação ⟦teste⟧');
    expect(categorias).toHaveLength(9);
    expect(lancamentos.find((l) => l.id === 'rec-streaming@2026-10')).toMatchObject({
      dataCobranca: '2026-10-20',
      vencimento: '2026-11-07',
      mes: '2026-11',
      valor: 1990,
    });
    expect(lancamentos.find((l) => l.id === 'parc-celular#11')).toMatchObject({ pagoEm: '2026-10-06', valorPago: 45000, mes: '2026-10' });
    expect(lancamentos.find((l) => l.id === 'parc-celular#12')).toMatchObject({ mes: '2026-11' });
    expect(lancamentos.find((l) => l.id === 'parc-celular#12')!.vencimento).toBeUndefined();
    expect(lancamentos.some((l) => l.id === 'parc-celular#10')).toBe(false);
    expect(historico.map((h) => h.acao)).toEqual(['importada', 'importada']);
  });

  it('arquivo ausente: código 1 e nada gravado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(null);
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith(`Arquivo não encontrado: ${entrada}`);
  });

  it('JSON corrompido: código 1 e nada gravado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar('{ quebrado');
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith(`JSON inválido: ${entrada}`);
  });

  it('pagamento de lançamento inexistente: código 1 com motivo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.pagamentos = [{ lancamentoId: 'nada#1', pagoEm: '2026-10-06' }];
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Pagamento aponta para lançamento inexistente: nada#1');
  });

  it('categoria desconhecida: código 1 com motivo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.despesas[1]!.categoriaId = 'cat-nao-existe';
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Categoria desconhecida em "Celular": cat-nao-existe');
  });

  it('meio de pagamento desconhecido: código 1 com motivo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.despesas[1]!.meioPagamentoId = 'mp-nao-existe';
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Meio de pagamento desconhecido em "Celular": mp-nao-existe');
  });

  it('validador do app reprova (ID repetido): código 1, mensagem do validador e nada gravado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.despesas.push({ ...def.despesas[0]! });
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Arquivo inválido: ID repetido em despesas ("rec-streaming").');
  });

  it('falha ao gravar: código 1 e erro informado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(JSON.stringify(definicao()));
    const impossivel = join(dirname(saida), 'pasta-que-nao-existe', 'saida.json');
    expect(main([entrada, impossivel], AGORA)).toBe(1);
    expect(erro).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['null', 'null'],
    ['lista', '[]'],
    ['sem pagamentos', JSON.stringify({ meios: [], marcas: [], despesas: [] })],
  ])('definição com formato errado (%s): código 1 e nada gravado', (_nome, conteudo) => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(conteudo);
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Definição inválida: esperado um objeto com as listas meios, marcas, despesas e pagamentos.');
  });

  it('entrada que é uma pasta: não consegue ler, não é JSON inválido', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(null);
    const pasta = dirname(entrada);
    expect(main([pasta, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith(`Não foi possível ler: ${pasta}`);
  });
});
