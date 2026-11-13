import { describe, expect, it } from 'vitest';
import { caminho, lerRota, type Rota } from '../../src/ui/rota';

describe('rotas', () => {
  it.each<[string, Rota]>([
    ['', { tela: 'inicio' }],
    ['#/', { tela: 'inicio' }],
    ['#/lancamentos', { tela: 'lancamentos' }],
    ['#/nova', { tela: 'nova' }],
    ['#/despesas', { tela: 'despesas' }],
    ['#/despesas/abc', { tela: 'despesa', id: 'abc' }],
    ['#/editar/x%20y', { tela: 'editar', id: 'x y' }],
    ['#/backup', { tela: 'backup' }],
    ['#/analise', { tela: 'analise' }],
    ['#/qualquer-coisa', { tela: 'inicio' }],
    ['#/nova/demais', { tela: 'inicio' }],
    ['#/inicio', { tela: 'inicio' }],
    ['#/editar/%', { tela: 'inicio' }],
    ['#/despesas/%E0%A4%A', { tela: 'inicio' }],
    ['#/lancamentos?mes=2026-10&situacao=atrasada', { tela: 'lancamentos', filtros: { mes: '2026-10', situacao: 'atrasada' } }],
    ['#/lancamentos?categoria=cat-sa%C3%BAde&meio=mp%231&tipo=parcelada', { tela: 'lancamentos', filtros: { categoriaId: 'cat-saúde', meioPagamentoId: 'mp#1', tipo: 'parcelada' } }],
    ['#/lancamentos?mes=2026-13&situacao=quitada&tipo=x', { tela: 'lancamentos' }],
    ['#/lancamentos?mes=2026-1&situacao=paga', { tela: 'lancamentos', filtros: { situacao: 'paga' } }],
    ['#/lancamentos?', { tela: 'lancamentos' }],
    ['#/nova?de=av1', { tela: 'nova', de: 'av1' }],
    ['#/lancamentos?mes=todos&situacao=atrasada', { tela: 'lancamentos', filtros: { todosMeses: true, situacao: 'atrasada' } }],
    ['#/nova?de=', { tela: 'nova' }],
    ['#/inicio?mes=2026-10', { tela: 'inicio' }],
  ])('lerRota(%s)', (hash, esperado) => {
    expect(lerRota(hash)).toEqual(esperado);
  });

  it('caminho e lerRota são inversos', () => {
    const rotas: Rota[] = [
      { tela: 'inicio' }, { tela: 'lancamentos' }, { tela: 'nova' }, { tela: 'editar', id: 'a#1 b' },
      { tela: 'despesas' }, { tela: 'despesa', id: 'r@2026-10' }, { tela: 'ajustes' }, { tela: 'categorias' },
      { tela: 'marcas' }, { tela: 'meios' }, { tela: 'backup' }, { tela: 'dados' }, { tela: 'analise' },
      { tela: 'nova', de: 'r@2026-10 ⟦ç⟧' },
      { tela: 'lancamentos', filtros: { mes: '2027-01', situacao: 'sem-vencimento', categoriaId: 'cat ⟦é⟧&x=1', meioPagamentoId: 'mp?1', tipo: 'recorrente' } },
      { tela: 'lancamentos', filtros: { meioPagamentoId: 'mp-cartao' } },
    ];
    for (const r of rotas) expect(lerRota(caminho(r))).toEqual(r);
  });

  it('caminho omite filtros vazios', () => {
    expect(caminho({ tela: 'lancamentos', filtros: {} })).toBe('#/lancamentos');
    expect(caminho({ tela: 'lancamentos', filtros: { mes: '2026-10', situacao: 'pendente' } })).toBe('#/lancamentos?mes=2026-10&situacao=pendente');
  });
});
