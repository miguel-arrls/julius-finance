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
    ['#/qualquer-coisa', { tela: 'inicio' }],
    ['#/nova/demais', { tela: 'inicio' }],
    ['#/inicio', { tela: 'inicio' }],
    ['#/editar/%', { tela: 'inicio' }],
    ['#/despesas/%E0%A4%A', { tela: 'inicio' }],
  ])('lerRota(%s)', (hash, esperado) => {
    expect(lerRota(hash)).toEqual(esperado);
  });

  it('caminho e lerRota são inversos', () => {
    const rotas: Rota[] = [
      { tela: 'inicio' }, { tela: 'lancamentos' }, { tela: 'nova' }, { tela: 'editar', id: 'a#1 b' },
      { tela: 'despesas' }, { tela: 'despesa', id: 'r@2026-10' }, { tela: 'ajustes' }, { tela: 'categorias' },
      { tela: 'marcas' }, { tela: 'meios' }, { tela: 'backup' }, { tela: 'dados' },
    ];
    for (const r of rotas) expect(lerRota(caminho(r))).toEqual(r);
  });
});
