import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { DetalheDespesa } from '../../src/ui/telas/DetalheDespesa';
import { Despesas } from '../../src/ui/telas/Despesas';
import { avulsa, parcelada, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  location.hash = '';
  vi.restoreAllMocks();
});

const detalhe = (id: string) => renderizar(<ComEstado filho={(e) => <DetalheDespesa estado={e} id={id} />} />, base);

describe('Despesas', () => {
  it('lista por tipo e mostra estado vazio por aba', async () => {
    await repo.salvarDespesa(base, recorrente({ descricao: 'Streaming', categoriaId: 'cat-assinaturas' }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Despesas estado={e} />} />, base);
    expect(await screen.findByText('Streaming')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Parceladas' }));
    expect(screen.getByText('Nenhuma compra parcelada')).toBeInTheDocument();
  });

  it('agrupa o que está a confirmar', async () => {
    await repo.salvarDespesa(base, avulsa({ descricao: 'Celular', aConfirmar: ['vencimento', 'loja'] }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Despesas estado={e} />} />, base);
    expect(await screen.findByText(/vencimento, loja ou marca/)).toBeInTheDocument();
  });
});

describe('DetalheDespesa', () => {
  it('mostra parcelas e histórico', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    detalhe('pa1');
    expect(await screen.findByText('Parcela 1/3')).toBeInTheDocument();
    expect(await screen.findByText(/Criada/)).toBeInTheDocument();
  });

  it('pausar pede confirmação e remove as cobranças futuras', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    await waitFor(async () => expect(await base.lancamentos.where('despesaId').equals('r').count()).toBe(1));
    expect(await screen.findByRole('button', { name: 'Retomar' })).toBeInTheDocument();
  });

  it('corrigir o valor de um mês estimado', async () => {
    await repo.salvarDespesa(base, recorrente({ id: 'r', valorVariavel: true }), { hoje: HOJE });
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar novembro de 2026' }));
    fireEvent.input(screen.getByLabelText('Valor'), { target: { value: '45,12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.lancamentos.get('r@2026-11')).toMatchObject({ valor: 4512, estimado: false }));
  });

  it('excluir só depois de confirmar e volta para a lista', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    detalhe('av1');
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(await base.despesas.get('av1')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(async () => expect(await base.despesas.get('av1')).toBeUndefined());
    expect(confirmar.mock.calls[1]![0]).toBe('Excluir "Despesa teste"? 1 lançamento será apagado. Isso não pode ser desfeito.');
    expect(location.hash).toBe('#/despesas');
  });

  it('excluir parcelada com parcela paga: texto no plural com contagem de pagos', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#1', HOJE);
    detalhe('pa1');
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(async () => expect(await base.despesas.get('pa1')).toBeUndefined());
    expect(confirmar.mock.calls[0]![0]).toBe('Excluir "Despesa teste"? 3 lançamentos serão apagados, incluindo 1 pago. Isso não pode ser desfeito.');
    expect(await base.lancamentos.where('despesaId').equals('pa1').count()).toBe(0);
  });

  async function abrirEncerrar() {
    fireEvent.click(await screen.findByText('Encerrar recorrência'));
    return screen.getByLabelText('Última cobrança em ou antes de');
  }

  it('encerrar com data inválida: alerta, sem confirmar e sem alterar', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    const antes = await base.lancamentos.where('despesaId').equals('r').count();
    detalhe('r');
    const campo = await abrirEncerrar();
    fireEvent.input(campo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe uma data válida.');
    expect(confirmar).not.toHaveBeenCalled();
    expect((await base.despesas.get('r') as { fim?: string }).fim).toBeUndefined();
    expect(await base.lancamentos.where('despesaId').equals('r').count()).toBe(antes);
  });

  it('encerrar antes do início mostra o erro do domínio e não grava', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-10-08' }), { hoje: HOJE });
    detalhe('r');
    const campo = await abrirEncerrar();
    fireEvent.input(campo, { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O fim não pode ser antes do início.');
    expect((await base.despesas.get('r') as { fim?: string }).fim).toBeUndefined();
  });

  it('pausar cancelado não remove nada', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    const antes = await base.lancamentos.where('despesaId').equals('r').count();
    expect(antes).toBeGreaterThan(1);
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(await base.lancamentos.where('despesaId').equals('r').count()).toBe(antes);
    expect(screen.queryByRole('button', { name: 'Retomar' })).toBeNull();
  });

  it('pausar mantém a parcela paga no futuro', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    await repo.marcarPaga(base, 'r@2026-11', HOJE);
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    await screen.findByRole('button', { name: 'Retomar' });
    const ids = (await base.lancamentos.where('despesaId').equals('r').toArray()).map((l) => l.id).sort();
    expect(ids).toEqual(['r@2026-09', 'r@2026-11']);
    expect((await base.lancamentos.get('r@2026-11'))!.pagoEm).toBe(HOJE);
  });

  it('retomar volta a gerar cobranças e registra no histórico', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar' }));
    await screen.findByRole('button', { name: 'Pausar' });
    const ls = await base.lancamentos.where('despesaId').equals('r').toArray();
    expect(ls.some((l) => (l.dataCobranca ?? '') >= HOJE)).toBe(true);
    expect(await screen.findByText(/Retomada/)).toBeInTheDocument();
  });
});
