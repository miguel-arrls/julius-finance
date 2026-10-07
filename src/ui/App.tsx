import { useEffect, useState } from 'preact/hooks';
import { db, type JuliusDB } from '../dados/db';
import { materializarTodas } from '../dados/repositorio';
import { hojeISO } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { Casca } from './Casca';
import { Provedores } from './Provedores';

function ErroArmazenamento() {
  return (
    <main class="erro-armazenamento">
      <h1>Não foi possível abrir seus dados</h1>
      <p>O navegador bloqueou o armazenamento deste app. Isso acontece em janelas privadas ou quando o armazenamento do aparelho está cheio.</p>
      <p>Abra o app pelo ícone da tela de início, fora da navegação privada, e tente de novo.</p>
      <button type="button" class="botao botao-primario" onClick={() => location.reload()}>
        Tentar de novo
      </button>
    </main>
  );
}

export function App({ base = db, hoje }: { base?: JuliusDB; hoje?: DataISO }) {
  const [dia] = useState(() => hoje ?? hojeISO());
  const [fase, setFase] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    let ativo = true;
    base
      .open()
      .then(() => materializarTodas(base, dia))
      .then(() => {
        if (ativo) setFase('pronto');
      })
      .catch((e: unknown) => {
        console.error(e);
        if (ativo) setFase('erro');
      });
    // Pede ao navegador para não apagar os dados quando faltar espaço.
    void navigator.storage?.persist?.()?.catch(() => false);
    return () => {
      ativo = false;
    };
  }, [base, dia]);

  if (fase === 'erro') return <ErroArmazenamento />;
  if (fase === 'carregando') {
    return (
      <div class="carregando" role="status">
        Carregando…
      </div>
    );
  }
  return (
    <Provedores base={base} hoje={dia}>
      <Casca />
    </Provedores>
  );
}
