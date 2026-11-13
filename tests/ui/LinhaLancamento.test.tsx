import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ItemLista } from '../../src/dominio/resumo';
import { aindaSegurando, deslize, LinhaLancamento } from '../../src/ui/componentes/LinhaLancamento';
import { avulsa, lanc } from '../fabricas';

describe('deslize', () => {
  it('abre ao deslizar mais de 70 px para a esquerda', () => expect(deslize(-80, 0)).toBe('abrir'));
  it('fecha ao deslizar para a direita', () => expect(deslize(80, 0)).toBe('fechar'));
  it('ignora deslize curto', () => expect(deslize(-60, 0)).toBeNull());
  it('ignora movimento mais vertical (rolagem)', () => expect(deslize(-80, 100)).toBeNull());
});

describe('aindaSegurando', () => {
  it('tolera tremida de até 10 px', () => expect(aindaSegurando(6, 8)).toBe(true));
  it('cancela quando o dedo anda', () => expect(aindaSegurando(0, 11)).toBe(false));
});

const item = (situacao: ItemLista['situacao'] = 'pendente'): ItemLista => ({
  despesa: avulsa({ id: 'a b', descricao: 'Açaí ⟦duplo⟧' }),
  lancamento: lanc({ id: 'a b#1', despesaId: 'a b', vencimento: '2026-10-10' }),
  situacao,
});

function linha(i: ItemLista) {
  const onPagar = vi.fn();
  render(
    <ul>
      <LinhaLancamento item={i} onPagar={onPagar} />
    </ul>,
  );
  return { li: screen.getByRole('listitem'), onPagar };
}

afterEach(() => vi.useRealTimers());

describe('LinhaLancamento: ações rápidas', () => {
  it('deslizar para a esquerda mostra Pagar, Editar e Duplicar sem pagar', () => {
    const { li, onPagar } = linha(item());
    fireEvent.pointerDown(li, { clientX: 200, clientY: 10 });
    fireEvent.pointerUp(li, { clientX: 100, clientY: 12 });
    expect(onPagar).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Ações de Açaí ⟦duplo⟧' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '#/editar/a%20b');
    expect(screen.getByRole('link', { name: 'Duplicar' })).toHaveAttribute('href', '#/nova?de=a+b');
    fireEvent.click(screen.getByRole('button', { name: 'Pagar' }));
    expect(onPagar).toHaveBeenCalledOnce();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('tocar e segurar abre o menu; o clique que segue não abre o detalhe', () => {
    vi.useFakeTimers();
    const { li } = linha(item());
    fireEvent.pointerDown(li, { clientX: 50, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(li, { clientX: 52, clientY: 11 });
    expect(screen.getByRole('group')).toBeInTheDocument();
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    screen.getAllByRole('link')[0]!.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('segurar e arrastar é rolagem: não abre', () => {
    vi.useFakeTimers();
    const { li } = linha(item());
    fireEvent.pointerDown(li, { clientX: 50, clientY: 10 });
    fireEvent.pointerMove(li, { clientX: 50, clientY: 60 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('lançamento pago não oferece Pagar, mas mantém Editar e Duplicar; Esc fecha', () => {
    const { li } = linha(item('paga'));
    fireEvent.contextMenu(li);
    expect(screen.queryByRole('button', { name: 'Pagar' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Duplicar' })).toBeInTheDocument();
    fireEvent.keyDown(li, { key: 'Escape' });
    expect(screen.queryByRole('group')).toBeNull();
  });
});
