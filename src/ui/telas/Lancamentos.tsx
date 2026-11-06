import { IconAdjustmentsHorizontal, IconFileSpreadsheet } from '@tabler/icons-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { gerarCsv } from '../../dados/csv';
import { desfazerPagamento, marcarPaga } from '../../dados/repositorio';
import { formatarMesCurto } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { filtrar } from '../../dominio/filtros';
import { detalhar, valorEfetivo, type ItemLista } from '../../dominio/resumo';
import type { Situacao, TipoDespesa } from '../../dominio/tipos';
import { compartilharOuBaixar } from '../arquivo';
import { Chips, type OpcaoChip } from '../componentes/Chips';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { LogoMeio } from '../componentes/Logo';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import type { FiltrosRota } from '../rota';
import { plural } from '../textos';

const MENSAGEM_FALHA = 'Não foi possível marcar como paga. Tente de novo.';

const OPCOES_SITUACAO: OpcaoChip<Situacao | ''>[] = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'atrasada', rotulo: 'Atrasadas' },
  { valor: 'paga', rotulo: 'Pagas' },
  { valor: 'sem-vencimento', rotulo: 'Sem vencimento' },
];
const OPCOES_TIPO: OpcaoChip<TipoDespesa | ''>[] = [
  { valor: '', rotulo: 'Todos os tipos' },
  { valor: 'avulsa', rotulo: 'Avulsas' },
  { valor: 'parcelada', rotulo: 'Parceladas' },
  { valor: 'recorrente', rotulo: 'Recorrentes' },
];

export function Lancamentos({ estado, filtros = {} }: { estado: Estado; filtros?: FiltrosRota }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes, setMes } = usarMes();
  const mostrar = usarToast();
  const [texto, setTexto] = useState('');
  const [todosMeses, setTodosMeses] = useState(false);
  const [categoriaId, setCategoriaId] = useState(filtros.categoriaId ?? '');
  const [situacao, setSituacao] = useState<Situacao | ''>(filtros.situacao ?? '');
  const [tipo, setTipo] = useState<TipoDespesa | ''>(filtros.tipo ?? '');
  const [meioId, setMeioId] = useState(filtros.meioPagamentoId ?? '');
  const [maisFiltros, setMaisFiltros] = useState(Boolean(filtros.categoriaId || filtros.tipo));

  // O mês vindo da rota (ex.: tocar numa categoria do Início) passa a ser o mês do app.
  useEffect(() => {
    if (filtros.mes) setMes(filtros.mes);
  }, [filtros.mes]);

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
  const qtdFiltros = [categoriaId, situacao, tipo, meioId].filter((x) => x !== '').length;
  const temFiltro = texto !== '' || todosMeses || qtdFiltros > 0;

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
        <button type="button" class={`chip${maisFiltros ? ' chip-aberto' : ''}`} aria-expanded={maisFiltros} aria-controls="mais-filtros" onClick={() => setMaisFiltros(!maisFiltros)}>
          <IconAdjustmentsHorizontal size={18} aria-hidden="true" />
          {qtdFiltros > 0 ? `Filtros (${qtdFiltros})` : 'Filtros'}
        </button>
        {temFiltro && (
          <button type="button" class="chip" onClick={limpar}>
            Limpar
          </button>
        )}
      </div>
      <Chips<Situacao | ''> rotulo="Situação" opcoes={OPCOES_SITUACAO} valor={situacao} aoMudar={setSituacao} />
      {estado.meios.length > 0 && (
        <Chips
          rotulo="Meio de pagamento"
          opcoes={[
            { valor: '', rotulo: 'Todos os meios' },
            ...estado.meios.map((m) => ({ valor: m.id, rotulo: m.nome, antes: <LogoMeio meio={m} tamanho={22} /> })),
          ]}
          valor={meioId}
          aoMudar={setMeioId}
        />
      )}
      {maisFiltros && (
        <div id="mais-filtros">
          <Chips
            rotulo="Categoria"
            opcoes={[{ valor: '', rotulo: 'Todas as categorias' }, ...estado.categorias.map((c) => ({ valor: c.id, rotulo: c.nome, antes: <span class="chip-cor" style={{ background: c.cor }} /> }))]}
            valor={categoriaId}
            aoMudar={setCategoriaId}
          />
          <Chips<TipoDespesa | ''> rotulo="Tipo" opcoes={OPCOES_TIPO} valor={tipo} aoMudar={setTipo} />
        </div>
      )}

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
