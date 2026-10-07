import type { ComponentChildren } from 'preact';

/** Rótulo visível + controle + dica ou erro. O controle filho deve ter `id={id}`. */
export function Campo({ id, rotulo, erro, dica, children }: { id: string; rotulo: string; erro?: string; dica?: string; children: ComponentChildren }) {
  return (
    <div class={`campo${erro ? ' campo-com-erro' : ''}`}>
      <label for={id} class="campo-rotulo">
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p class="campo-dica">{dica}</p>}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
