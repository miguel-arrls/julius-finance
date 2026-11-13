import { Component, type ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { db, type JuliusDB } from '../dados/db';
import { materializarTodas } from '../dados/repositorio';
import { hojeISO } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { Casca } from './Casca';
import { ErroLeitura } from './consulta';
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

function ErroTela() {
  return (
    <main class="erro-armazenamento">
      <h1>Algo deu errado nesta tela</h1>
      <p>Seus dados continuam guardados neste aparelho. Volte ao início e tente de novo.</p>
      <button
        type="button"
        class="botao botao-primario"
        onClick={() => {
          location.hash = '#/inicio';
          location.reload();
        }}
      >
        Voltar ao início
      </button>
    </main>
  );
}

/** Falha de leitura do banco mostra o aviso de armazenamento; qualquer outro erro, o aviso de erro na tela. */
export class LimiteDeErro extends Component<{ children: ComponentChildren }, { erro: unknown }> {
  state = { erro: undefined as unknown };
  static getDerivedStateFromError(erro: unknown) {
    return { erro: erro ?? new Error('Erro desconhecido') };
  }
  componentDidCatch(erro: unknown) {
    console.error(erro);
  }
  render() {
    const { erro } = this.state;
    if (erro === undefined) return this.props.children;
    return erro instanceof ErroLeitura ? <ErroArmazenamento /> : <ErroTela />;
  }
}

export function App({ base = db, hoje }: { base?: JuliusDB; hoje?: DataISO }) {
  const [dia, setDia] = useState(() => hoje ?? hojeISO());
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

  // Com o app aberto por dias, renova "hoje" ao voltar para a tela. A prop `hoje` fixa o dia (testes).
  useEffect(() => {
    if (hoje) return;
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') setDia(hojeISO());
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [hoje]);

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
      <LimiteDeErro>
        <Casca />
      </LimiteDeErro>
    </Provedores>
  );
}
