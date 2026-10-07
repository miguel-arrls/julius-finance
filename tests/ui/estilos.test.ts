import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/ui/estilos.css'), { encoding: 'utf-8' });

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Declarações da primeira regra cujo seletor é exatamente `seletor`. */
function regra(seletor: string, texto = css): Record<string, string> {
  const m = new RegExp(`(?:^|[}\\n])\\s*${escapar(seletor)}\\s*\\{([^}]*)\\}`).exec(texto);
  if (!m) throw new Error(`Regra não encontrada: ${seletor}`);
  return Object.fromEntries(
    m[1]!
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]),
  );
}

const temaClaro = regra(':root');
const temaEscuro = regra(':root', css.slice(css.indexOf('@media (prefers-color-scheme: dark)') + '@media (prefers-color-scheme: dark) {'.length));

/** Resolve `var(--x)` no tema (o escuro herda do claro o que não redefine). */
function cor(valor: string, tema: Record<string, string>): string {
  const v = /^var\((--[\w-]+)\)$/.exec(valor);
  return v ? (tema[v[1]!] ?? temaClaro[v[1]!]!) : valor;
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe('estilos: contraste (WCAG AA, 4,5:1)', () => {
  for (const [nome, tema] of [
    ['claro', temaClaro],
    ['escuro', temaEscuro],
  ] as const) {
    it(`links no tema ${nome}, sobre o fundo e sobre a superfície`, () => {
      const link = cor(regra('a').color!, tema);
      expect(contraste(link, cor('var(--fundo)', tema))).toBeGreaterThanOrEqual(4.5);
      expect(contraste(link, cor('var(--superficie)', tema))).toBeGreaterThanOrEqual(4.5);
    });

    it(`filtro ativo no tema ${nome}`, () => {
      const r = regra('.filtros select.ativo');
      expect(contraste(cor(r.color!, tema), cor(r.background!, tema))).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('estilos: alvos de toque e fonte', () => {
  it.each(['.segmentado button', '.filtros select', '.toast-acao'])('%s tem pelo menos 44 px de altura', (seletor) => {
    expect(regra(seletor)['min-height']).toBe('var(--toque)');
    expect(temaClaro['--toque']).toBe('44px');
  });

  it('.filtros select usa fonte de 16 px (o iOS não dá zoom)', () => {
    expect(regra('.filtros select')['font-size']).toBe('16px');
  });
});
