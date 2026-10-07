import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { FormDespesa } from '../../src/ui/telas/FormDespesa';
import { CARTAO, recorrente } from '../fabricas';
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
