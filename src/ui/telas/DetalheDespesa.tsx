import { IconArrowBackUp, IconCheck, IconEdit } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import {
  alterarRecorrencia,
  contarLancamentos,
  desfazerPagamento,
  editarLancamento,
  excluirDespesa,
  marcarPaga,
} from '../../dados/repositorio';
import { ehDataISO, formatarData, formatarDataHora, formatarMes } from '../../dominio/datas';
import { formatarNumero, formatarReais, lerReais } from '../../dominio/dinheiro';
import { ordenarItens } from '../../dominio/filtros';
import { encerrar, estadoRecorrencia, pausar, retomar } from '../../dominio/recorrencias';
import { detalhar, valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { ErroDominio } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { PilulaSituacao } from '../componentes/PilulaSituacao';
import { usarToast } from '../componentes/Toast';
import { usarConsulta } from '../consulta';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { caminho, navegar } from '../rota';
import { descreverMudanca, plural, resumoDespesa, ROTULO_A_CONFIRMAR, ROTULO_ACAO, ROTULO_ESTADO } from '../textos';

const MENSAGEM_FALHA = 'Não foi possível concluir. Tente de novo.';

function rotuloLancamento(item: ItemLista): string {
  const { lancamento: l, despesa: d } = item;
  return d.tipo === 'parcelada' && l.numero ? `Parcela ${l.numero}/${d.numParcelas}` : formatarMes(l.mes);
}

function LinhaDetalhe({ item, aoEditar }: { item: ItemLista; aoEditar: () => void }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const l = item.lancamento;
  const rotulo = rotuloLancamento(item);

  async function pagar() {
    try {
      await marcarPaga(base, l.id, hoje);
      mostrar(`${rotulo} marcada como paga`);
    } catch (e) {
      console.error(e);
      mostrar(MENSAGEM_FALHA);
    }
  }

  async function desfazer() {
    try {
      await desfazerPagamento(base, l.id);
      mostrar('Pagamento desfeito');
    } catch (e) {
      console.error(e);
      mostrar(MENSAGEM_FALHA);
    }
  }

  return (
    <li class="linha">
      <span class="linha-principal">
        <span class="linha-textos">
          <span class="linha-titulo">{rotulo}</span>
          <span class="linha-sub">
            {formatarReais(valorEfetivo(l))}
            {l.pagoEm ? ` · paga em ${formatarData(l.pagoEm)}` : ''}
          </span>
        </span>
        <PilulaSituacao situacao={item.situacao} vencimento={l.vencimento} estimado={l.estimado} />
      </span>
      {l.pagoEm ? (
        <button type="button" class="botao-icone" aria-label={`Desfazer pagamento de ${rotulo}`} onClick={() => void desfazer()}>
          <IconArrowBackUp aria-hidden="true" />
        </button>
      ) : (
        <button type="button" class="botao-icone botao-pagar" aria-label={`Marcar ${rotulo} como paga`} onClick={() => void pagar()}>
          <IconCheck aria-hidden="true" />
        </button>
      )}
      <button type="button" class="botao-icone" aria-label={`Editar ${rotulo}`} onClick={aoEditar}>
        <IconEdit aria-hidden="true" />
      </button>
    </li>
  );
}

function EditorLancamento({ item, aoFechar }: { item: ItemLista; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const l = item.lancamento;
  const [valor, setValor] = useState(formatarNumero(l.valor));
  const [vencimento, setVencimento] = useState(l.vencimento ?? '');
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    const centavos = lerReais(valor);
    if (centavos === null || centavos <= 0) return setErro('Informe um valor maior que zero.');
    if (vencimento && !ehDataISO(vencimento)) return setErro('Data inválida.');
    try {
      await editarLancamento(base, l.id, { valor: centavos, vencimento: vencimento || null });
      mostrar('Lançamento atualizado');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <li class="cartao">
      <form onSubmit={(e) => void salvar(e)} noValidate aria-label={`Editar ${rotuloLancamento(item)}`}>
        <div class="duas-colunas">
          <Campo id={`e-valor-${l.id}`} rotulo="Valor">
            <input id={`e-valor-${l.id}`} inputMode="decimal" value={valor} onInput={(e) => setValor(e.currentTarget.value)} />
          </Campo>
          <Campo id={`e-venc-${l.id}`} rotulo="Vencimento">
            <input id={`e-venc-${l.id}`} type="date" value={vencimento} onInput={(e) => setVencimento(e.currentTarget.value)} />
          </Campo>
        </div>
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
    </li>
  );
}

export function DetalheDespesa({ estado, id }: { estado: Estado; id: string }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const historico = usarConsulta(() => base.historico.where('despesaId').equals(id).toArray(), [base, id]);
  const [editando, setEditando] = useState<string | null>(null);
  const [fim, setFim] = useState(hoje);
  const [erro, setErro] = useState('');

  const d = estado.despesas.find((x) => x.id === id);
  if (!d) {
    return <EstadoVazio titulo="Despesa não encontrada" texto="Ela pode ter sido excluída." acao={{ rotulo: 'Ver despesas', href: '#/despesas' }} />;
  }

  const itens = detalhar(estado.lancamentos.filter((l) => l.despesaId === id), estado, hoje).sort(ordenarItens);
  const categoria = estado.categorias.find((c) => c.id === d.categoriaId);
  const marca = estado.marcas.find((m) => m.id === d.marcaId);
  const meio = estado.meios.find((m) => m.id === d.meioPagamentoId);
  const situacaoRecorrencia = d.tipo === 'recorrente' ? estadoRecorrencia(d, hoje) : null;
  const eventos = [...(historico ?? [])].sort((a, b) => b.quando.localeCompare(a.quando));

  // Valores nulos (cadastro excluído, campo vazio) caem em formatarValorCampo, que mostra "vazio".
  const resolver = (campo: string, valor: unknown): string | undefined => {
    if (typeof valor !== 'string') return undefined;
    if (campo === 'categoriaId') return estado.categorias.find((c) => c.id === valor)?.nome;
    if (campo === 'marcaId') return estado.marcas.find((m) => m.id === valor)?.nome;
    if (campo === 'meioPagamentoId') return estado.meios.find((m) => m.id === valor)?.nome;
    return undefined;
  };

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setErro('');
    try {
      await acao();
      mostrar(sucesso);
    } catch (e) {
      if (!(e instanceof ErroDominio)) console.error(e);
      setErro(e instanceof ErroDominio ? e.message : MENSAGEM_FALHA);
    }
  }

  async function excluir() {
    try {
      const c = await contarLancamentos(base, id);
      const apagados = c.total === 1 ? '1 lançamento será apagado' : `${c.total} lançamentos serão apagados`;
      const pagos = c.pagos > 0 ? `, incluindo ${plural(c.pagos, 'pago', 'pagos')}` : '';
      if (!window.confirm(`Excluir "${d!.descricao}"? ${apagados}${pagos}. Isso não pode ser desfeito.`)) return;
      await excluirDespesa(base, id);
      mostrar('Despesa excluída');
      navegar({ tela: 'despesas' });
    } catch (e) {
      console.error(e);
      mostrar('Não foi possível excluir. Tente de novo.');
    }
  }

  function confirmarPausa() {
    if (!window.confirm(`Pausar "${d!.descricao}" a partir de hoje? As cobranças futuras não pagas serão removidas.`)) return;
    void executar(() => alterarRecorrencia(base, id, (r) => pausar(r, hoje), 'pausada', hoje), 'Recorrência pausada');
  }

  function confirmarEncerramento() {
    if (!ehDataISO(fim)) return setErro('Informe uma data válida.');
    if (!window.confirm(`Encerrar "${d!.descricao}" em ${formatarData(fim)}? Cobranças não pagas depois dessa data serão removidas.`)) return;
    void executar(() => alterarRecorrencia(base, id, (r) => encerrar(r, fim), 'encerrada', hoje), 'Recorrência encerrada');
  }

  return (
    <>
      <a href="#/despesas" class="voltar">
        ‹ Despesas
      </a>
      <div class="cabecalho-despesa">
        <Logo marca={marca} categoria={categoria} rotulo={d.descricao} tamanho={56} />
        <div>
          <h1>{d.descricao}</h1>
          <p class="texto-suave">{[categoria?.nome, marca?.nome, meio?.nome].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p>
        {resumoDespesa(d, itens.map((i) => i.lancamento))}
        {situacaoRecorrencia && ` · ${ROTULO_ESTADO[situacaoRecorrencia]}`}
      </p>
      {d.observacoes && <p class="texto-suave">{d.observacoes}</p>}
      {d.aConfirmar.length > 0 && (
        <a class="aviso aviso-atencao" href={caminho({ tela: 'editar', id })}>
          A confirmar: {d.aConfirmar.map((c) => ROTULO_A_CONFIRMAR[c]).join(', ')}
        </a>
      )}

      <div class="acoes">
        <a class="botao" href={caminho({ tela: 'editar', id })}>
          Editar
        </a>
        {situacaoRecorrencia === 'ativa' && (
          <button type="button" class="botao" onClick={confirmarPausa}>
            Pausar
          </button>
        )}
        {situacaoRecorrencia === 'pausada' && (
          <button
            type="button"
            class="botao"
            onClick={() => void executar(() => alterarRecorrencia(base, id, (r) => retomar(r, hoje), 'retomada', hoje), 'Recorrência retomada')}
          >
            Retomar
          </button>
        )}
        <button type="button" class="botao botao-perigo" onClick={() => void excluir()}>
          Excluir
        </button>
      </div>

      {situacaoRecorrencia !== null && situacaoRecorrencia !== 'encerrada' && (
        <details class="cartao">
          <summary>Encerrar recorrência</summary>
          <Campo id="d-fim" rotulo="Última cobrança em ou antes de">
            <input id="d-fim" type="date" value={fim} onInput={(e) => setFim(e.currentTarget.value)} />
          </Campo>
          <button type="button" class="botao botao-perigo" onClick={confirmarEncerramento}>
            Encerrar
          </button>
        </details>
      )}

      {erro && (
        <p class="erro-geral" role="alert">
          {erro}
        </p>
      )}

      <h2>Lançamentos</h2>
      {itens.length === 0 ? (
        <p class="texto-suave">Nenhum lançamento.</p>
      ) : (
        <ul class="lista">
          {itens.map((i) =>
            editando === i.lancamento.id ? (
              <EditorLancamento key={i.lancamento.id} item={i} aoFechar={() => setEditando(null)} />
            ) : (
              <LinhaDetalhe key={i.lancamento.id} item={i} aoEditar={() => setEditando(i.lancamento.id)} />
            ),
          )}
        </ul>
      )}

      <h2>Histórico</h2>
      <ol class="historico">
        {eventos.map((h) => (
          <li key={h.id}>
            <time>{formatarDataHora(h.quando)}</time>
            {ROTULO_ACAO[h.acao]}
            {h.mudancas.length > 0 && `: ${h.mudancas.map((m) => descreverMudanca(m, resolver)).join('; ')}`}
          </li>
        ))}
      </ol>
    </>
  );
}
