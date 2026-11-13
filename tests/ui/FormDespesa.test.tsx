import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { FormDespesa } from '../../src/ui/telas/FormDespesa';
import { CARTAO, avulsa, recorrente } from '../fabricas';
import { ComEstado, HOJE, SEM_NORMALIZAR, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  location.hash = '';
});

async function abrir(id?: string) {
  renderizar(<ComEstado filho={(e) => <FormDespesa estado={e} id={id} />} />, base);
  await screen.findByRole('heading', { name: id ? 'Editar despesa' : 'Nova despesa' });
}

const digitar = (rotulo: string, valor: string) => fireEvent.input(screen.getByLabelText(rotulo), { target: { value: valor } });
const escolher = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
const escolherMeio = (nome: string) => fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${nome}`) }));

describe('FormDespesa', () => {
  it('cadastra uma despesa avulsa e abre o detalhe', async () => {
    await abrir();
    digitar('Descrição', 'Conta de luz');
    escolher('Categoria', 'cat-moradia');
    digitar('Valor', '120,50');
    digitar('Vencimento', '2026-10-20');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    const d = (await base.despesas.toArray())[0]!;
    expect((await base.lancamentos.get(`${d.id}#1`))!.valor).toBe(12050);
    expect(location.hash).toBe(`#/despesas/${d.id}`);
  });

  it('mostra os erros e não salva', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    expect(await screen.findByText('Informe a descrição.')).toBeInTheDocument();
    expect(screen.getByText('Escolha uma categoria.')).toBeInTheDocument();
    expect(await base.despesas.count()).toBe(0);
  });

  it('dois toques em salvar criam uma despesa e uma marca só', async () => {
    await abrir();
    digitar('Descrição', 'Netflix família');
    escolher('Categoria', 'cat-assinaturas');
    digitar('Valor', '44,90');
    const botao = screen.getByRole('button', { name: 'Salvar despesa' });
    fireEvent.click(botao);
    fireEvent.click(botao);
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(await base.despesas.count()).toBe(1);
    // Sem a trava, cada toque criaria a sua marca "Netflix".
    expect(await base.marcas.count()).toBe(1);
  });

  it('parcelada mostra a prévia das parcelas', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Parcelada' }));
    digitar('Descrição', 'Notebook');
    escolher('Categoria', 'cat-compras');
    digitar('Valor total', '1.200,00');
    digitar('Número de parcelas', '3');
    digitar('1º vencimento', '2026-11-10');
    const previa = screen.getByRole('region', { name: 'Parcelas que serão geradas' });
    expect(within(previa).getAllByText('R$\u00a0400,00', SEM_NORMALIZAR)).toHaveLength(3);
  });

  it('editar recorrente aplica o novo valor a partir do mês escolhido', async () => {
    await repo.salvarDespesa(base, recorrente({ id: 'r', descricao: 'Streaming', categoriaId: 'cat-assinaturas' }), { hoje: HOJE });
    await abrir('r');
    digitar('Valor', '49,90');
    escolher('Aplicar a mudança a partir de', '2027-01');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect((await base.lancamentos.get('r@2027-01'))!.valor).toBe(4990));
    expect((await base.lancamentos.get('r@2026-12'))!.valor).toBe(3990);
  });

  it('nome de marca conhecida na descrição cria a marca com logo', async () => {
    await abrir();
    digitar('Descrição', 'Netflix família');
    escolher('Categoria', 'cat-assinaturas');
    digitar('Valor', '44,90');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.marcas.count()).toBe(1));
    expect((await base.marcas.toArray())[0]).toMatchObject({ nome: 'Netflix', logoSlug: 'netflix' });
  });
});

describe('FormDespesa: vencimento pela fatura do cartão', () => {
  beforeEach(async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
  });

  const preencherAvulsa = () => {
    digitar('Descrição', 'Tênis');
    escolher('Categoria', 'cat-compras');
    digitar('Valor', '300,00');
  };
  const salvar = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    return (await base.despesas.toArray())[0]!;
  };

  it('avulsa no cartão: esconde o vencimento e mostra a fatura que a data da compra decide', async () => {
    await abrir();
    expect(screen.getByLabelText('Vencimento')).toBeInTheDocument();
    escolherMeio(CARTAO.nome);
    expect(screen.queryByLabelText('Vencimento')).toBeNull();
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByText('Vence 07/11/2026, na fatura do Cartão Teste.')).toBeInTheDocument();
    digitar('Data da compra (opcional)', '2026-10-01');
    expect(screen.getByText('Vence 07/10/2026, na fatura do Cartão Teste.')).toBeInTheDocument();
    preencherAvulsa();
    expect(await salvar()).toMatchObject({ vencimento: '2026-10-07', dataCompra: '2026-10-01', aConfirmar: [] });
  });

  it('sem data da compra: escolhe o mês da fatura e não fica "a confirmar"', async () => {
    await abrir();
    escolherMeio(CARTAO.nome);
    expect(screen.queryByLabelText('Mês de referência')).toBeNull();
    digitar('Fatura de', '2026-12');
    expect(screen.getByText('Vence 07/12/2026, na fatura do Cartão Teste.')).toBeInTheDocument();
    preencherAvulsa();
    expect(await salvar()).toMatchObject({ vencimento: '2026-12-07', aConfirmar: [] });
  });

  it('parcelada em andamento: a data da compra original dá o vencimento da parcela inicial', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Parcelada' }));
    escolherMeio(CARTAO.nome);
    expect(screen.queryByLabelText('1º vencimento')).toBeNull();
    digitar('Número de parcelas', '12');
    digitar('Começa na parcela', '11');
    expect(screen.getByLabelText('Fatura da parcela 11')).toBeInTheDocument();
    digitar('Data da compra (opcional)', '2026-01-01');
    expect(screen.getByText('Parcela 11 vence 07/11/2026, na fatura do Cartão Teste.')).toBeInTheDocument();
    digitar('Descrição', 'Celular');
    escolher('Categoria', 'cat-compras');
    digitar('Valor total', '1.200,00');
    const previa = screen.getByRole('region', { name: 'Parcelas que serão geradas' });
    expect(within(previa).getByText('07/11/2026')).toBeInTheDocument();
    expect(within(previa).getByText('07/12/2026')).toBeInTheDocument();
  });

  it('"Alterar vencimento" abre o campo preenchido; o digitado é salvo; dá para voltar à fatura', async () => {
    await abrir();
    escolherMeio(CARTAO.nome);
    digitar('Data da compra (opcional)', '2026-10-01');
    fireEvent.click(screen.getByRole('button', { name: 'Alterar vencimento' }));
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-10-07');
    fireEvent.click(screen.getByRole('button', { name: 'Usar o vencimento da fatura' }));
    expect(screen.queryByLabelText('Vencimento')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Alterar vencimento' }));
    digitar('Vencimento', '2026-11-07');
    preencherAvulsa();
    expect(await salvar()).toMatchObject({ vencimento: '2026-11-07', dataCompra: '2026-10-01' });
  });

  it('editar despesa com vencimento fora da regra abre com o campo e mantém a data', async () => {
    await repo.salvarDespesa(
      base,
      avulsa({ id: 'a', meioPagamentoId: CARTAO.id, dataCompra: '2026-10-01', vencimento: '2026-12-15', mes: '2026-12' }),
      { hoje: HOJE },
    );
    await abrir('a');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-12-15');
    digitar('Descrição', 'Outra descrição');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.despesas.get('a')).toMatchObject({ descricao: 'Outra descrição', vencimento: '2026-12-15' }));
  });

  it('recorrente no cartão continua com a primeira cobrança', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Recorrente' }));
    escolherMeio(CARTAO.nome);
    expect(screen.getByLabelText('Primeira cobrança')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alterar vencimento' })).toBeNull();
  });
});

