import { describe, expect, it } from 'vitest';
import { situacao } from '../../src/dominio/situacao';
import { lanc } from '../fabricas';

const HOJE = '2026-10-06';

describe('situacao', () => {
  it('paga quando tem data de pagamento, mesmo vencida', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-09-01', pagoEm: '2026-09-02' }), HOJE)).toBe('paga');
  });
  it('sem vencimento nunca é atrasada', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd' }), HOJE)).toBe('sem-vencimento');
  });
  it('atrasada quando o vencimento já passou', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-05' }), HOJE)).toBe('atrasada');
  });
  it('pendente quando vence hoje ou depois', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-06' }), HOJE)).toBe('pendente');
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-07' }), HOJE)).toBe('pendente');
  });
});
