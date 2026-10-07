import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

/** Executa a consulta e a repete sempre que as tabelas lidas mudarem. */
export function usarConsulta<T>(consulta: () => Promise<T>, deps: unknown[]): T | undefined {
  const [valor, setValor] = useState<{ v: T } | undefined>(undefined);
  useEffect(() => {
    const assinatura = liveQuery(consulta).subscribe({
      next: (v) => setValor({ v }),
      error: (e: unknown) => console.error(e),
    });
    return () => assinatura.unsubscribe();
  }, deps);
  return valor?.v;
}