describe('FormDespesa: edição', () => {
  it('mudar só a descrição não pergunta o mês e não mexe nos lançamentos', async () => {
    await repo.salvarDespesa(base, recorrente({ id: 'r', descricao: 'Streaming', categoriaId: 'cat-assinaturas' }), { hoje: HOJE });
    const antes = (await base.lancamentos.toArray()).sort((a, b) => a.id.localeCompare(b.id));
    await abrir('r');
    digitar('Descrição', 'Streaming novo');
    expect(screen.queryByLabelText('Aplicar a mudança a partir de')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect((await base.despesas.get('r'))!.descricao).toBe('Streaming novo'));
    const depois = (await base.lancamentos.toArray()).sort((a, b) => a.id.localeCompare(b.id));
    expect(antes.length).toBeGreaterThan(0);
    expect(depois).toEqual(antes);
  });

  it('preencher a loja tira "loja" de a confirmar ao salvar', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'a', categoriaId: 'cat-outros', vencimento: undefined, aConfirmar: ['loja', 'vencimento'] }), { hoje: HOJE });
    await abrir('a');
    digitar('Loja ou marca (opcional)', 'Padaria do Zé');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect((await base.despesas.get('a'))!.aConfirmar).toEqual(['vencimento']));
  });
});

describe('FormDespesa: novo cartão sem sair do formulário', () => {
  it('cadastra o cartão, deixa selecionado e mostra a fatura', async () => {
    await abrir();
    digitar('Data da compra (opcional)', '2026-10-01');
    fireEvent.click(screen.getByRole('button', { name: 'Novo cartão' }));
    const folha = screen.getByRole('dialog', { name: 'Novo cartão' });
    fireEvent.click(within(folha).getByRole('radio', { name: 'Inter' }));
    expect(within(folha).getByLabelText('Nome')).toHaveValue('Inter');
    fireEvent.input(within(folha).getByLabelText('Dia de fechamento'), { target: { value: '2' } });
    fireEvent.input(within(folha).getByLabelText('Dia de vencimento'), { target: { value: '7' } });
    fireEvent.click(within(folha).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('radio', { name: /^Inter/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Vence 07/10/2026, na fatura do Inter.')).toBeInTheDocument();
    const [meio] = await base.meios.toArray();
    expect(meio).toMatchObject({ nome: 'Inter', tipo: 'credito', bancoSlug: 'inter', diaFechamento: 2, diaVencimento: 7 });
  });

  it('cancelar fecha a folha sem gravar', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Novo cartão' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await base.meios.count()).toBe(0);
    expect(screen.getByRole('radio', { name: 'Não informado' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('FormDespesa: duplicar', () => {
  it('copia os dados com id novo e datas limpas, sem tocar na original', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'orig', descricao: 'Feira ⟦sábado⟧', categoriaId: 'cat-alimentacao', valor: 8990, dataCompra: '2026-10-01' }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <FormDespesa estado={e} de="orig" />} />, base);
    await screen.findByRole('heading', { name: 'Nova despesa' });
    expect(screen.getByText(/Cópia de “Feira ⟦sábado⟧”/)).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Feira ⟦sábado⟧');
    expect(screen.getByLabelText('Valor')).toHaveValue('89,90');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('');
    expect(screen.getByLabelText('Data da compra (opcional)')).toHaveValue('');
    digitar('Vencimento', '2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(2));
    const copia = (await base.despesas.toArray()).find((d) => d.id !== 'orig')!;
    expect(copia).toMatchObject({ descricao: 'Feira ⟦sábado⟧', valor: 8990, vencimento: '2026-11-05' });
    expect((await base.despesas.get('orig'))!.dataCompra).toBe('2026-10-01');
  });
});
