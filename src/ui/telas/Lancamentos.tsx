import { IconFileSpreadsheet } from '@tabler/icons-preact';
import { useMemo, useState } from 'preact/hooks';
import { gerarCsv } from '../../dados/csv';
import { desfazerPagamento, marcarPaga } from '../../dados/repositorio';
import { formatarMesCurto } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { filtrar } from '../../dominio/filtros';
import { detalhar, valorEfetivo, type ItemLista } from '../../dominio/resumo';
import type { Situacao, TipoDespesa } from '../../dominio/tipos';
import { compartilharOuBaixar } from '../arquivo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

const MENSAGEM_FALHA = 'Não foi possível marcar como paga. Tente de novo.';

const SITUACOES: [Situacao, string][] = [
  ['pendente', 'Pendentes'],
  ['atrasada', 'Atrasadas'],
  ['paga', 'Pagas'],
  ['sem-vencimento', 'Sem vencimento'],
];

export function Lancamentos({ estado }: { estado: Estado }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes, setMes } = usarMes();
  const mostrar = usarToast();
  const [texto, setTexto] = useState('');
  const [todosMeses, setTodosMeses] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [situacao, setSituacao] = useState<Situacao | ''>('');
  const [tipo, setTipo] = useState<TipoDespesa | ''>('');
  const [meioId, setMeioId] = useState('');

  const itens = useMemo(() => detalhar(estado.lancamentos, estado, hoje), [estado, hoje]);
  const meses = useMemo(() => [...new Set([...itens.map((i) => i.lancamento.mes), mes])].sort(), [itens, mes]);
  const lista = filtrar(itens, {
    texto,
    mes: todosMeses ? undefined : mes,
    categoriaId: categoriaId || undefined,
    situacao: situacao || undefined,
    tipo: tipo || undefined,
    meioPagamentoId: meioId || undefined,
  });
  const comVencimento = lista.filter((i) => i.situacao !== 'sem-vencimento');
  const semVencimento = lista.filter((i) => i.situacao === 'sem-vencimento');
  const total = lista.reduce((s, i) => s + valorEfetivo(i.lancamento), 0);
  const temFiltro = texto !== '' || todosMeses || categoriaId !== '' || situacao !== '' || tipo !== '' || meioId !== '';

  function limpar() {
    setTexto('');
    setTodosMeses(false);
    setCategoriaId('');
    setSituacao('');
    setTipo('');
    setMeioId('');
  }

  async function pagar(item: ItemLista) {
    try {
      await marcarPaga(base, item.lancamento.id, hoje);
      mostrar(`${item.despesa.descricao} marcada como paga`, {
        rotulo: 'Desfazer',
        executar: () => void desfazerPagamento(base, item.lancamento.id),
      });
    } catch {
      mostrar(MENSAGEM_FALHA);
    }
  }

  async function exportarCsv() {
    const nome = `julius-lancamentos-${todosMeses ? 'todos' : mes}.csv`;
    try {
      const r = await compartilharOuBaixar(nome, gerarCsv(lista), 'text/csv');
      if (r !== 'cancelado') mostrar('Planilha exportada');
    } catch (e) {
      console.error(e);
      mostrar('Não foi possível exportar. Tente de novo.');
    }
  }

  const linhas = (xs: ItemLista[]) => (
    <ul class="lista">
      {xs.map((i) => (
        <LinhaLancamento key={i.lancamento.id} item={i} onPagar={(x) => void pagar(x)} />
      ))}
    </ul>
  );

  return (
    <>
      <h1>Lançamentos</h1>
      <input
        type="search"
        class="busca"
        aria-label="Buscar"
        placeholder="Buscar por nome, loja ou marca"
        value={texto}
        onInput={(e) => setTexto(e.currentTarget.value)}
      />
      <div class="filtros">
        <select
          aria-label="Mês"
          class={todosMeses ? '' : 'ativo'}
          value={todosMeses ? '' : mes}
          onChange={(e) => {
            const valor = e.currentTarget.value;
            if (valor) {
              setTodosMeses(false);
              setMes(valor);
            } else {
              setTodosMeses(true);
            }
          }}
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {formatarMesCurto(m)}
            </option>
          ))}
        </select>
        <select aria-label="Categoria" class={categoriaId ? 'ativo' : ''} value={categoriaId} onChange={(e) => setCategoriaId(e.currentTarget.value)}>
          <option value="">Categoria</option>
          {estado.categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select aria-label="Situação" class={situacao ? 'ativo' : ''} value={situacao} onChange={(e) => setSituacao(e.currentTarget.value as Situacao | '')}>
          <option value="">Situação</option>
          {SITUACOES.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <select aria-label="Tipo" class={tipo ? 'ativo' : ''} value={tipo} onChange={(e) => setTipo(e.currentTarget.value as TipoDespesa | '')}>
          <option value="">Tipo</option>
          <option value="avulsa">Avulsas</option>
          <option value="parcelada">Parceladas</option>
          <option value="recorrente">Recorrentes</option>
        </select>
        <select aria-label="Meio de pagamento" class={meioId ? 'ativo' : ''} value={meioId} onChange={(e) => setMeioId(e.currentTarget.value)}>
          <option value="">Pagamento</option>
          {estado.meios.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        estado.lancamentos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum lançamento ainda"
            texto="Cadastre uma despesa e as parcelas e cobranças aparecem aqui."
            acao={{ rotulo: 'Cadastrar despesa', href: '#/nova' }}
          />
        ) : (
          <EstadoVazio
            titulo="Nenhum lançamento com esses filtros"
            texto="Tente outro mês ou limpe os filtros."
            acao={temFiltro ? { rotulo: 'Limpar filtros', onClick: limpar } : undefined}
          />
        )
      ) : (
        <>
          <p class="texto-suave">
            {plural(lista.length, 'lançamento', 'lançamentos')} · {formatarReais(total)}
          </p>
          {comVencimento.length > 0 && linhas(comVencimento)}
          {semVencimento.length > 0 && (
            <>
              <h2>Sem vencimento — a confirmar</h2>
              {linhas(semVencimento)}
            </>
          )}
          <div class="acoes">
            <button type="button" class="botao" onClick={() => void exportarCsv()}>
              <IconFileSpreadsheet aria-hidden="true" /> Exportar CSV
            </button>
          </div>
        </>
      )}
    </>
  );
}
