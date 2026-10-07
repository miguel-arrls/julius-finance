import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { pausar } from '../../src/dominio/recorrencias';
import { ErroDominio } from '../../src/dominio/tipos';
import { avulsa, CARTAO, parcelada, PIX, recorrente } from '../fabricas';

const HOJE = '2026-10-06';
let base: JuliusDB;

afterEach(() => vi.restoreAllMocks());

beforeEach(async () => {
  base = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await base.open();
});

const lancs = (despesaId: string) => base.lancamentos.where('despesaId').equals(despesaId).sortBy('id');
const acoes = async (despesaId: string) =>
  (await base.historico.where('despesaId').equals(despesaId).toArray()).map((h) => h.acao).sort();

describe('salvarDespesa', () => {
  it('cria parcelada com parcelas e histórico "criada"', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    expect((await lancs('pa1')).map((l) => l.id)).toEqual(['pa1#1', 'pa1#2', 'pa1#3']);
    expect(await acoes('pa1')).toEqual(['criada']);
    expect((await base.despesas.get('pa1'))!.criadaEm).not.toBe('');
  });

  it('editar preserva a parcela paga, não duplica e registra o que mudou', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#1', '2026-11-09');
    await repo.salvarDespesa(base, parcelada({ valorTotal: 120000 }), { hoje: HOJE });
    const ls = await lancs('pa1');
    expect(ls.map((l) => [l.id, l.valor, l.pagoEm])).toEqual([
      ['pa1#1', 33334, '2026-11-09'],
      ['pa1#2', 40000, undefined],
      ['pa1#3', 40000, undefined],
    ]);
    const editada = (await base.historico.where('despesaId').equals('pa1').toArray()).find((h) => h.acao === 'editada')!;
    expect(editada.mudancas).toEqual([{ campo: 'valorTotal', de: 100000, para: 120000 }]);
  });

  it('edição inválida é rejeitada e o banco fica intacto', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#3', '2026-11-09');
    const tentativa = repo.salvarDespesa(base, parcelada({ numParcelas: 2 }), { hoje: HOJE });
    await expect(tentativa).rejects.toBeInstanceOf(ErroDominio);
    await expect(tentativa).rejects.toThrow('Já existe pagamento na parcela 3. O número de parcelas não pode ser menor que 3.');
    expect((await base.despesas.get('pa1'))!).toMatchObject({ numParcelas: 3 });
    expect(await lancs('pa1')).toHaveLength(3);
    expect(await acoes('pa1')).toEqual(['criada', 'paga']);
  });

  it('falha depois das escritas desfaz tudo (despesa, lançamentos e histórico)', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#1', '2026-11-09');
    await base.historico.add({ id: 'colide', despesaId: 'x', quando: 'q', acao: 'criada', mudancas: [] });
    const despesaAntes = await base.despesas.get('pa1');
    const lancsAntes = await lancs('pa1');
    const histAntes = await base.historico.toArray();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('colide' as ReturnType<typeof crypto.randomUUID>);
    await expect(repo.salvarDespesa(base, parcelada({ valorTotal: 120000 }), { hoje: HOJE })).rejects.toBeDefined();
    vi.restoreAllMocks();
    expect(await base.despesas.get('pa1')).toEqual(despesaAntes);
    expect(await lancs('pa1')).toEqual(lancsAntes);
    expect(await base.historico.toArray()).toEqual(histAntes);
  });

  it('não permite mudar o tipo', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'x' }), { hoje: HOJE });
    await expect(repo.salvarDespesa(base, recorrente({ id: 'x' }), { hoje: HOJE })).rejects.toThrow(
      'Não é possível mudar o tipo de uma despesa já cadastrada.',
    );
  });

  it('rejeita descrição vazia', async () => {
    await expect(repo.salvarDespesa(base, avulsa({ descricao: '   ' }), { hoje: HOJE })).rejects.toThrow('Informe a descrição.');
    expect(await base.despesas.count()).toBe(0);
  });

  it('acentos e caracteres especiais sobrevivem à gravação', async () => {
    const d = avulsa({ descricao: 'Açaí & Cia — ção ⟦⟧', observacoes: 'Pão de queijo "artesanal"\nsegunda linha' });
    await repo.salvarDespesa(base, d, { hoje: HOJE });
    const lida = (await base.despesas.get('av1'))!;
    expect(lida.descricao).toBe('Açaí & Cia — ção ⟦⟧');
    expect(lida.observacoes).toBe('Pão de queijo "artesanal"\nsegunda linha');
  });
});

