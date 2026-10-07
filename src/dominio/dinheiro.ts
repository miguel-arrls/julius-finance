import type { Centavos } from './tipos';

function separarMilhar(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** '1.234,56' — para campos de edição. */
export function formatarNumero(c: Centavos): string {
  const abs = Math.abs(c);
  const sinal = c < 0 ? '-' : '';
  return `${sinal}${separarMilhar(Math.floor(abs / 100))},${String(abs % 100).padStart(2, '0')}`;
}

/** 'R$ 1.234,56' com espaço não separável. */
export function formatarReais(c: Centavos): string {
  return `${c < 0 ? '-' : ''}R$ ${formatarNumero(Math.abs(c))}`;
}

/**
 * Lê um valor digitado em reais. Aceita '1.234,56', '1234,56', '12.5', '1.234' (milhar),
 * 'R$ 10,00'. Devolve null para texto inválido ou negativo.
 */
export function lerReais(texto: string): Centavos | null {
  const s = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '' || !/^[\d.,]+$/.test(s)) return null;

  let inteiro: string;
  let decimal = '';
  if (s.includes(',')) {
    const partes = s.split(',');
    if (partes.length !== 2) return null;
    inteiro = partes[0]!;
    decimal = partes[1]!;
    if (inteiro.includes('.')) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(inteiro)) return null;
      inteiro = inteiro.replace(/\./g, '');
    }
  } else if (s.includes('.')) {
    const partes = s.split('.');
    if (partes.length === 2 && partes[1]!.length <= 2) {
      inteiro = partes[0]!;
      decimal = partes[1]!;
    } else {
      if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
      inteiro = s.replace(/\./g, '');
    }
  } else {
    inteiro = s;
  }

  if (inteiro === '') inteiro = '0';
  if (!/^\d+$/.test(inteiro) || !/^\d{0,2}$/.test(decimal)) return null;
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
}

/** Divide um total em n parcelas; os centavos restantes vão para a 1ª. */
export function dividirEmParcelas(total: Centavos, n: number): Centavos[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}
