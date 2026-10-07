import { fireEvent, render, screen } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, usarToast } from '../../src/ui/componentes/Toast';

function Disparador({ executar }: { executar: () => void }) {
  const mostrar = usarToast();
  return (
    <button type="button" onClick={() => mostrar('Despesa paga', { rotulo: 'Desfazer', executar })}>
      disparar
    </button>
  );
}

describe('Toast', () => {
  it('mostra a mensagem e executa a ação uma vez', () => {
    const executar = vi.fn();
    render(
      <ToastProvider>
        <Disparador executar={executar} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    expect(screen.getByText('Despesa paga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(executar).toHaveBeenCalledOnce();
    expect(screen.queryByText('Despesa paga')).toBeNull();
  });

  it('some sozinho depois de 5 segundos', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Disparador executar={() => undefined} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.queryByText('Despesa paga')).toBeNull();
    vi.useRealTimers();
  });
});