describe('recorrências no banco', () => {
  it('materializarTodas é idempotente e avança com o tempo', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    expect(await base.lancamentos.count()).toBe(13);
    await repo.materializarTodas(base, HOJE);
    await repo.materializarTodas(base, HOJE);
    expect(await base.lancamentos.count()).toBe(13);
    await repo.materializarTodas(base, '2026-12-06');
    expect(await base.lancamentos.count()).toBe(15);
  });

  it('materializarTodas devolve os ids ignorados por registro inválido', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    await base.despesas.put(recorrente({ id: 'invalida', valor: 0 }));
    expect(await repo.materializarTodas(base, HOJE)).toEqual(['invalida']);
    expect(await lancs('re1')).toHaveLength(13);
  });

  it('editar o valor de um mês estimado confirma o valor e não volta atrás', async () => {
    await repo.salvarDespesa(base, recorrente({ valorVariavel: true }), { hoje: HOJE });
    await repo.editarLancamento(base, 're1@2026-11', { valor: 4512 });
    await repo.materializarTodas(base, HOJE);
    expect(await base.lancamentos.get('re1@2026-11')).toMatchObject({ valor: 4512, estimado: false });
    expect(await base.lancamentos.get('re1@2026-12')).toMatchObject({ valor: 3990, estimado: true });
  });

  it('editarLancamento rejeita valor zero', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    await expect(repo.editarLancamento(base, 're1@2026-11', { valor: 0 })).rejects.toThrow('Informe um valor maior que zero.');
  });

  it('pausar remove as futuras não pagas e registra no histórico', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    await repo.alterarRecorrencia(base, 're1', (r) => pausar(r, '2026-12-01'), 'pausada', HOJE);
    expect((await lancs('re1')).map((l) => l.id)).toEqual(['re1@2026-10', 're1@2026-11']);
    expect(await acoes('re1')).toEqual(['criada', 'pausada']);
  });
});

async function erroDe(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (e) {
    return e;
  }
  throw new Error('Era esperado que rejeitasse');
}

describe('editarPagamento', () => {
  beforeEach(async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    await repo.marcarPaga(base, 'av1#1', HOJE);
  });

  it('corrige a data e o valor pagos e registra no histórico, sem tocar valor e vencimento', async () => {
    await repo.editarPagamento(base, 'av1#1', { pagoEm: '2026-10-03', valorPago: 9876 });
    expect(await base.lancamentos.get('av1#1')).toEqual({
      id: 'av1#1',
      despesaId: 'av1',
      mes: '2026-10',
      vencimento: '2026-10-10',
      valor: 10000,
      estimado: false,
      pagoEm: '2026-10-03',
      valorPago: 9876,
    });
    const editadas = (await base.historico.where('despesaId').equals('av1').toArray()).filter((h) => h.acao === 'editada');
    expect(editadas).toHaveLength(1);
    expect(editadas[0]!.lancamentoId).toBe('av1#1');
    expect(editadas[0]!.mudancas).toEqual([
      { campo: 'pagoEm', de: HOJE, para: '2026-10-03' },
      { campo: 'valorPago', de: 10000, para: 9876 },
    ]);
  });

  it('sem mudança não grava histórico', async () => {
    await repo.editarPagamento(base, 'av1#1', { pagoEm: HOJE, valorPago: 10000 });
    expect(await acoes('av1')).toEqual(['criada', 'paga']);
  });

  it.each([
    ['lançamento não pago', 'nao-pago', { pagoEm: '2026-10-03', valorPago: 9876 }, 'Este lançamento não está pago.'],
    ['data inválida', 'av1#1', { pagoEm: '2026-02-30', valorPago: 9876 }, 'Data inválida.'],
    ['data vazia', 'av1#1', { pagoEm: '', valorPago: 9876 }, 'Data inválida.'],
    ['valor zero', 'av1#1', { pagoEm: '2026-10-03', valorPago: 0 }, 'Informe um valor maior que zero.'],
    ['valor negativo', 'av1#1', { pagoEm: '2026-10-03', valorPago: -5 }, 'Informe um valor maior que zero.'],
    ['valor fracionário', 'av1#1', { pagoEm: '2026-10-03', valorPago: 10.5 }, 'Informe um valor maior que zero.'],
  ])('rejeita %s sem gravar nada', async (_caso, id, campos, mensagem) => {
    await repo.salvarDespesa(base, avulsa({ id: 'nao-pago' }), { hoje: HOJE });
    const antes = await base.lancamentos.toArray();
    const historicoAntes = await base.historico.count();
    const alvo = id === 'nao-pago' ? 'nao-pago#1' : id;
    const e = await erroDe(repo.editarPagamento(base, alvo, campos));
    expect(e).toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe(mensagem);
    expect(await base.lancamentos.toArray()).toEqual(antes);
    expect(await base.historico.count()).toBe(historicoAntes);
  });

  it('rejeita lançamento inexistente', async () => {
    const e = await erroDe(repo.editarPagamento(base, 'inexistente', { pagoEm: '2026-10-03', valorPago: 9876 }));
    expect(e).toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe('Lançamento não encontrado.');
  });
});

