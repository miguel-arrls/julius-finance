import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { JuliusDB } from '../dados/db';
import { mesDe } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { ToastProvider } from './componentes/Toast';
import { BaseContexto, HojeContexto, MesContexto } from './contexto';

export function Provedores({ base, hoje, children }: { base: JuliusDB; hoje: DataISO; children: ComponentChildren }) {
  const [mes, setMes] = useState(mesDe(hoje));
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
