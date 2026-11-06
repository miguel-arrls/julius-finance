import { IconChartBar, IconHome, IconListDetails, IconPlus, IconRepeat, IconSettings } from '@tabler/icons-preact';
import type { Rota } from '../rota';

type Grupo = 'inicio' | 'lancamentos' | 'nova' | 'despesas' | 'analise' | 'ajustes';

function grupoDaRota(tela: Rota['tela']): Grupo {
  if (tela === 'despesa' || tela === 'editar') return 'despesas';
  if (tela === 'categorias' || tela === 'marcas' || tela === 'meios' || tela === 'backup' || tela === 'dados') return 'ajustes';
  return tela;
}

/** Abas do celular. Ajustes fica na engrenagem do Início (e na lateral, no PC). */
const ABAS = [
  { grupo: 'inicio', rotulo: 'Início', href: '#/inicio', Icone: IconHome },
  { grupo: 'lancamentos', rotulo: 'Lançamentos', href: '#/lancamentos', Icone: IconListDetails },
  { grupo: 'despesas', rotulo: 'Despesas', href: '#/despesas', Icone: IconRepeat },
  { grupo: 'analise', rotulo: 'Análise', href: '#/analise', Icone: IconChartBar },
] as const;

export function Navegacao({ rota }: { rota: Rota }) {
  const atual = grupoDaRota(rota.tela);
  return (
    <nav class="navegacao" aria-label="Principal">
      <span class="nav-marca">Julius</span>
      <a href="#/nova" class="nav-nova" aria-label="Nova despesa" aria-current={atual === 'nova' ? 'page' : undefined}>
        <IconPlus size={28} stroke={2.2} aria-hidden="true" />
        <span class="nav-nova-rotulo">Nova despesa</span>
      </a>
      {ABAS.map((i) => (
        <a key={i.grupo} href={i.href} class="nav-item" aria-current={atual === i.grupo ? 'page' : undefined}>
          <i.Icone size={24} stroke={1.75} aria-hidden="true" />
          <span>{i.rotulo}</span>
        </a>
      ))}
      <a href="#/ajustes" class="nav-item nav-so-largo" aria-current={atual === 'ajustes' ? 'page' : undefined}>
        <IconSettings size={24} stroke={1.75} aria-hidden="true" />
        <span>Ajustes</span>
      </a>
    </nav>
  );
}
