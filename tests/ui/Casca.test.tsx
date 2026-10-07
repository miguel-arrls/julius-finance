import { fireEvent, screen } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Casca } from '../../src/ui/Casca';
import { novaBase, renderizar } from './auxiliar';

beforeEach(() => {
  location.hash = '';
});

describe('Casca', () => {
  it('banco vazio mostra boas-vindas; começar do zero leva ao Início', async () => {
    renderizar(<Casca />, await novaBase());
    expect(await screen.findByRole('heading', { name: 'Boas-vindas ao Julius' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Começar do zero' }));
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument();
  });

  it('não sobrou tela provisória', () => {
    expect(readFileSync('src/ui/Casca.tsx', { encoding: 'utf-8' })).not.toContain('EmBreve');
  });
});
