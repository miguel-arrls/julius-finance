import { useState } from 'preact/hooks';
import { inicializarPadrao } from '../../dados/repositorio';
import { ImportarBackup } from '../componentes/ImportarBackup';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';

export function BoasVindas({ estado }: { estado: Estado }) {
  const base = usarBase();
  const [erro, setErro] = useState('');

  async function comecar() {
    try {
      await inicializarPadrao(base);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível criar as categorias. Tente de novo.');
    }
  }

  return (
    <div class="boas-vindas">
      <h1>Boas-vindas ao Julius</h1>
      <p>Seu controle de gastos fica só neste aparelho. Nada é enviado para a internet.</p>
      <section class="cartao">
        <h2>Já tem um arquivo de contas ou backup?</h2>
        <p class="texto-suave">Escolha o arquivo .json, por exemplo o contas-iniciais.json.</p>
        <ImportarBackup estado={estado} rotulo="Importar minhas contas" />
      </section>
      <section class="cartao">
        <h2>Começar do zero</h2>
        <p class="texto-suave">Criamos categorias iniciais que você pode editar depois.</p>
        <button type="button" class="botao" onClick={() => void comecar()}>
          Começar do zero
        </button>
      </section>
      {erro && (
        <p class="erro-geral" role="alert">
          {erro}
        </p>
      )}
      <p>
        <a href="#/dados">Onde ficam meus dados</a>
      </p>
    </div>
  );
}
