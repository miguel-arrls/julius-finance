import type { DataISO, MesISO } from './tipos';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

const p2 = (n: number): string => String(n).padStart(2, '0');

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Cria uma data; dia maior que o mês é ajustado para o último dia. */
export function criarData(ano: number, mes: number, dia: number): DataISO {
  const d = Math.min(dia, ultimoDiaDoMes(ano, mes));
  return `${String(ano).padStart(4, '0')}-${p2(mes)}-${p2(d)}`;
}

export function partes(data: DataISO): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split('-').map(Number);
  return { ano: ano!, mes: mes!, dia: dia! };
}

export function ehDataISO(valor: unknown): valor is DataISO {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const { ano, mes, dia } = partes(valor);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= ultimoDiaDoMes(ano, mes);
}

export function ehMesISO(valor: unknown): valor is MesISO {
  return typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7);
}

export function dataNoMes(mes: MesISO, dia: number): DataISO {
  const [ano, m] = mes.split('-').map(Number);
  return criarData(ano!, m!, dia);
}

/** Soma meses mantendo o dia original, ajustado ao fim de meses curtos. */
export function somarMeses(data: DataISO, n: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const total = ano * 12 + (mes - 1) + n;
  return criarData(Math.floor(total / 12), (total % 12) + 1, dia);
}

export function somarMesesAoMes(mes: MesISO, n: number): MesISO {
  return mesDe(somarMeses(`${mes}-01`, n));
}

export function somarDias(data: DataISO, n: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return criarData(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function diferencaEmDias(de: DataISO, ate: DataISO): number {
  const a = partes(de);
  const b = partes(ate);
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000);
}

export function ultimoDia(mes: MesISO): DataISO {
  return dataNoMes(mes, 31);
}

/** Data de hoje no fuso do aparelho. */
export function hojeISO(agora: Date = new Date()): DataISO {
  return criarData(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

export function formatarData(data: DataISO): string {
  const { ano, mes, dia } = partes(data);
  return `${p2(dia)}/${p2(mes)}/${ano}`;
}

export function formatarDataCurta(data: DataISO): string {
  const { mes, dia } = partes(data);
  return `${p2(dia)}/${p2(mes)}`;
}

/** Instante ISO completo (com hora e fuso) → 'dd/mm/aaaa hh:mm' no fuso local. */
export function formatarDataHora(instante: string): string {
  const d = new Date(instante);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function formatarMes(mes: MesISO): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m! - 1]} de ${ano}`;
}

export function formatarMesCurto(mes: MesISO): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m! - 1]!.slice(0, 3)}/${ano}`;
}

export function formatarMesCsv(mes: MesISO): string {
  const [ano, m] = mes.split('-');
  return `${m}/${ano}`;
}
