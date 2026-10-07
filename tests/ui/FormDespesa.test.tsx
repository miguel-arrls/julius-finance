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

  it('o cartão sugere o vencimento a partir da data da compra', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await abrir();
    escolher('Meio de pagamento', CARTAO.id);
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-11-07');
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

describe('FormDespesa: sugestão de vencimento', () => {
  beforeEach(async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
  });

  it('não sobrescreve o vencimento digitado (avulsa)', async () => {
    await abrir();
    digitar('Vencimento', '2026-12-01');
    escolher('Meio de pagamento', CARTAO.id);
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-12-01');
  });

  it('não sobrescreve o 1º vencimento digitado (parcelada)', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Parcelada' }));
    digitar('1º vencimento', '2026-12-01');
    escolher('Meio de pagamento', CARTAO.id);
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByLabelText('1º vencimento')).toHaveValue('2026-12-01');
  });

  it('atualiza a sugestão quando a data da compra muda, mas respeita o que foi digitado depois', async () => {
    await abrir();
    escolher('Meio de pagamento', CARTAO.id);
    digitar('Data da compra (opcional)', '2026-10-01');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-10-07');
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-11-07');
    digitar('Vencimento', '2026-12-15');
    digitar('Data da compra (opcional)', '2026-10-01');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-12-15');
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
    expect(depois.map((l) => [l.id, l.valor])).toEqual(antes.map((l) => [l.id, l.valor]));
  });

  it('preencher a loja tira "loja" de a confirmar ao salvar', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'a', categoriaId: 'cat-outros', vencimento: undefined, aConfirmar: ['loja', 'vencimento'] }), { hoje: HOJE });
    await abrir('a');
    digitar('Loja ou marca (opcional)', 'Padaria do Zé');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect((await base.despesas.get('a'))!.aConfirmar).toEqual(['vencimento']));
  });
});
