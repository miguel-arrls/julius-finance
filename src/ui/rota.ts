import { useEffect, useState } from 'preact/hooks';

export type Rota =
  | { tela: 'inicio' }
  | { tela: 'lancamentos' }
  | { tela: 'nova' }
  | { tela: 'editar'; id: string }
  | { tela: 'despesas' }
  | { tela: 'despesa'; id: string }
  | { tela: 'ajustes' }
  | { tela: 'categorias' }
  | { tela: 'marcas' }
  | { tela: 'meios' }
  | { tela: 'backup' }
  | { tela: 'dados' };

type TelaSimples = Exclude<Rota['tela'], 'editar' | 'despesa'>;
const SIMPLES: readonly TelaSimples[] = [
  'inicio', 'lancamentos', 'nova', 'despesas', 'ajustes', 'categorias', 'marcas', 'meios', 'backup', 'dados',
];

export function lerRota(hash: string): Rota {
  let partes: string[];
  try {
    partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { tela: 'inicio' }; // hash malformado (ex.: %)
  }
  const [a, b, c] = partes;
  if (c !== undefined) return { tela: 'inicio' };
  if (a === 'editar' && b) return { tela: 'editar', id: b };
  if (a === 'despesas' && b) return { tela: 'despesa', id: b };
  if (b === undefined && SIMPLES.includes(a as TelaSimples)) return { tela: a as TelaSimples };
  return { tela: 'inicio' };
}

export function caminho(r: Rota): string {
  if (r.tela === 'editar') return `#/editar/${encodeURIComponent(r.id)}`;
  if (r.tela === 'despesa') return `#/despesas/${encodeURIComponent(r.id)}`;
  return `#/${r.tela}`;
}

export function navegar(r: Rota): void {
  location.hash = caminho(r);
}

export function usarRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(location.hash));
  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota(location.hash));
      try {
        window.scrollTo(0, 0);
      } catch {
        // jsdom não implementa scrollTo
      }
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return rota;
}
