import { describe, expect, it } from 'vitest';
import { BANCOS, CORES_CARTAO, buscarBanco, filtrarBancos, logoDoBanco } from '../../src/marcas/bancos';

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrasteComBranco = (hex: string) => 1.05 / (luminancia(hex) + 0.05);

describe('bancos', () => {
  it('toda cor de cartão aceita texto branco com contraste AA', () => {
    for (const cor of [...BANCOS.map((b) => b.cor), ...CORES_CARTAO]) {
      expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(contrasteComBranco(cor), cor).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('slugs únicos e logos que existem no catálogo', () => {
    expect(new Set(BANCOS.map((b) => b.slug)).size).toBe(BANCOS.length);
    for (const b of BANCOS.filter((x) => x.logo)) expect(logoDoBanco(b.slug), b.slug).toBeDefined();
  });

  it('busca ignora acento e caixa', () => {
    expect(filtrarBancos('itau').map((b) => b.slug)).toEqual(['itau']);
    expect(filtrarBancos('')).toBe(BANCOS);
    expect(buscarBanco('inexistente')).toBeUndefined();
    expect(buscarBanco(undefined)).toBeUndefined();
  });
});
