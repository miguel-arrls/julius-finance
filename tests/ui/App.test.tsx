import { render, screen, within } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import { App } from '../../src/ui/App';
import { HOJE, novaBase } from './auxiliar';

describe('App', () => {
  it('explica o problema quando o armazenamento não abre', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = { open: () => Promise.reject(new Error('bloqueado')) } as unknown as JuliusDB;
    render(<App base={base} hoje={HOJE} />);
    expect(await screen.findByRole('heading', { name: 'Não foi possível abrir seus dados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('abre e mostra a navegação principal', async () => {
    render(<App base={await novaBase()} hoje={HOJE} />);
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    for (const nome of ['Início', 'Lançamentos', 'Nova despesa', 'Despesas', 'Ajustes']) {
      expect(within(nav).getByRole('link', { name: nome })).toBeInTheDocument();
    }
  });
});
