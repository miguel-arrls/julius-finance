import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportar, serializar } from '../../src/dados/backup';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Backup } from '../../src/ui/telas/Backup';
import { avulsa } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  await repo.salvarDespesa(base, avulsa({ id: 'a1', descricao: 'Primeira' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'a2', descricao: 'Segunda' }), { hoje: HOJE });
});

const abrir = () => renderizar(<ComEstado filho={(e) => <Backup estado={e} />} />, base);
const enviar = async (conteudo: string) =>
  fireEvent.change(await screen.findByLabelText('Escolher arquivo de backup'), {
    target: { files: [new File([conteudo], 'backup.json', { type: 'application/json' })] },
  });

describe('Backup', () => {
  it('arquivo inválido mostra o motivo e não altera nada', async () => {
    abrir();
    await enviar('{ quebrado');
    expect(await screen.findByText('O arquivo não é um JSON válido.')).toBeInTheDocument();
    expect(await base.despesas.count()).toBe(2);
  });

  it('mostra o que vai substituir, importa e permite desfazer', async () => {
    const outra = await novaBase();
    await repo.inicializarPadrao(outra);
    await repo.salvarDespesa(outra, avulsa({ id: 'x', descricao: 'Do outro aparelho' }), { hoje: HOJE });
    const texto = serializar(await exportar(outra, '2026-10-05T12:00:00.000Z'));

    abrir();
    await enviar(texto);
    expect(await screen.findByText(/O arquivo tem 1 despesa e 1 lançamento/)).toBeInTheDocument();
    expect(screen.getByText(/Seus dados atuais \(2 despesas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Substituir meus dados' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(2));
  });
});
