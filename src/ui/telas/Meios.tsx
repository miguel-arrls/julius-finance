import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { novoId } from '../../dados/ids';
import { useState } from 'preact/hooks';
import { excluirMeio } from '../../dados/repositorio';
import { ErroDominio, type MeioPagamento } from '../../dominio/tipos';
import { EditorMeio } from '../componentes/EditorMeio';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LogoMeio } from '../componentes/Logo';
import { usarToast } from '../componentes/Toast';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { ROTULO_MEIO } from '../textos';

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
        <EditorMeio
          key={editando.id}
          inicial={editando}
          aoSalvar={() => {
            mostrar('Meio de pagamento salvo');
            setEditando(null);
          }}
          aoCancelar={() => setEditando(null)}
        />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando({ id: novoId(), nome: '', tipo: 'credito' })}>
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
                <LogoMeio meio={m} />
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
