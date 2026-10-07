import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import type { DataISO } from '../../src/dominio/tipos';
import { usarMes } from '../../src/ui/contexto';
import { Provedores } from '../../src/ui/Provedores';
import { novaBase } from './auxiliar';

function MostraMes() {
  const { mes, setMes } = usarMes();
  return (
    <>
      <output>{mes}</output>
      <button type="button" onClick={() => setMes('2026-08')}>
        Ir para agosto
      </button>
    </>
  );
}

describe('Provedores', () => {
  const montar = async (hoje: DataISO) => {
    const base = await novaBase();
    const arvore = (h: DataISO) => (
      <Provedores base={base} hoje={h}>
        <MostraMes />
      </Provedores>
    );
    const r = render(arvore(hoje));
    return { trocarHoje: (h: DataISO) => r.rerender(arvore(h)) };
  };

  it('quando o dia vira o mês e o mês mostrado era o atual, acompanha o novo mês', async () => {
    const { trocarHoje } = await montar('2026-10-31');
    expect(screen.getByRole('status')).toHaveTextContent('2026-10');
    trocarHoje('2026-11-01');
    expect(await screen.findByText('2026-11')).toBeInTheDocument();
  });

  it('quando o usuário escolheu outro mês, mantém a escolha', async () => {
    const { trocarHoje } = await montar('2026-10-31');
    fireEvent.click(screen.getByRole('button', { name: 'Ir para agosto' }));
    expect(await screen.findByText('2026-08')).toBeInTheDocument();
    trocarHoje('2026-11-01');
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByRole('status')).toHaveTextContent('2026-08');
  });
});
