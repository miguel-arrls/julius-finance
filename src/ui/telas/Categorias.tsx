import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirCategoria, salvarCategoria } from '../../dados/repositorio';
import { ErroDominio, type Categoria } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { Logo } from '../componentes/Logo';
import { SeletorIcone } from '../componentes/SeletorIcone';
import { usarToast } from '../componentes/Toast';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

function EditorCategoria({ inicial, aoFechar }: { inicial: Categoria; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarCategoria(base, c);
      mostrar('Categoria salva');
      aoFechar();
    } catch (err) {
      if (!(err instanceof ErroDominio)) console.error(err);
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar categoria">
      <Campo id="c-nome" rotulo="Nome" erro={erro}>
        <input id="c-nome" value={c.nome} onInput={(e) => setC({ ...c, nome: e.currentTarget.value })} />
      </Campo>
      <Campo id="c-cor" rotulo="Cor">
        <input id="c-cor" type="color" value={c.cor} onInput={(e) => setC({ ...c, cor: e.currentTarget.value })} />
      </Campo>
      <SeletorIcone valor={c.icone} aoEscolher={(icone) => setC({ ...c, icone })} />
      <div class="acoes">
        <button type="submit" class="botao botao-primario">
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ExcluirCategoria({ categoria, emUso, outras, aoFechar }: { categoria: Categoria; emUso: number; outras: Categoria[]; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [substituta, setSubstituta] = useState(outras[0]?.id ?? '');
  const [erro, setErro] = useState('');

  async function confirmar() {
    try {
      await excluirCategoria(base, categoria.id, emUso > 0 ? substituta : undefined);
      mostrar('Categoria excluída');
      aoFechar();
    } catch (err) {
      if (!(err instanceof ErroDominio)) console.error(err);
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível excluir. Tente de novo.');
    }
  }

  const pergunta =
    emUso === 0
      ? `Excluir a categoria "${categoria.nome}"?`
      : emUso === 1
        ? `1 despesa usa "${categoria.nome}". Para onde ela vai?`
        : `${emUso} despesas usam "${categoria.nome}". Para onde elas vão?`;

  return (
    <section class="cartao" aria-label={`Excluir ${categoria.nome}`}>
      <p>{pergunta}</p>
      {emUso > 0 && (
        <Campo id="c-substituta" rotulo="Mover para">
          <select id="c-substituta" value={substituta} onChange={(e) => setSubstituta(e.currentTarget.value)}>
            {outras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <div class="acoes">
        <button type="button" class="botao botao-perigo" onClick={() => void confirmar()}>
          Excluir categoria
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

export function Categorias({ estado }: { estado: Estado }) {
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const uso = (id: string) => estado.despesas.filter((d) => d.categoriaId === id).length;
  const nova = (): Categoria => ({
    id: crypto.randomUUID(),
    nome: '',
    cor: '#57534E',
    icone: 'dots',
    ordem: Math.max(0, ...estado.categorias.map((c) => c.ordem)) + 1,
  });

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Categorias</h1>
      {editando ? (
        <EditorCategoria key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando(nova())}>
          Nova categoria
        </button>
      )}
      {excluindo && (
        <ExcluirCategoria
          key={excluindo.id}
          categoria={excluindo}
          emUso={uso(excluindo.id)}
          outras={estado.categorias.filter((c) => c.id !== excluindo.id)}
          aoFechar={() => setExcluindo(null)}
        />
      )}
      <ul class="lista" style={{ marginTop: '12px' }}>
        {estado.categorias.map((c) => (
          <li class="linha" key={c.id}>
            <span class="linha-principal">
              <Logo categoria={c} rotulo={c.nome} />
              <span class="linha-textos">
                <span class="linha-titulo">{c.nome}</span>
                <span class="linha-sub">{plural(uso(c.id), 'despesa', 'despesas')}</span>
              </span>
            </span>
            <button type="button" class="botao-icone" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}>
              <IconEdit aria-hidden="true" />
            </button>
            <button type="button" class="botao-icone" aria-label={`Excluir ${c.nome}`} onClick={() => setExcluindo(c)}>
              <IconTrash aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
