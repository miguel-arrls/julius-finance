import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import { gerarCsv } from '../../src/dados/csv';
import * as repo from '../../src/dados/repositorio';
import { filtrar } from '../../src/dominio/filtros';
import { detalhar } from '../../src/dominio/resumo';
import { Lancamentos } from '../../src/ui/telas/Lancamentos';
import * as arquivo from '../../src/ui/arquivo';
import { avulsa, parcelada } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

vi.mock('../../src/ui/arquivo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/ui/arquivo')>()),
  compartilharOuBaixar: vi.fn().mockResolvedValue('baixado'),
}));

let base: JuliusDB;

beforeEach(async () => {
  vi.mocked(arquivo.compartilharOuBaixar).mockClear();
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

  it('todos os meses mostra outros meses e limpar filtros volta ao mês atual', async () => {
    await popular();
    abrir();
    await screen.findByText('Academia');
    expect(screen.getAllByText('Celular')).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Mês'), { target: { value: '' } });
    expect(screen.getAllByText('Celular')).toHaveLength(2);
    fireEvent.input(screen.getByLabelText('Buscar'), { target: { value: 'zzz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getAllByText('Celular')).toHaveLength(1);
    expect(screen.getByText('Academia')).toBeInTheDocument();
  });

  it('filtra por categoria', async () => {
    await popular();
    abrir();
    fireEvent.change(await screen.findByLabelText('Categoria'), { target: { value: 'cat-saude' } });
    expect(screen.getByText('Academia')).toBeInTheDocument();
    expect(screen.queryByText('Açaí da esquina')).toBeNull();
    expect(screen.queryByText('Celular')).toBeNull();
  });

  it('filtra por tipo', async () => {
    await popular();
    abrir();
    fireEvent.change(await screen.findByLabelText('Tipo'), { target: { value: 'parcelada' } });
    expect(screen.getByText('Celular')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
    expect(screen.queryByText('Açaí da esquina')).toBeNull();
  });

  it('filtra por meio de pagamento', async () => {
    const pix = { id: 'meio-pix', nome: 'PIX', tipo: 'pix' as const };
    await repo.salvarMeio(base, pix, HOJE);
    await repo.salvarDespesa(base, avulsa({ id: 'a', descricao: 'Açaí da esquina', vencimento: '2026-10-05', meioPagamentoId: pix.id }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'b', descricao: 'Academia', vencimento: '2026-10-20' }), { hoje: HOJE });
    abrir();
    fireEvent.change(await screen.findByLabelText('Meio de pagamento'), { target: { value: pix.id } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('busca pelo nome da marca', async () => {
    await repo.salvarMarca(base, { id: 'm1', nome: 'Sorveteria Polo', apelidos: [] });
    await repo.salvarDespesa(base, avulsa({ id: 'a', descricao: 'Açaí da esquina', vencimento: '2026-10-05', marcaId: 'm1' }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'b', descricao: 'Academia', vencimento: '2026-10-20' }), { hoje: HOJE });
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'sorveteria' } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('exporta o CSV da lista filtrada', async () => {
    await popular();
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'acai' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    const chamada = vi.mocked(arquivo.compartilharOuBaixar);
    await waitFor(() => expect(chamada).toHaveBeenCalledOnce());
    const estado = { categorias: await base.categorias.toArray(), marcas: await base.marcas.toArray(), meios: await base.meios.toArray(), despesas: await base.despesas.toArray(), lancamentos: await base.lancamentos.toArray() };
    const esperado = gerarCsv(filtrar(detalhar(estado.lancamentos, estado as never, HOJE), { texto: 'acai', mes: '2026-10' }));
    expect(chamada.mock.calls[0]).toEqual(['julius-lancamentos-2026-10.csv', esperado, 'text/csv']);
    expect(esperado).toContain('Açaí da esquina');
    expect(esperado).not.toContain('Academia');
    fireEvent.change(screen.getByLabelText('Mês'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/ }));
    await waitFor(() => expect(chamada).toHaveBeenCalledTimes(2));
    expect(chamada.mock.calls[1]?.[0]).toBe('julius-lancamentos-todos.csv');
  });
});