describe('pagamentos', () => {
  it('marcar e desfazer gravam histórico', async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    await repo.marcarPaga(base, 'av1#1', HOJE);
    expect(await base.lancamentos.get('av1#1')).toMatchObject({ pagoEm: HOJE, valorPago: 10000 });
    await repo.desfazerPagamento(base, 'av1#1');
    const l = (await base.lancamentos.get('av1#1'))!;
    expect(l.pagoEm).toBeUndefined();
    expect(l.valorPago).toBeUndefined();
    expect(await acoes('av1')).toEqual(['criada', 'paga', 'pagamento desfeito']);
  });

  it('marcarVariosPagos com id inexistente rejeita e não grava nada', async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    await expect(repo.marcarVariosPagos(base, ['av1#1', 'inexistente'], HOJE)).rejects.toThrow('Lançamento não encontrado.');
    expect((await base.lancamentos.get('av1#1'))!.pagoEm).toBeUndefined();
    expect(await acoes('av1')).toEqual(['criada']);
  });

  it('pagar e desfazer não alteram valor, vencimento, mês nem estimado', async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    const base0 = (await base.lancamentos.get('av1#1'))!;
    const fixos = (l: typeof base0) => [l.valor, l.vencimento, l.mes, l.estimado];
    await repo.marcarPaga(base, 'av1#1', HOJE);
    expect(fixos((await base.lancamentos.get('av1#1'))!)).toEqual(fixos(base0));
    await repo.desfazerPagamento(base, 'av1#1');
    expect(fixos((await base.lancamentos.get('av1#1'))!)).toEqual(fixos(base0));
  });

  it('marcarPaga com valorPago explícito grava esse valor', async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    await repo.marcarPaga(base, 'av1#1', HOJE, 10500);
    expect(await base.lancamentos.get('av1#1')).toMatchObject({ valor: 10000, valorPago: 10500, pagoEm: HOJE });
  });

  it('marcarVariosPagos marca a fatura inteira', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, recorrente({ id: 'r1', meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.salvarDespesa(base, recorrente({ id: 'r2', meioPagamentoId: CARTAO.id, valor: 1500 }), { hoje: HOJE });
    await repo.marcarVariosPagos(base, ['r1@2026-10', 'r2@2026-10'], '2026-11-07');
    expect((await base.lancamentos.bulkGet(['r1@2026-10', 'r2@2026-10'])).map((l) => l!.pagoEm)).toEqual([
      '2026-11-07',
      '2026-11-07',
    ]);
  });
});

