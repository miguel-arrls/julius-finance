import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { JuliusDB } from '../dados/db';
import { mesDe } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { ToastProvider } from './componentes/Toast';
import { BaseContexto, HojeContexto, MesContexto } from './contexto';

export function Provedores({ base, hoje, children }: { base: JuliusDB; hoje: DataISO; children: ComponentChildren }) {
  const [mes, setMes] = useState(mesDe(hoje));
  // Quando "hoje" muda (app aberto na virada do mês), acompanha o novo mês se o mostrado era o atual.
  const hojeAnterior = useRef(hoje);
  useEffect(() => {
    const mesAnterior = mesDe(hojeAnterior.current);
    hojeAnterior.current = hoje;
    setMes((m) => (m === mesAnterior ? mesDe(hoje) : m));
  }, [hoje]);
  return (
    <BaseContexto.Provider value={base}>
      <HojeContexto.Provider value={hoje}>
        <MesContexto.Provider value={{ mes, setMes }}>
          <ToastProvider>{children}</ToastProvider>
        </MesContexto.Provider>
      </HojeContexto.Provider>
    </BaseContexto.Provider>
  );
}
