import type { ComponentChildren } from 'preact';

export interface OpcaoChip<T extends string> {
  valor: T;
  rotulo: string;
  /** Elemento decorativo antes do rótulo (logo, bolinha de cor). */
  antes?: ComponentChildren;
}

/**
 * Escolha única em pílulas com rolagem horizontal. A primeira opção costuma ser "Todas" (valor '').
 * Setas esquerda/direita trocam a seleção, como num radiogroup nativo.
 */
export function Chips<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: OpcaoChip<T>[];
  valor: T;
  aoMudar: (v: T) => void;
}) {
  function teclar(e: KeyboardEvent, i: number) {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const proxima = opcoes[(i + passo + opcoes.length) % opcoes.length]!;
    aoMudar(proxima.valor);
    const grupo = (e.currentTarget as HTMLElement).parentElement;
    (grupo?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[(i + passo + opcoes.length) % opcoes.length])?.focus();
  }

  return (
    <div class="chips" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o, i) => {
        const marcado = o.valor === valor;
        // Sem nenhuma marcada (valor que não está na lista), a primeira recebe o foco do Tab.
        const focavel = marcado || (i === 0 && !opcoes.some((x) => x.valor === valor));
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            class="chip"
            aria-checked={marcado}
            tabIndex={focavel ? 0 : -1}
            onClick={() => aoMudar(o.valor)}
            onKeyDown={(e) => teclar(e, i)}
          >
            {o.antes}
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