describe('excluirDespesa', () => {
  it('apaga só a despesa escolhida, com lançamentos e histórico', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'a1' }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'a2' }), { hoje: HOJE });
    await repo.marcarPaga(base, 'a1#1', HOJE);
    expect(await repo.contarLancamentos(base, 'a1')).toEqual({ total: 1, pagos: 1 });
    await repo.excluirDespesa(base, 'a1');
    expect(await base.despesas.get('a1')).toBeUndefined();
    expect(await lancs('a1')).toEqual([]);
    expect(await acoes('a1')).toEqual([]);
    expect(await base.despesas.get('a2')).toBeDefined();
    expect(await lancs('a2')).toHaveLength(1);
    expect(await acoes('a2')).toEqual(['criada']);
  });
});

describe('cadastros', () => {
  it('inicializarPadrao cria as categorias uma vez só', async () => {
    await repo.inicializarPadrao(base);
    await repo.inicializarPadrao(base);
    expect(await base.categorias.count()).toBe(9);
    expect((await repo.obterConfig(base)).versaoEsquema).toBe(1);
  });

  it('salvarCategoria rejeita nome vazio e repetido (sem acento/caixa)', async () => {
    await repo.inicializarPadrao(base);
    await expect(repo.salvarCategoria(base, { id: 'n', nome: ' ', cor: '#000000', icone: 'dots', ordem: 10 })).rejects.toThrow(
      'Informe o nome.',
    );
    await expect(repo.salvarCategoria(base, { id: 'n', nome: 'SAUDE', cor: '#000000', icone: 'dots', ordem: 10 })).rejects.toThrow(
      'Já existe uma categoria com esse nome.',
    );
  });

  it('excluirCategoria em uso exige substituta e move as despesas', async () => {
    await repo.inicializarPadrao(base);
    await repo.salvarDespesa(base, avulsa({ categoriaId: 'cat-saude' }), { hoje: HOJE });
    await expect(repo.excluirCategoria(base, 'cat-saude')).rejects.toThrow('Escolha outra categoria para as despesas que usam esta.');
    await repo.salvarDespesa(base, avulsa({ id: 'vizinha', categoriaId: 'cat-lazer' }), { hoje: HOJE });
    const vizinhaAntes = await base.despesas.get('vizinha');
    const histVizinha = await base.historico.where('despesaId').equals('vizinha').toArray();
    await repo.excluirCategoria(base, 'cat-saude', 'cat-outros');
    const movida = (await base.despesas.get('av1'))!;
    expect(movida.categoriaId).toBe('cat-outros');
    expect(await base.categorias.get('cat-saude')).toBeUndefined();
    const editada = (await base.historico.where('despesaId').equals('av1').toArray()).filter((h) => h.acao === 'editada');
    expect(editada).toHaveLength(1);
    expect(editada[0]!.mudancas).toEqual([{ campo: 'categoriaId', de: 'cat-saude', para: 'cat-outros' }]);
    expect(movida.atualizadaEm).toBe(editada[0]!.quando);
    expect(await base.despesas.get('vizinha')).toEqual(vizinhaAntes);
    expect(await base.historico.where('despesaId').equals('vizinha').toArray()).toEqual(histVizinha);
  });

  it('excluirCategoria rejeita substituta igual ao id ou inexistente', async () => {
    await repo.inicializarPadrao(base);
    await repo.salvarDespesa(base, avulsa({ categoriaId: 'cat-saude' }), { hoje: HOJE });
    const msg = 'Escolha outra categoria para as despesas que usam esta.';
    await expect(repo.excluirCategoria(base, 'cat-saude', 'cat-saude')).rejects.toThrow(msg);
    await expect(repo.excluirCategoria(base, 'cat-saude', 'nao-existe')).rejects.toThrow(msg);
    expect(await base.categorias.get('cat-saude')).toBeDefined();
    expect((await base.despesas.get('av1'))!.categoriaId).toBe('cat-saude');
  });

  it('excluirCategoria recusa excluir a última categoria', async () => {
    await repo.salvarCategoria(base, { id: 'unica', nome: 'Única', cor: '#000000', icone: 'dots', ordem: 1 });
    await expect(repo.excluirCategoria(base, 'unica')).rejects.toThrow('Mantenha pelo menos uma categoria.');
    expect(await base.categorias.count()).toBe(1);
  });

  it('excluirMarca tira a marca das despesas', async () => {
    await repo.salvarMarca(base, { id: 'm1', nome: 'Loja', apelidos: [' Lojinha ', ''] });
    expect((await base.marcas.get('m1'))!.apelidos).toEqual(['Lojinha']);
    await repo.salvarDespesa(base, avulsa({ marcaId: 'm1' }), { hoje: HOJE });
    await repo.salvarMarca(base, { id: 'm2', nome: 'Outra', apelidos: [] });
    await repo.salvarDespesa(base, avulsa({ id: 'vizinha', marcaId: 'm2' }), { hoje: HOJE });
    const vizinhaAntes = await base.despesas.get('vizinha');
    await repo.excluirMarca(base, 'm1');
    expect((await base.despesas.get('av1'))!.marcaId).toBeUndefined();
    const editada = (await base.historico.where('despesaId').equals('av1').toArray()).find((h) => h.acao === 'editada')!;
    expect(editada.mudancas).toEqual([{ campo: 'marcaId', de: 'm1', para: null }]);
    expect(await base.despesas.get('vizinha')).toEqual(vizinhaAntes);
    expect(await acoes('vizinha')).toEqual(['criada']);
  });

  it('salvarMeio valida os dias e recalcula vencimentos futuros não pagos', async () => {
    await expect(repo.salvarMeio(base, { ...CARTAO, diaFechamento: 32 }, HOJE)).rejects.toThrow('Informe um dia entre 1 e 31.');
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, recorrente({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    expect((await base.lancamentos.get('re1@2026-10'))!.vencimento).toBe('2026-11-07');
    await repo.salvarMeio(base, { ...CARTAO, diaVencimento: 10 }, HOJE);
    expect((await base.lancamentos.get('re1@2026-10'))!.vencimento).toBe('2026-11-10');
  });

  it('salvarMeio preserva valor confirmado e parcela paga ao mudar os dias', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, recorrente({ valorVariavel: true, meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.editarLancamento(base, 're1@2026-11', { valor: 4512 });
    await repo.marcarPaga(base, 're1@2026-10', '2026-11-07');
    const paga = await base.lancamentos.get('re1@2026-10');
    await repo.salvarMeio(base, { ...CARTAO, diaVencimento: 10 }, HOJE);
    expect(await base.lancamentos.get('re1@2026-10')).toEqual(paga);
    const depois = (await base.lancamentos.get('re1@2026-11'))!;
    expect(depois).toMatchObject({ valor: 4512, estimado: false });
    expect(depois.vencimento).toBe('2026-12-10');
    expect(depois.mes).toBe('2026-12');
    expect((await base.lancamentos.get('re1@2026-10'))!.vencimento).toBe('2026-11-07');
  });

  it('excluirMeio tira o meio das despesas', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, avulsa({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.salvarMeio(base, PIX, HOJE);
    await repo.salvarDespesa(base, avulsa({ id: 'vizinha', meioPagamentoId: PIX.id }), { hoje: HOJE });
    const vizinhaAntes = await base.despesas.get('vizinha');
    await repo.excluirMeio(base, CARTAO.id);
    expect((await base.despesas.get('av1'))!.meioPagamentoId).toBeUndefined();
    const editada = (await base.historico.where('despesaId').equals('av1').toArray()).find((h) => h.acao === 'editada')!;
    expect(editada.mudancas).toEqual([{ campo: 'meioPagamentoId', de: CARTAO.id, para: null }]);
    expect(await base.despesas.get('vizinha')).toEqual(vizinhaAntes);
    expect(await acoes('vizinha')).toEqual(['criada']);
  });

  it('registrarBackup grava a data', async () => {
    await repo.registrarBackup(base, '2026-10-06T12:00:00.000Z');
    expect((await repo.obterConfig(base)).ultimoBackupEm).toBe('2026-10-06T12:00:00.000Z');
  });
});
