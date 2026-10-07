import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirMarca, salvarMarca } from '../../dados/repositorio';
import { ErroDominio, type Marca } from '../../dominio/tipos';
import { buscarCatalogoPorNome, buscarNoCatalogo } from '../../marcas/identificar';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { SeletorIcone } from '../componentes/SeletorIcone';
import { usarToast } from '../componentes/Toast';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { redimensionarImagem } from '../imagem';

function EditorMarca({ inicial, aoFechar }: { inicial: Marca; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [m, setM] = useState(inicial);
  const [apelidos, setApelidos] = useState(inicial.apelidos.join(', '));
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const resultados = buscarCatalogoPorNome(busca);

  async function enviar(e: Event) {
    const arquivo = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!arquivo) return;
    try {
      setM({ ...m, logoImagem: await redimensionarImagem(arquivo), logoSlug: undefined });
    } catch (err) {
      console.error(err);
      setErro('Não foi possível ler esta imagem. Tente outra.');
    }
  }

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarMarca(base, { ...m, apelidos: apelidos.split(',') });
      mostrar('Marca salva');
      aoFechar();
    } catch (err) {
      if (!(err instanceof ErroDominio)) console.error(err);
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  const origem = m.logoImagem ? 'Imagem enviada' : m.logoSlug ? `Catálogo: ${buscarNoCatalogo(m.logoSlug)?.nome ?? m.logoSlug}` : 'Sem logo';

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar marca">
      <Campo id="m-nome" rotulo="Nome" erro={erro}>
        <input id="m-nome" value={m.nome} onInput={(e) => setM({ ...m, nome: e.currentTarget.value })} />
      </Campo>
      <Campo id="m-apelidos" rotulo="Outros nomes (opcional)" dica="Separe por vírgula. Ajuda a reconhecer a marca na descrição.">
        <input id="m-apelidos" value={apelidos} onInput={(e) => setApelidos(e.currentTarget.value)} />
      </Campo>
      <Campo id="m-cor" rotulo="Cor">
        <input id="m-cor" type="color" value={m.cor ?? '#57534E'} onInput={(e) => setM({ ...m, cor: e.currentTarget.value })} />
      </Campo>
      <SeletorIcone valor={m.icone} aoEscolher={(icone) => setM({ ...m, icone })} />
      <fieldset class="campo">
        <legend class="campo-rotulo">Logo</legend>
        <div class="cabecalho-despesa">
          <Logo marca={m} rotulo={m.nome || '?'} tamanho={56} />
          <span class="texto-suave">{origem}</span>
        </div>
        <Campo id="m-busca" rotulo="Buscar no catálogo">
          <input id="m-busca" value={busca} placeholder="Spotify" onInput={(e) => setBusca(e.currentTarget.value)} />
        </Campo>
        {resultados.length > 0 && (
          <div class="grade-icones">
            {resultados.map((i) => (
              <button key={i.slug} type="button" aria-label={`Usar logo ${i.nome}`} onClick={() => setM({ ...m, logoSlug: i.slug, logoImagem: undefined })}>
                <Logo marca={{ id: i.slug, nome: i.nome, apelidos: [], logoSlug: i.slug }} rotulo={i.nome} tamanho={36} />
              </button>
            ))}
          </div>
        )}
        <div class="acoes">
          <label class="botao">
            Enviar imagem
            <input type="file" accept="image/*" class="visualmente-oculto" onChange={(e) => void enviar(e)} />
          </label>
          {(m.logoImagem || m.logoSlug) && (
            <button type="button" class="botao" onClick={() => setM({ ...m, logoImagem: undefined, logoSlug: undefined })}>
              Remover logo
            </button>
          )}
        </div>
      </fieldset>
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

export function Marcas({ estado }: { estado: Estado }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [editando, setEditando] = useState<Marca | null>(null);
  const uso = (id: string) => estado.despesas.filter((d) => d.marcaId === id).length;

  async function excluir(m: Marca) {
    if (!window.confirm(`Excluir a marca "${m.nome}"? As despesas continuam, só sem marca.`)) return;
    try {
      await excluirMarca(base, m.id);
      mostrar('Marca excluída');
    } catch (err) {
      console.error(err);
      mostrar(err instanceof ErroDominio ? err.message : 'Não foi possível excluir a marca. Tente de novo.');
    }
  }

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Marcas e logos</h1>
      {editando ? (
        <EditorMarca key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando({ id: crypto.randomUUID(), nome: '', apelidos: [] })}>
          Nova marca
        </button>
      )}
      {estado.marcas.length === 0 ? (
        <EstadoVazio
          icone="shopping-bag"
          titulo="Nenhuma marca ainda"
          texto="As marcas aparecem quando você cadastra despesas com loja ou marca. Você também pode criar aqui."
        />
      ) : (
        <ul class="lista" style={{ marginTop: '12px' }}>
          {estado.marcas.map((m) => (
            <li class="linha" key={m.id}>
              <span class="linha-principal">
                <Logo marca={m} rotulo={m.nome} />
                <span class="linha-textos">
                  <span class="linha-titulo">{m.nome}</span>
                  <span class="linha-sub">{uso(m.id) === 1 ? '1 despesa' : `${uso(m.id)} despesas`}</span>
                </span>
              </span>
              <button type="button" class="botao-icone" aria-label={`Editar ${m.nome}`} onClick={() => setEditando(m)}>
                <IconEdit aria-hidden="true" />
              </button>
              <button type="button" class="botao-icone" aria-label={`Excluir ${m.nome}`} onClick={() => void excluir(m)}>
                <IconTrash aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
