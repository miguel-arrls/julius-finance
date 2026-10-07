import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

type Resultado<T> = { v: T; erro?: undefined } | { erro: unknown };

/**
 * Executa a consulta e a repete sempre que as tabelas lidas mudarem.
 * Se a consulta falhar, o erro é relançado no render para um error boundary tratar.
 */
export function usarConsulta<T>(consulta: () => Promise<T>, deps: unknown[]): T | undefined {
  const [resultado, setResultado] = useState<Resultado<T> | undefined>(undefined);
  useEffect(() => {
    const assinatura = liveQuery(consulta).subscribe({
      next: (v) => setResultado({ v }),
      error: (e: unknown) => {
        console.error(e);
        setResultado({ erro: e ?? new Error('Falha na leitura dos dados') });
      },
    });
    return () => assinatura.unsubscribe();
  }, deps);
  if (resultado && 'erro' in resultado && resultado.erro !== undefined) throw resultado.erro;
  return resultado && 'v' in resultado ? resultado.v : undefined;
}
