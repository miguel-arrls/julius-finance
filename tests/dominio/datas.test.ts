import { describe, expect, it } from 'vitest';
import {
  criarData,
  dataNoMes,
  diferencaEmDias,
  ehDataISO,
  ehMesISO,
  formatarData,
  formatarDataCurta,
  formatarDataHora,
  formatarMes,
  formatarMesCsv,
  formatarMesCurto,
  hojeISO,
  mesDe,
  somarDias,
  somarMeses,
  somarMesesAoMes,
  ultimoDia,
} from '../../src/dominio/datas';

describe('somarMeses', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-01-31', 2, '2026-03-31'],
    ['2026-12-15', 1, '2027-01-15'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2024-02-29', 12, '2025-02-28'],
  ])('%s + %i meses = %s', (data, n, esperado) => {
    expect(somarMeses(data, n)).toBe(esperado);
  });
});

describe('somarDias e diferencaEmDias', () => {
  it('atravessa a virada de ano', () => {
    expect(somarDias('2026-12-28', 7)).toBe('2027-01-04');
  });
  it('volta para fevereiro', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('conta dias entre datas', () => {
    expect(diferencaEmDias('2026-10-06', '2026-10-08')).toBe(2);
    expect(diferencaEmDias('2026-10-06', '2027-10-31')).toBe(390);
  });
});

describe('meses', () => {
  it('mesDe, somarMesesAoMes, ultimoDia e dataNoMes', () => {
    expect(mesDe('2026-10-07')).toBe('2026-10');
    expect(somarMesesAoMes('2026-12', 1)).toBe('2027-01');
    expect(somarMesesAoMes('2026-01', -1)).toBe('2025-12');
    expect(ultimoDia('2026-02')).toBe('2026-02-28');
    expect(dataNoMes('2026-04', 31)).toBe('2026-04-30');
  });
});

describe('validação', () => {
  it.each([
    ['2026-02-29', false],
    ['2028-02-29', true],
    ['2026-13-01', false],
    ['26-01-01', false],
    ['2026-1-01', false],
    [123, false],
  ])('ehDataISO(%s) = %s', (valor, esperado) => {
    expect(ehDataISO(valor)).toBe(esperado);
  });

  it('ehMesISO', () => {
    expect(ehMesISO('2026-10')).toBe(true);
    expect(ehMesISO('2026-00')).toBe(false);
    expect(ehMesISO('2026-10-01')).toBe(false);
  });

  it('criarData ajusta o dia ao fim do mês', () => {
    expect(criarData(2026, 2, 30)).toBe('2026-02-28');
  });
});

describe('hojeISO', () => {
  it('usa o dia local, não o dia UTC', () => {
    // 01:30 UTC de 07/10 = 22:30 de 06/10 em São Paulo.
    expect(hojeISO(new Date(Date.UTC(2026, 9, 7, 1, 30)))).toBe('2026-10-06');
  });
});

describe('formatação', () => {
  it('datas e meses em pt-BR', () => {
    expect(formatarData('2026-10-07')).toBe('07/10/2026');
    expect(formatarDataCurta('2026-10-07')).toBe('07/10');
    expect(formatarMes('2026-10')).toBe('outubro de 2026');
    expect(formatarMes('2026-03')).toBe('março de 2026');
    expect(formatarMesCurto('2026-03')).toBe('mar/2026');
    expect(formatarMesCsv('2026-03')).toBe('03/2026');
  });

  it('data e hora de um instante, no fuso local', () => {
    expect(formatarDataHora('2026-10-07T01:30:00.000Z')).toBe('06/10/2026 22:30');
  });
});
