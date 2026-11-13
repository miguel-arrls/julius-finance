import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

const FONTE_MINIMA = 12;

/**
 * Valor que reduz a fonte até caber na largura da caixa. Dinheiro nunca é cortado nem vira "…":
 * se nem na fonte mínima couber, o texto quebra linha.
 */
export function ValorQueCabe({ class: classe, children }: { class?: string; children: ComponentChildren }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let larguraAnterior = -1;
    const ajustar = () => {
      if (el.clientWidth === larguraAnterior) return; // só a largura muda o ajuste (evita laço com a altura)
      larguraAnterior = el.clientWidth;
      el.style.fontSize = '';
      el.style.whiteSpace = 'nowrap';
      let tamanho = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth + 0.5 && tamanho > FONTE_MINIMA) {
        tamanho -= 1;
        el.style.fontSize = `${tamanho}px`;
      }
      if (el.scrollWidth > el.clientWidth + 0.5) el.style.whiteSpace = 'normal';
    };
    ajustar();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => ajustar());
    observador.observe(el);
    return () => observador.disconnect();
  }, [children]);
  return (
    <span ref={ref} class={classe}>
      {children}
    </span>
  );
}
