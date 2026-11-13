import { describe, expect, it } from 'vitest';
import { backupDoCenario, CENARIOS, HOJE } from '../../e2e/layout/cenarios';
import { lerBackup } from '../../src/dados/backup';
import { situacao } from '../../src/dominio/situacao';

describe('cenários da matriz de layout', () => {
  for (const nome of Object.keys(CENARIOS).filter((n) => CENARIOS[n] !== null)) {
    it(`${nome}: é um backup que o app aceita (round-trip com acentos e ⟦⟧)`, () => {
      const arquivo = backupDoCenario(nome)!;
      const lido = lerBackup(JSON.stringify(arquivo));
      expect(lido.ok).toBe(true);
    });
  }

  it('carregado cobre os estados que a matriz promete', () => {
    const { dados } = backupDoCenario('carregado')!;
    const doMes = dados.lancamentos.filter((l) => l.mes === '2026-11');
    const situacoes = new Set(doMes.map((l) => situacao(l, HOJE)));
    expect([...situacoes].sort()).toEqual(['atrasada', 'paga', 'pendente', 'sem-vencimento']);
    expect(dados.meiosPagamento.filter((m) => m.tipo === 'credito').length).toBeGreaterThanOrEqual(3);
    expect(dados.despesas.some((d) => d.descricao.includes('⟦') && d.descricao.length > 60)).toBe(true);
    expect(Math.max(...dados.lancamentos.map((l) => l.valor))).toBeGreaterThanOrEqual(100_000_000);
  });
});
