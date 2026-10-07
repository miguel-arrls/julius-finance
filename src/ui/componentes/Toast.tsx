import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';

interface AcaoToast {
  rotulo: string;
  executar: () => void;
}
interface Aviso {
  id: number;
  texto: string;
  acao?: AcaoToast;
}
type Mostrar = (texto: string, acao?: AcaoToast) => void;

const ToastContexto = createContext<Mostrar>(() => undefined);

export const usarToast = (): Mostrar => useContext(ToastContexto);

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const mostrar = useCallback<Mostrar>((texto, acao) => setAviso({ id: Date.now(), texto, acao }), []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <ToastContexto.Provider value={mostrar}>
      {children}
      <div class="toast-area" aria-live="polite">
        {aviso && (
          <div class="toast" key={aviso.id}>
            <span>{aviso.texto}</span>
            {aviso.acao && (
              <button
                type="button"
                class="toast-acao"
                onClick={() => {
                  aviso.acao!.executar();
                  setAviso(null);
                }}
              >
                {aviso.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContexto.Provider>
  );
}
