import { screen, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Analise } from '../../src/ui/telas/Analise';
import { avulsa, CARTAO, parcelada, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  await repo.salvarMeio(base, { ...CARTAO, bancoSlug: 'nubank' }, HOJE);
  await repo.salvarDespesa(base, avulsa({ id: 'set', descricao: 'Mercado de setembro', valor: 10000, vencimento: '2026-09-10', mes: '2026-09', categoriaId: 'cat-alimentacao' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'out', descricao: 'Mercado ⟦grande⟧', valor: 15000, vencimento: '2026-10-10', categoriaId: 'cat-alimentacao', meioPagamentoId: CARTAO.id }), { hoje: HOJE });
  await repo.salvarDespesa(base, recorrente({ id: 'fixo', descricao: 'Streaming', valor: 3990, inicio: '2026-10-08' }), { hoje: HOJE });
  await repo.salvarDespesa(base, parcelada({ id: 'tv', descricao: 'Televisão', valorTotal: 90000, numParcelas: 3, primeiroVencimento: '2026-10-15', mesPrimeira: '2026-10' }), { hoje: HOJE });
});

function abrir() {
  renderizar(<ComEstado filho={(e) => <Analise estado={e} />} />, base);
}

describe('Análise', () => {
  it('compara com o mês anterior e aponta o que mais subiu, com link para a lista', async () => {
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Comparado a setembro de 2026' })).closest('section')!;
    // Outubro: 150,00 + 39,90 + 300,00 = 489,90 contra 100,00 em setembro.
    expect(within(secao).getByText('+390%')).toBeInTheDocument();
    const link = within(secao).getByRole('link', { name: /Alimentação/ });
    expect(link).toHaveAttribute('href', '#/lancamentos?mes=2026-10&categoria=cat-alimentacao');
  });

  it('mostra o gasto por meio com link do cartão e "Não informado" sem link', async () => {
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Por cartão e meio de pagamento' })).closest('section')!;
    expect(within(secao).getByRole('link', { name: /Cartão Teste/ })).toHaveAttribute('href', `#/lancamentos?mes=2026-10&meio=${CARTAO.id}`);
    expect(within(secao).getByText(/Não informado/)).toBeInTheDocument();
  });

  it('gráfico de evolução tem descrição e os valores também em lista', async () => {
    abrir();
    const grafico = await screen.findByRole('img');
    expect(grafico.getAttribute('aria-label')).toMatch(/^Gasto dos últimos 6 meses: /);
    expect(grafico.getAttribute('aria-label')).toContain('Média dos meses fechados');
    const secao = screen.getByRole('heading', { name: 'Últimos 6 meses' }).closest('section')!;
    expect(within(secao).getAllByRole('link')).toHaveLength(6);
  });

  it('lista compromissos: fixos por mês e parcelas restantes', async () => {
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Compromissos daqui para frente' })).closest('section')!;
    expect(within(secao).getByText('R$ 39,90', { normalizer: (t) => t })).toBeInTheDocument();
    const tv = within(secao).getByRole('link', { name: /Televisão/ });
    expect(tv).toHaveAttribute('href', '#/despesas/tv');
    expect(tv.textContent).toContain('3 parcelas');
  });
});
