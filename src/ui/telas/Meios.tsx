import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirMeio, salvarMeio } from '../../dados/repositorio';
import { ErroDominio, type MeioPagamento, type TipoMeio } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { ROTULO_MEIO } from '../textos';

const lerDia = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

function EditorMeio({ inicial, aoFechar }: { inicial: MeioPagamento; aoFechar: () => void }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const [nome, setNome] = useState(inicial.nome);
  const [tipo, setTipo] = useState<TipoMeio>(inicial.tipo);
  const [fechamento, setFechamento] = useState(inicial.diaFechamento?.toString() ?? '');
  const [vencimento, setVencimento] = useState(inicial.diaVencimento?.toString() ?? '');
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarMeio(base, { id: inicial.id, nome, tipo, diaFechamento: lerDia(fechamento), diaVencimento: lerDia(vencimento) }, hoje);
      mostrar('Meio de pagamento salvo');
      aoFechar();
    } catch (err) {
      if (!(err instanceof ErroDominio)) console.error(err);
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar meio de pagamento">
      <Campo id="mp-nome" rotulo="Nome">
        <input id="mp-nome" value={nome} onInput={(e) => setNome(e.currentTarget.value)} />
      </Campo>
      <Campo id="mp-tipo" rotulo="Tipo">
        <select id="mp-tipo" value={tipo} onChange={(e) => setTipo(e.currentTarget.value as TipoMeio)}>
          {(Object.keys(ROTULO_MEIO) as TipoMeio[]).map((t) => (
            <option key={t} value={t}>
              {ROTULO_MEIO[t]}
            </option>
          ))}
        </select>
      </Campo>
      {tipo === 'credito' && (
        <>
          <div class="duas-colunas">
            <Campo id="mp-fechamento" rotulo="Dia de fechamento">
              <input id="mp-fechamento" inputMode="numeric" value={fechamento} onInput={(e) => setFechamento(e.currentTarget.value)} />
            </Campo>
            <Campo id="mp-vencimento" rotulo="Dia de vencimento">
              <input id="mp-vencimento" inputMode="numeric" value={vencimento} onInput={(e) => setVencimento(e.currentTarget.value)} />
            </Campo>
          </div>
          <p class="campo-dica">Compras no dia do fechamento ou depois vão para a fatura seguinte.</p>
        </>
      )}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
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

export function Meios({ estado }: { estado: Estado }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [editando, setEditando] = useState<MeioPagamento | null>(null);

  async function excluir(m: MeioPagamento) {
    if (!window.confirm(`Excluir "${m.nome}"? As despesas continuam, só sem meio de pagamento.`)) return;
    try {
      await excluirMeio(base, m.id);
      mostrar('Meio de pagamento excluído');
    } catch (err) {
      console.error(err);
      mostrar(err instanceof ErroDominio ? err.message : 'Não foi possível excluir. Tente de novo.');
    }
  }

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Meios de pagamento</h1>
      {editando ? (
        <EditorMeio key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando({ id: crypto.randomUUID(), nome: '', tipo: 'credito' })}>
          Novo meio de pagamento
        </button>
      )}
      {estado.meios.length === 0 ? (
        <EstadoVazio
          icone="credit-card"
          titulo="Nenhum meio de pagamento"
          texto="Cadastre seu cartão para o app calcular o vencimento da fatura sozinho."
        />
      ) : (
        <ul class="lista" style={{ marginTop: '12px' }}>
          {estado.meios.map((m) => (
            <li class="linha" key={m.id}>
              <span class="linha-principal">
                <span class="linha-textos">
                  <span class="linha-titulo">{m.nome}</span>
                  <span class="linha-sub">
                    {ROTULO_MEIO[m.tipo]}
                    {m.tipo === 'credito' && m.diaFechamento && m.diaVencimento ? ` · fecha dia ${m.diaFechamento} · vence dia ${m.diaVencimento}` : ''}
                  </span>
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
