import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Inicio } from '../../src/ui/telas/Inicio';
import { avulsa, CARTAO, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar, SEM_NORMALIZAR } from './auxiliar';

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

  it('próximos vencimentos seguem o mês escolhido e não cortam a lista', async () => {
    await popular();
    for (let k = 0; k < 7; k++) {
      await repo.salvarDespesa(
        base,
        avulsa({ id: `x${k}`, descricao: `Extra ${k}`, vencimento: `2026-10-2${k}`, mes: '2026-10', categoriaId: 'cat-moradia' }),
        { hoje: HOJE },
      );
    }
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Próximos vencimentos' })).closest('section')!;
    await waitFor(() => expect(within(secao).getAllByRole('listitem')).toHaveLength(9));
    expect(within(secao).getByText('Extra 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await screen.findByRole('heading', { name: 'novembro de 2026' });
    const linhas = within(secao).getAllByRole('listitem');
    expect(linhas.map((l) => l.textContent)).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent('Atrasada · 05/10');
    expect(linhas[1]).toHaveTextContent('Streaming');
    expect(linhas[1]).toHaveTextContent('07/11');
  });

  it('marca a fatura do cartão inteira como paga e desfaz só o que ela pagou', async () => {
    await popular();
    await repo.salvarDespesa(
      base,
      recorrente({ id: 'r2', descricao: 'Nuvem', meioPagamentoId: CARTAO.id, inicio: '2026-09-12', valor: 1500, categoriaId: 'cat-assinaturas' }),
      { hoje: HOJE },
    );
    await repo.salvarDespesa(
      base,
      recorrente({ id: 'r3', descricao: 'Música', meioPagamentoId: CARTAO.id, inicio: '2026-09-15', categoriaId: 'cat-assinaturas' }),
      { hoje: HOJE },
    );
    await repo.marcarPaga(base, 'r3@2026-09', '2026-10-01');
    abrir();
    // O nome acessível contém o texto visível (WCAG 2.5.3); o cartão em volta diz de qual banco é.
    const doCartao = await screen.findByRole('article', { name: `Cartão ${CARTAO.nome}` });
    fireEvent.click(within(doCartao).getByRole('button', { name: 'Pagar fatura' }));
    expect(await screen.findByText('Fatura paga')).toBeInTheDocument();
    expect((await base.lancamentos.get('r@2026-09'))!.pagoEm).toBe(HOJE);
    expect((await base.lancamentos.get('r2@2026-09'))!.pagoEm).toBe(HOJE);
    expect((await base.lancamentos.get('r3@2026-09'))!.pagoEm).toBe('2026-10-01');
    expect((await base.lancamentos.get('a#1'))!.pagoEm).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect((await base.lancamentos.get('r@2026-09'))!.pagoEm).toBeUndefined());
    await waitFor(async () => expect((await base.lancamentos.get('r2@2026-09'))!.pagoEm).toBeUndefined());
    expect((await base.lancamentos.get('r3@2026-09'))!.pagoEm).toBe('2026-10-01');
  });

  it('pagar pela linha e desfazer', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar Conta de luz como paga' }));
    expect(await screen.findByText('Conta de luz marcada como paga')).toBeInTheDocument();
    await waitFor(async () => expect((await base.lancamentos.get('a#1'))!.pagoEm).toBe(HOJE));
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

describe('Início: o resumo leva à lista filtrada', () => {
  it('métricas, categorias e fatura são links com os filtros do mês', async () => {
    await popular();
    abrir();
    await screen.findByText('Gastos por categoria');
    expect(metrica('Total do mês')).toHaveAttribute('href', '#/lancamentos?mes=2026-10');
    expect(metrica('Pago')).toHaveAttribute('href', '#/lancamentos?mes=2026-10&situacao=paga');
    expect(metrica('1 atrasada')).toHaveAttribute('href', '#/lancamentos?mes=2026-10&situacao=atrasada');
    expect(screen.getByRole('link', { name: /^Moradia/ })).toHaveAttribute('href', '#/lancamentos?mes=2026-10&categoria=cat-moradia');
    const cartao = screen.getByRole('article', { name: `Cartão ${CARTAO.nome}` });
    expect(within(cartao).getAllByRole('link')[0]).toHaveAttribute('href', `#/lancamentos?mes=2026-10&meio=${CARTAO.id}`);
  });
});

describe('Início: resumo de insights', () => {
  it('leva à Análise; sem mês anterior, convida a ver a análise', async () => {
    await popular();
    abrir();
    const link = (await screen.findAllByRole('link')).find((a) => a.classList.contains('aviso-insight'))!;
    expect(link).toBeDefined();
    // A cobrança de 10/09 vence em 07/10 no cartão: setembro fica vazio e não há percentual.
    expect(link.textContent).toMatch(/^Ver a análise do mês/);
    expect(link.textContent).toContain('maior aumento: Moradia');
  });
});

describe('Início: alertas de contas atrasadas', () => {
  beforeEach(async () => {
    await repo.inicializarPadrao(base);
  });

  it('até duas: um alerta por conta, cada um com Pagar', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'x', descricao: 'Farmácia ⟦a⟧', valor: 6320, vencimento: '2026-10-03' }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'y', descricao: 'Padaria', valor: 1000, vencimento: '2026-10-04' }), { hoje: HOJE });
    abrir();
    const alerta = await screen.findByRole('region', { name: 'Farmácia ⟦a⟧ atrasada' });
    expect(alerta.textContent).toContain('venceu 03/10');
    expect(screen.getByRole('region', { name: 'Padaria atrasada' })).toBeInTheDocument();
    fireEvent.click(within(alerta).getByRole('button', { name: 'Pagar Farmácia ⟦a⟧' }));
    await waitFor(async () => expect((await base.lancamentos.get('x#1'))!.pagoEm).toBe(HOJE));
  });

  it('três ou mais: um alerta só, com total e link para todas as atrasadas', async () => {
    for (const [id, dia] of [['x', '01'], ['y', '02'], ['z', '03']] as const) {
      await repo.salvarDespesa(base, avulsa({ id, descricao: `Conta ${id}`, valor: 1000, vencimento: `2026-10-${dia}` }), { hoje: HOJE });
    }
    abrir();
    const alerta = await screen.findByRole('region', { name: 'Contas atrasadas' });
    expect(alerta.textContent).toContain('3 contas atrasadas');
    expect(within(alerta).getByRole('link', { name: 'Ver' })).toHaveAttribute('href', '#/lancamentos?mes=todos&situacao=atrasada');
    expect(screen.queryByRole('button', { name: /^Pagar Conta/ })).toBeNull();
  });

  it('a engrenagem leva a Ajustes', async () => {
    await popular();
    abrir();
    expect(await screen.findByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '#/ajustes');
  });
});

describe('Início: carrossel de cartões', () => {
  it('mostra a fatura que vence no dia do cartão, com fechamento e botão de pagar', async () => {
    await repo.inicializarPadrao(base);
    await repo.salvarMeio(base, CARTAO, HOJE); // fecha 2, vence 7
    // Vencimento digitado à mão (05/10) e a fatura principal (07/10).
    await repo.salvarDespesa(base, avulsa({ id: 'm', descricao: 'Manual', valor: 1000, vencimento: '2026-10-05', meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'p', descricao: 'Principal', valor: 2000, vencimento: '2026-10-07', meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    abrir();
    const cartao = await screen.findByRole('article', { name: `Cartão ${CARTAO.nome}` });
    expect(cartao.textContent).toContain('Fecha 02/10');
    expect(cartao.textContent).toContain('Vence 07/10');
    expect(cartao.textContent).toContain('R$ 30,00');
  });
});
