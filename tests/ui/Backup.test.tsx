import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportar, importar, lerBackup, serializar } from '../../src/dados/backup';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Backup } from '../../src/ui/telas/Backup';
import { avulsa, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  await repo.salvarDespesa(base, avulsa({ id: 'a1', descricao: 'Primeira' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'a2', descricao: 'Segunda' }), { hoje: HOJE });
});

afterEach(() => vi.restoreAllMocks());

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

  describe('desfazer a última importação pela tela', () => {
    const TEXTO_CONFIRMACAO =
      'Restaurar os dados de antes da importação de 05/10/2026 12:30? Tudo o que você fez depois disso será perdido.';

    beforeEach(async () => {
      const outra = await novaBase();
      await repo.inicializarPadrao(outra);
      await repo.salvarDespesa(outra, avulsa({ id: 'x', descricao: 'Do outro aparelho' }), { hoje: HOJE });
      const lido = lerBackup(serializar(await exportar(outra, '2026-10-05T12:00:00.000Z')));
      if (!lido.ok) throw new Error(lido.erro);
      await importar(base, lido.arquivo);
      const [snap] = await base.snapshots.toArray();
      await base.snapshots.update(snap!.id, { criadoEm: '2026-10-05T15:30:00.000Z' }); // 12:30 em São Paulo
    });

    it('o botão mostra a data da importação', async () => {
      abrir();
      expect(await screen.findByRole('button', { name: 'Desfazer importação de 05/10/2026 12:30' })).toBeInTheDocument();
    });

    it('sem confirmar, nada muda', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      abrir();
      fireEvent.click(await screen.findByRole('button', { name: 'Desfazer importação de 05/10/2026 12:30' }));
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar).toHaveBeenCalledWith(TEXTO_CONFIRMACAO);
      await new Promise((r) => setTimeout(r, 50));
      expect((await base.despesas.toArray()).map((d) => d.id)).toEqual(['x']);
      expect(await base.snapshots.count()).toBe(1);
    });

    it('confirmando, restaura os dados de antes da importação', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      abrir();
      fireEvent.click(await screen.findByRole('button', { name: 'Desfazer importação de 05/10/2026 12:30' }));
      expect(confirmar).toHaveBeenCalledWith(TEXTO_CONFIRMACAO);
      await waitFor(async () => expect((await base.despesas.toArray()).map((d) => d.id).sort()).toEqual(['a1', 'a2']));
      expect(await base.snapshots.count()).toBe(0);
    });

    it('o Desfazer do aviso logo após importar não pede confirmação', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const outra = await novaBase();
      await repo.inicializarPadrao(outra);
      await repo.salvarDespesa(outra, avulsa({ id: 'y', descricao: 'Terceiro' }), { hoje: HOJE });
      abrir();
      await enviar(serializar(await exportar(outra, '2026-10-05T12:00:00.000Z')));
      fireEvent.click(await screen.findByRole('button', { name: 'Substituir meus dados' }));
      await waitFor(async () => expect((await base.despesas.toArray()).map((d) => d.id)).toEqual(['y']));
      fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
      await waitFor(async () => expect((await base.despesas.toArray()).map((d) => d.id)).toEqual(['x']));
      expect(confirmar).not.toHaveBeenCalled();
    });
  });

  describe('depois de importar ou desfazer, cria as cobranças que faltam das recorrentes', () => {
    const contar = () => base.lancamentos.where('despesaId').equals('re1').count();

    async function arquivoDe(montar: (b: JuliusDB) => Promise<void>): Promise<string> {
      const outra = await novaBase();
      await repo.inicializarPadrao(outra);
      await montar(outra);
      return serializar(await exportar(outra, '2026-10-05T12:00:00.000Z'));
    }

    it('ao importar', async () => {
      const texto = await arquivoDe(async (outra) => {
        await repo.salvarDespesa(outra, recorrente(), { hoje: HOJE });
        await outra.lancamentos.where('despesaId').equals('re1').delete();
      });
      abrir();
      await enviar(texto);
      fireEvent.click(await screen.findByRole('button', { name: 'Substituir meus dados' }));
      await waitFor(async () => expect(await base.despesas.get('re1')).toBeDefined());
      await waitFor(async () => expect(await contar()).toBe(13));
    });

    it('ao desfazer pelo aviso logo após importar', async () => {
      await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
      await base.lancamentos.where('despesaId').equals('re1').delete();
      const texto = await arquivoDe(async (outra) => {
        await repo.salvarDespesa(outra, avulsa({ id: 'x' }), { hoje: HOJE });
      });
      abrir();
      await enviar(texto);
      fireEvent.click(await screen.findByRole('button', { name: 'Substituir meus dados' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
      await waitFor(async () => expect(await base.despesas.get('re1')).toBeDefined());
      await waitFor(async () => expect(await contar()).toBe(13));
    });

    it('ao desfazer pelo botão da tela', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
      await base.lancamentos.where('despesaId').equals('re1').delete();
      const lido = lerBackup(await arquivoDe(async (outra) => repo.salvarDespesa(outra, avulsa({ id: 'x' }), { hoje: HOJE })));
      if (!lido.ok) throw new Error(lido.erro);
      await importar(base, lido.arquivo);
      abrir();
      fireEvent.click(await screen.findByRole('button', { name: /^Desfazer importação de / }));
      await waitFor(async () => expect(await base.despesas.get('re1')).toBeDefined());
      await waitFor(async () => expect(await contar()).toBe(13));
    });
  });
});
