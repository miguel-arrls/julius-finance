import { render } from '@testing-library/preact';
import type { ComponentChildren, JSX } from 'preact';
import { JuliusDB } from '../../src/dados/db';
import type { DataISO } from '../../src/dominio/tipos';
import { usarEstado, type Estado } from '../../src/ui/estado';
import { Provedores } from '../../src/ui/Provedores';

export const HOJE = '2026-10-06';

export async function novaBase(): Promise<JuliusDB> {
  const base = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await base.open();
  return base;
}

/** Renderiza `filho` com o estado vivo do banco (como a Casca faz). */
export function ComEstado({ filho }: { filho: (e: Estado) => JSX.Element }) {
  const estado = usarEstado();
  return estado ? filho(estado) : null;
}

export function renderizar(ui: ComponentChildren, base: JuliusDB, hoje: DataISO = HOJE) {
  return render(
    <Provedores base={base} hoje={hoje}>
      {ui}
    </Provedores>,
  );
}

/** O normalizador padrão do testing-library troca U+00A0 por espaço comum; com este, o texto é conferido byte a byte. */
export const SEM_NORMALIZAR = { normalizer: (t: string) => t };
