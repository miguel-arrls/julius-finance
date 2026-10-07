import { describe, expect, it } from 'vitest';
import { dividirEmParcelas, formatarNumero, formatarReais, lerReais } from '../../src/dominio/dinheiro';

describe('formatarReais', () => {
  it.each([
    [123456, 'R$ 1.234,56'],
    [5, 'R$ 0,05'],
    [0, 'R$ 0,00'],
    [-500, '-R$ 5,00'],
    [100000000, 'R$ 1.000.000,00'],
  ])('%i → %s', (centavos, esperado) => {
    expect(formatarReais(centavos)).toBe(esperado);
  });

  it('usa espaço não separável (U+00A0) depois de R$', () => {
    expect(formatarReais(100).charCodeAt(2)).toBe(0xa0);
    expect(formatarReais(-100).charCodeAt(3)).toBe(0xa0);
  });
});

describe('formatarNumero', () => {
  it('formata sem símbolo, para campos de edição', () => {
    expect(formatarNumero(123456)).toBe('1.234,56');
    expect(formatarNumero(590)).toBe('5,90');
  });
});

describe('lerReais', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['R$ 12,3', 1230],
    ['12.5', 1250],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['1234', 123400],
    [',5', 50],
    ['0', 0],
    [' R$ 1.000,00 ', 100000],
  ])('"%s" → %i centavos', (texto, esperado) => {
    expect(lerReais(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '-5', '1,2,3', '12,345', '1.23.4', '12a'])('"%s" é inválido', (texto) => {
    expect(lerReais(texto)).toBeNull();
  });
});

describe('dividirEmParcelas', () => {
  it('põe os centavos restantes na 1ª parcela', () => {
    expect(dividirEmParcelas(100000, 3)).toEqual([33334, 33333, 33333]);
  });

  it('divide exato quando possível', () => {
    expect(dividirEmParcelas(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it('a soma das parcelas é sempre igual ao total', () => {
    for (let total = 1; total <= 500; total += 7) {
      for (let n = 1; n <= 12; n++) {
        const soma = dividirEmParcelas(total, n).reduce((a, b) => a + b, 0);
        expect(soma).toBe(total);
      }
    }
  });
});
