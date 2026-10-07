import { IconChevronLeft, IconChevronRight } from '@tabler/icons-preact';
import { formatarMes, somarMesesAoMes } from '../../dominio/datas';
import { usarMes } from '../contexto';

export function SeletorMes() {
  const { mes, setMes } = usarMes();
  return (
    <div class="seletor-mes">
      <button type="button" class="botao-icone" aria-label="Mês anterior" onClick={() => setMes(somarMesesAoMes(mes, -1))}>
        <IconChevronLeft aria-hidden="true" />
      </button>
      <h1 class="seletor-mes-titulo">{formatarMes(mes)}</h1>
      <button type="button" class="botao-icone" aria-label="Próximo mês" onClick={() => setMes(somarMesesAoMes(mes, 1))}>
        <IconChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
