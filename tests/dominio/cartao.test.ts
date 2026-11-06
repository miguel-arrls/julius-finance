import { describe, expect, it } from 'vitest';
import { diferencaEmDias } from '../../src/dominio/datas';
import { fechamentoDaFatura, vencimentoNoCartao } from '../../src/dominio/cartao';

describe('vencimentoNoCartao (fecha dia 2, vence dia 7)', () => {
  it.each([
    ['2026-10-01', '2026-10-07'], // antes do fechamento: fatura que fecha em 02/10
    ['2026-10-02', '2026-11-07'], // no dia do fechamento: fatura seguinte (regra confirmada)
    ['2026-10-08', '2026-11-07'],
    ['2026-11-01', '2026-11-07'],
    ['2026-12-15', '2027-01-07'], // virada de ano
  ])('cobrança em %s vence em %s', (cobranca, esperado) => {
    expect(vencimentoNoCartao(cobranca, 2, 7)).toBe(esperado);
  });
});

describe('vencimentoNoCartao com vencimento antes do fechamento no mês (fecha 25, vence 5)', () => {
  it('vence no mês seguinte ao fechamento', () => {
    expect(vencimentoNoCartao('2026-10-10', 25, 5)).toBe('2026-11-05');
    expect(vencimentoNoCartao('2026-10-26', 25, 5)).toBe('2026-12-05');
  });
});

describe('vencimentoNoCartao com fechamento no dia 31', () => {
  it('fevereiro fecha no dia 28', () => {
    expect(vencimentoNoCartao('2026-02-15', 31, 10)).toBe('2026-03-10');
  });
  it('cobrança no último dia de fevereiro é o dia do fechamento: vai para a seguinte', () => {
    expect(vencimentoNoCartao('2026-02-28', 31, 10)).toBe('2026-04-10');
  });
});

describe('fechamentoDaFatura', () => {
  it('fecha no mesmo mês quando o fechamento vem antes do vencimento', () => expect(fechamentoDaFatura('2026-11-07', 2)).toBe('2026-11-02'));
  it('fecha no mês anterior quando o fechamento é depois do dia do vencimento', () => expect(fechamentoDaFatura('2026-11-05', 25)).toBe('2026-10-25'));
  it('virada de ano', () => expect(fechamentoDaFatura('2027-01-05', 25)).toBe('2026-12-25'));
  it('fechamento no dia 31 em mês curto', () => expect(fechamentoDaFatura('2026-03-10', 31)).toBe('2026-02-28'));
  it('é o inverso de vencimentoNoCartao', () => {
    for (const compra of ['2026-10-01', '2026-10-02', '2026-10-24', '2026-10-25', '2026-12-31']) {
      for (const [f, v] of [[2, 7], [25, 5], [31, 10]] as const) {
        const venc = vencimentoNoCartao(compra, f, v);
        const fecha = fechamentoDaFatura(venc, f);
        // A compra entra na fatura que fecha depois dela, no máximo um mês depois, e que vence depois de fechar.
        expect(fecha > compra, `${compra} ${f}/${v}`).toBe(true);
        expect(diferencaEmDias(compra, fecha), `${compra} ${f}/${v}`).toBeLessThanOrEqual(31);
        expect(fecha < venc, `${compra} ${f}/${v}`).toBe(true);
      }
    }
  });
});
