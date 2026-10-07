import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Categorias } from '../../src/ui/telas/Categorias';
import { Meios } from '../../src/ui/telas/Meios';
import { avulsa } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
});

describe('Categorias', () => {
  it('cria uma categoria', async () => {
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'Pets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.categorias.count()).toBe(10));
  });

  it('rejeita nome repetido', async () => {
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'saude' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeInTheDocument();
  });

  it('excluir categoria em uso move as despesas para outra', async () => {
    await repo.salvarDespesa(base, avulsa({ categoriaId: 'cat-saude' }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Saúde' }));
    expect(screen.getByText('1 despesa usa "Saúde". Para onde ela vai?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mover para'), { target: { value: 'cat-outros' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir categoria' }));
    await waitFor(async () => expect((await base.despesas.get('av1'))!.categoriaId).toBe('cat-outros'));
    expect(await base.categorias.get('cat-saude')).toBeUndefined();
  });
});

describe('Meios de pagamento', () => {
  it('valida os dias do cartão e salva', async () => {
    renderizar(<ComEstado filho={(e) => <Meios estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo meio de pagamento' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'Cartão X' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'credito' } });
    fireEvent.input(screen.getByLabelText('Dia de fechamento'), { target: { value: '40' } });
    fireEvent.input(screen.getByLabelText('Dia de vencimento'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um dia entre 1 e 31.')).toBeInTheDocument();
    fireEvent.input(screen.getByLabelText('Dia de fechamento'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.meios.count()).toBe(1));
    expect((await base.meios.toArray())[0]).toMatchObject({ nome: 'Cartão X', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 });
  });
});
