import { Navegacao } from './componentes/Navegacao';
import { usarEstado, type Estado } from './estado';
import { usarRota, type Rota } from './rota';
import { Ajustes } from './telas/Ajustes';
import { Backup } from './telas/Backup';
import { BoasVindas } from './telas/BoasVindas';
import { Categorias } from './telas/Categorias';
import { DetalheDespesa } from './telas/DetalheDespesa';
import { Despesas } from './telas/Despesas';
import { FormDespesa } from './telas/FormDespesa';
import { Inicio } from './telas/Inicio';
import { Lancamentos } from './telas/Lancamentos';
import { Marcas } from './telas/Marcas';
import { Meios } from './telas/Meios';
import { OndeFicamDados } from './telas/OndeFicamDados';

function Tela({ rota, estado }: { rota: Rota; estado: Estado }) {
  switch (rota.tela) {
    case 'inicio':
      return <Inicio estado={estado} />;
    case 'lancamentos':
      return <Lancamentos estado={estado} />;
    case 'nova':
      return <FormDespesa key="nova" estado={estado} />;
    case 'editar':
      return <FormDespesa key={`editar-${rota.id}`} estado={estado} id={rota.id} />;
    case 'despesas':
      return <Despesas estado={estado} />;
    case 'despesa':
      return <DetalheDespesa key={rota.id} estado={estado} id={rota.id} />;
    case 'ajustes':
      return <Ajustes />;
    case 'categorias':
      return <Categorias estado={estado} />;
    case 'marcas':
      return <Marcas estado={estado} />;
    case 'meios':
      return <Meios estado={estado} />;
    case 'backup':
      return <Backup estado={estado} />;
    case 'dados':
      return <OndeFicamDados />;
  }
}

export function Casca() {
  const rota = usarRota();
  const estado = usarEstado();
  if (!estado) {
    return (
      <div class="carregando" role="status">
        Carregando…
      </div>
    );
  }
  const vazio = estado.categorias.length === 0 && estado.despesas.length === 0;
  return (
    <div class="casca">
      <Navegacao rota={rota} />
      <main class="conteudo" id="conteudo">
        {vazio && rota.tela !== 'dados' ? <BoasVindas estado={estado} /> : <Tela rota={rota} estado={estado} />}
      </main>
    </div>
  );
}
