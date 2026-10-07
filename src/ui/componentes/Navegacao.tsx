import { IconHome, IconListDetails, IconPlus, IconRepeat, IconSettings } from '@tabler/icons-preact';
import type { Rota } from '../rota';

type Grupo = 'inicio' | 'lancamentos' | 'nova' | 'despesas' | 'ajustes';

function grupoDaRota(tela: Rota['tela']): Grupo {
  if (tela === 'despesa' || tela === 'editar') return 'despesas';
  if (tela === 'categorias' || tela === 'marcas' || tela === 'meios' || tela === 'backup' || tela === 'dados') return 'ajustes';
  return tela;
}

const ITENS = [
  { grupo: 'inicio', rotulo: 'Início', href: '#/inicio', Icone: IconHome },
  { grupo: 'lancamentos', rotulo: 'Lançamentos', href: '#/lancamentos', Icone: IconListDetails },
  { grupo: 'despesas', rotulo: 'Despesas', href: '#/despesas', Icone: IconRepeat },
  { grupo: 'ajustes', rotulo: 'Ajustes', href: '#/ajustes', Icone: IconSettings },
] as const;

export function Navegacao({ rota }: { rota: Rota }) {
  const atual = grupoDaRota(rota.tela);
  const link = (i: (typeof ITENS)[number]) => (
    <a key={i.grupo} href={i.href} class="nav-item" aria-current={atual === i.grupo ? 'page' : undefined}>
      <i.Icone size={24} stroke={1.75} aria-hidden="true" />
      <span>{i.rotulo}</span>
    </a>
  );
  return (
    <nav class="navegacao" aria-label="Principal">
      <span class="nav-marca">Julius</span>
      {link(ITENS[0])}
      {link(ITENS[1])}
      <a href="#/nova" class="nav-nova" aria-label="Nova despesa" aria-current={atual === 'nova' ? 'page' : undefined}>
        <IconPlus size={28} stroke={2} aria-hidden="true" />
        <span class="nav-nova-rotulo">Nova despesa</span>
      </a>
      {link(ITENS[2])}
      {link(ITENS[3])}
    </nav>
  );
}
