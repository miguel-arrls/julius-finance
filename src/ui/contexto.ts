import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { db, type JuliusDB } from '../dados/db';
import { hojeISO, mesDe } from '../dominio/datas';
import type { DataISO, MesISO } from '../dominio/tipos';

export interface EstadoMes {
  mes: MesISO;
  setMes: (m: MesISO) => void;
}

export const BaseContexto = createContext<JuliusDB>(db);
export const HojeContexto = createContext<DataISO>(hojeISO());
export const MesContexto = createContext<EstadoMes>({ mes: mesDe(hojeISO()), setMes: () => undefined });

export const usarBase = (): JuliusDB => useContext(BaseContexto);
export const usarHoje = (): DataISO => useContext(HojeContexto);
export const usarMes = (): EstadoMes => useContext(MesContexto);
