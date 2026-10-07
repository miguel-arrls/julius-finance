import { describe, expect, it } from 'vitest';
import { deslizePaga } from '../../src/ui/componentes/LinhaLancamento';

describe('deslizePaga', () => {
  it('paga ao deslizar mais de 70 px para a esquerda', () => expect(deslizePaga(-80, 0, true)).toBe(true));
  it('não paga com deslize curto', () => expect(deslizePaga(-60, 0, true)).toBe(false));
  it('não paga ao deslizar para a direita', () => expect(deslizePaga(80, 0, true)).toBe(false));
  it('não paga se o movimento é mais vertical (rolagem)', () => expect(deslizePaga(-80, 100, true)).toBe(false));
  it('não paga se não pode pagar', () => expect(deslizePaga(-80, 0, false)).toBe(false));
});
