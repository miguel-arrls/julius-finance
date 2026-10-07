import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Inicio } from '../../src/ui/telas/Inicio';
import { avulsa, CARTAO, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

// O normalizador padrão do testing-library troca U+00A0 por espaço comum; aqui o texto é conferido byte a byte.
const SEM_NORMALIZAR = { normalizer: (t: string) => t };

let base: JuliusDB;

async function popular(): Promise<void> {
  await repo.inicializarPadrao(base);
  await repo.salvarMeio(base, CARTAO, HOJE);
  // Cobrança em 10/09 no cartão (fecha 2, vence 7) → vence 07/10.
  await repo.salvarDespesa(
    base,
    recorrente({ id: 'r', descricao: 'Streaming', meioPagamentoId: CARTAO.id, inicio: '2026-09-10', categoriaId: 'cat-assinaturas' }),
    { hoje: HOJE },
  );
  await repo.salvarDespesa(
    base,
    avulsa({ id: 'a', descricao: 'Conta de luz', vencimento: '2026-10-05', mes: '2026-10', categoriaId: 'cat-moradia' }),
    { hoje: HOJE },
  );
}

function abrir() {
  renderizar(<ComEstado filho={(e) => <Inicio estado={e} />} />, base);
}

const metrica = (rotulo: string) => screen.getByText(rotulo).closest('.metrica') as HTMLElement;

beforeEach(async () => {
  base = await novaBase();
});

describe('Início', () => {
  it('mostra total, pago e pendente do mês', async () => {
    await popular();
    abrir();
    await screen.findByRole('heading', { name: 'outubro de 2026' });
    expect(within(metrica('Total do mês')).getByText('R$ 139,90', SEM_NORMALIZAR)).toBeInTheDocument();
    expect(within(metrica('Pago')).getByText('R$ 0,00', SEM_NORMALIZAR)).toBeInTheDocument();
    expect(within(metrica('Pendente')).getByText('R$ 139,90', SEM_NORMALIZAR)).toBeInTheDocument();
  });

  it('atrasadas aparecem primeiro nos próximos vencimentos', async () => {
    await popular();
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Próximos vencimentos' })).closest('section')!;
    const linhas = within(secao).getAllByRole('listitem');
    expect(linhas[0]).toHaveTextContent('Conta de luz');
    expect(linhas[0]).toHaveTextContent('Atrasada · 05/10');
  });

  it('marca a fatura do cartão inteira como paga', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar fatura como paga' }));
    expect(await screen.findByText('Fatura paga')).toBeInTheDocument();
    expect((await base.lancamentos.get('r@2026-09'))!.pagoEm).toBe(HOJE);
  });

  it('pagar pela linha e desfazer', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar Conta de luz como paga' }));
    expect(await screen.findByText('Conta de luz marcada como paga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect((await base.lancamentos.get('a#1'))!.pagoEm).toBeUndefined());
  });

  it('mês sem lançamentos convida a cadastrar', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('Nada lançado em setembro de 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar despesa' })).toHaveAttribute('href', '#/nova');
  });

  it('avisa sobre dados a confirmar e backup', async () => {
    await popular();
    await repo.salvarDespesa(base, avulsa({ id: 'b', aConfirmar: ['vencimento'] }), { hoje: HOJE });
    abrir();
    expect(await screen.findByText('1 despesa tem dados a confirmar')).toBeInTheDocument();
    expect(screen.getByText('Faça um backup: seus dados ficam só neste aparelho.')).toBeInTheDocument();
  });
});
