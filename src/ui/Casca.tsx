import { EstadoVazio } from './componentes/EstadoVazio';
import { Navegacao } from './componentes/Navegacao';
import { usarEstado, type Estado } from './estado';
import { usarRota, type Rota } from './rota';

// Provisório: cada tela é ligada nas Tasks 11 a 15; a Task 15 remove este componente.
function EmBreve() {
  return <EstadoVazio icone="tool" titulo="Em construção" texto="Esta tela chega numa próxima etapa." />;
}

function Tela({ rota, estado: _estado }: { rota: Rota; estado: Estado }) {
  switch (rota.tela) {
    default:
      return <EmBreve />;
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
  return (
    <div class="casca">
      <Navegacao rota={rota} />
      <main class="conteudo" id="conteudo">
        <Tela rota={rota} estado={estado} />
      </main>
    </div>
  );
}
