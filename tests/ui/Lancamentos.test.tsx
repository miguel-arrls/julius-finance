import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Lancamentos } from '../../src/ui/telas/Lancamentos';
import { avulsa, parcelada } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
});

async function popular(): Promise<void> {
  await repo.salvarDespesa(base, avulsa({ id: 'a', descricao: 'Açaí da esquina', vencimento: '2026-10-05', categoriaId: 'cat-alimentacao' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'b', descricao: 'Academia', vencimento: '2026-10-20', categoriaId: 'cat-saude' }), { hoje: HOJE });
  await repo.salvarDespesa(
    base,
    parcelada({ id: 'p', descricao: 'Celular', numParcelas: 12, comecaNaParcela: 11, valorParcela: 45000, valorTotal: 540000, primeiroVencimento: undefined, mesPrimeira: '2026-10', categoriaId: 'cat-compras' }),
    { hoje: HOJE },
  );
}

function abrir() {
  renderizar(<ComEstado filho={(e) => <Lancamentos estado={e} />} />, base);
}

describe('Lançamentos', () => {
  it('busca sem acento', async () => {
    await popular();
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'acai' } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('filtra por situação', async () => {
    await popular();
    abrir();
    fireEvent.change(await screen.findByLabelText('Situação'), { target: { value: 'atrasada' } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('mostra os sem vencimento numa seção própria', async () => {
    await popular();
    abrir();
    const titulo = await screen.findByRole('heading', { name: 'Sem vencimento — a confirmar' });
    expect(within(titulo.nextElementSibling as HTMLElement).getByText('Celular')).toBeInTheDocument();
  });

  it('pagar e desfazer', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar Academia como paga' }));
    expect(await screen.findByText('Academia marcada como paga')).toBeInTheDocument();
    expect((await base.lancamentos.get('b#1'))!.pagoEm).toBe(HOJE);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect((await base.lancamentos.get('b#1'))!.pagoEm).toBeUndefined());
  });

  it('filtros sem resultado oferecem limpar', async () => {
    await popular();
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum lançamento com esses filtros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Academia')).toBeInTheDocument();
  });

  it('sem nada cadastrado, convida a cadastrar', async () => {
    abrir();
    expect(await screen.findByText('Nenhum lançamento ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar despesa' })).toHaveAttribute('href', '#/nova');
  });
});
