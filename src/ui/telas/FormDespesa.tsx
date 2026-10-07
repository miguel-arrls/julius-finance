import { useRef, useState } from 'preact/hooks';
import { salvarDespesa, salvarMarca } from '../../dados/repositorio';
import { formatarData, formatarMes, formatarMesCurto, mesDe, somarMesesAoMes } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { diferencaParcelas } from '../../dominio/parcelas';
import { ErroDominio, type Despesa, type Lancamento, type TipoDespesa } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { navegar } from '../rota';
import { ROTULO_A_CONFIRMAR } from '../textos';
import {
  montarDespesa,
  mudouCobranca,
  previa,
  resolverMarca,
  sugerirVencimento,
  validar,
  valoresDeDespesa,
  valoresIniciais,
  type ErrosForm,
  type ValoresForm,
} from './regrasDespesa';

const TIPOS: { valor: TipoDespesa; rotulo: string }[] = [
  { valor: 'avulsa', rotulo: 'Avulsa' },
  { valor: 'parcelada', rotulo: 'Parcelada' },
  { valor: 'recorrente', rotulo: 'Recorrente' },
];
const MAX_PREVIA = 12;

type Alterar = <K extends keyof ValoresForm>(campo: K, valor: ValoresForm[K]) => void;
interface PropsCampos {
  v: ValoresForm;
  erros: ErrosForm;
  alterar: Alterar;
}

function CampoDataCompra({ v, erros, alterar }: PropsCampos) {
  return (
    <Campo id="f-data-compra" rotulo="Data da compra (opcional)" erro={erros.dataCompra}>
      <input id="f-data-compra" type="date" value={v.dataCompra} onInput={(e) => alterar('dataCompra', e.currentTarget.value)} />
    </Campo>
  );
}

function CamposAvulsa(p: PropsCampos) {
  const { v, erros, alterar } = p;
  return (
    <>
      <Campo id="f-valor" rotulo="Valor" erro={erros.valor}>
        <input id="f-valor" inputMode="decimal" placeholder="0,00" value={v.valor} onInput={(e) => alterar('valor', e.currentTarget.value)} />
      </Campo>
      <div class="duas-colunas">
        <CampoDataCompra {...p} />
        <Campo id="f-vencimento" rotulo="Vencimento" erro={erros.vencimento}>
          <input id="f-vencimento" type="date" value={v.vencimento} onInput={(e) => alterar('vencimento', e.currentTarget.value)} />
        </Campo>
      </div>
      {!v.vencimento && (
        <Campo id="f-mes" rotulo="Mês de referência" erro={erros.mes} dica="Sem vencimento, a despesa conta neste mês e fica como a confirmar.">
          <input id="f-mes" type="month" value={v.mes} onInput={(e) => alterar('mes', e.currentTarget.value)} />
        </Campo>
      )}
    </>
  );
}

function CamposParcelada(p: PropsCampos) {
  const { v, erros, alterar } = p;
  return (
    <>
      <div class="duas-colunas">
        <Campo id="f-valor-total" rotulo="Valor total" erro={erros.valorTotal}>
          <input id="f-valor-total" inputMode="decimal" placeholder="0,00" value={v.valorTotal} onInput={(e) => alterar('valorTotal', e.currentTarget.value)} />
        </Campo>
        <Campo id="f-num-parcelas" rotulo="Número de parcelas" erro={erros.numParcelas}>
          <input id="f-num-parcelas" inputMode="numeric" value={v.numParcelas} onInput={(e) => alterar('numParcelas', e.currentTarget.value)} />
        </Campo>
      </div>
      <Campo
        id="f-valor-parcela"
        rotulo="Valor da parcela (opcional)"
        erro={erros.valorParcela}
        dica="Preencha se a parcela não for o total dividido, por exemplo com juros."
      >
        <input id="f-valor-parcela" inputMode="decimal" placeholder="0,00" value={v.valorParcela} onInput={(e) => alterar('valorParcela', e.currentTarget.value)} />
      </Campo>
      <div class="duas-colunas">
        <CampoDataCompra {...p} />
        <Campo id="f-primeiro-venc" rotulo="1º vencimento" erro={erros.primeiroVencimento}>
          <input id="f-primeiro-venc" type="date" value={v.primeiroVencimento} onInput={(e) => alterar('primeiroVencimento', e.currentTarget.value)} />
        </Campo>
      </div>
      {!v.primeiroVencimento && (
        <Campo id="f-mes-primeira" rotulo="Mês da 1ª parcela" erro={erros.mesPrimeira}>
          <input id="f-mes-primeira" type="month" value={v.mesPrimeira} onInput={(e) => alterar('mesPrimeira', e.currentTarget.value)} />
        </Campo>
      )}
      <Campo
        id="f-comeca"
        rotulo="Começa na parcela"
        erro={erros.comecaNaParcela}
        dica="Para compras que já estavam em andamento. O 1º vencimento é o desta parcela; as anteriores ficam fora do app."
      >
        <input id="f-comeca" inputMode="numeric" value={v.comecaNaParcela} onInput={(e) => alterar('comecaNaParcela', e.currentTarget.value)} />
      </Campo>
    </>
  );
}

function CamposRecorrente({ v, erros, alterar }: PropsCampos) {
  return (
    <>
      <Campo id="f-valor" rotulo="Valor" erro={erros.valor}>
        <input id="f-valor" inputMode="decimal" placeholder="0,00" value={v.valor} onInput={(e) => alterar('valor', e.currentTarget.value)} />
      </Campo>
      <label class="check">
        <input type="checkbox" checked={v.valorVariavel} onChange={(e) => alterar('valorVariavel', e.currentTarget.checked)} />
        O valor muda todo mês (conta de consumo)
      </label>
      <Campo id="f-frequencia" rotulo="Repete">
        <select id="f-frequencia" value={v.frequencia} onChange={(e) => alterar('frequencia', e.currentTarget.value as ValoresForm['frequencia'])}>
          <option value="mensal">Todo mês</option>
          <option value="semanal">Toda semana</option>
          <option value="anual">Todo ano</option>
        </select>
      </Campo>
      <div class="duas-colunas">
        <Campo id="f-inicio" rotulo="Primeira cobrança" erro={erros.inicio} dica="As próximas seguem o mesmo dia.">
          <input id="f-inicio" type="date" value={v.inicio} onInput={(e) => alterar('inicio', e.currentTarget.value)} />
        </Campo>
        <Campo id="f-fim" rotulo="Termina em (opcional)" erro={erros.fim}>
          <input id="f-fim" type="date" value={v.fim} onInput={(e) => alterar('fim', e.currentTarget.value)} />
        </Campo>
      </div>
    </>
  );
}

function Previa({ d, lancamentos, anteriores }: { d: Despesa; lancamentos: Lancamento[]; anteriores: number }) {
  const titulo = d.tipo === 'parcelada' ? 'Parcelas que serão geradas' : d.tipo === 'recorrente' ? 'Próximas cobranças' : 'Lançamento';
  const diferenca = d.tipo === 'parcelada' ? diferencaParcelas(d) : 0;
  const visiveis = lancamentos.slice(0, MAX_PREVIA);
  return (
    <section class="previa" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul>
        {visiveis.map((l) => (
          <li key={l.id}>
            <span>{d.tipo === 'parcelada' && l.numero ? `${l.numero}/${d.numParcelas}` : formatarMesCurto(l.mes)}</span>
            <span>{l.vencimento ? formatarData(l.vencimento) : 'vencimento a confirmar'}</span>
            <span>{formatarReais(l.valor)}</span>
          </li>
        ))}
      </ul>
      {lancamentos.length > MAX_PREVIA && <p class="texto-suave">e mais {lancamentos.length - MAX_PREVIA}.</p>}
      {diferenca !== 0 && (
        <p class="texto-suave">
          As parcelas somam {formatarReais(Math.abs(diferenca))} {diferenca > 0 ? 'a mais' : 'a menos'} que o total informado.
        </p>
      )}
      {anteriores > 0 && (
        <p class="texto-suave">
          {anteriores === 1 ? '1 cobrança anterior a hoje também será criada' : `${anteriores} cobranças anteriores a hoje também serão criadas`}.
        </p>
      )}
    </section>
  );
}

export function FormDespesa({ estado, id }: { estado: Estado; id?: string }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes: mesAtual } = usarMes();
  const mostrar = usarToast();
  const existente = id ? estado.despesas.find((d) => d.id === id) : undefined;
  const [idDespesa] = useState(() => id ?? crypto.randomUUID());
  const [v, setV] = useState<ValoresForm>(() =>
    existente ? valoresDeDespesa(existente, estado.marcas, mesAtual) : valoresIniciais(mesAtual),
  );
  const [erros, setErros] = useState<ErrosForm>({});
  const [erroGeral, setErroGeral] = useState('');
  const [aPartirDe, setAPartirDe] = useState(mesDe(hoje));
  const [salvando, setSalvando] = useState(false);
  const travado = useRef(false);

  if (id && !existente) {
    return <EstadoVazio titulo="Despesa não encontrada" texto="Ela pode ter sido excluída." acao={{ rotulo: 'Ver despesas', href: '#/despesas' }} />;
  }

  const pausas = existente?.tipo === 'recorrente' ? existente.pausas : [];
  const meio = estado.meios.find((m) => m.id === v.meioPagamentoId);

  const alterar: Alterar = (campo, valor) => {
    setV((atual) => {
      const novo = { ...atual, [campo]: valor };
      if (campo === 'dataCompra' || campo === 'meioPagamentoId') {
        const sugestao = sugerirVencimento(novo.dataCompra, estado.meios.find((m) => m.id === novo.meioPagamentoId));
        if (sugestao && novo.tipo === 'avulsa' && !atual.vencimento) novo.vencimento = sugestao;
        if (sugestao && novo.tipo === 'parcelada' && !atual.primeiroVencimento) novo.primeiroVencimento = sugestao;
      }
      return novo;
    });
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  };

  const montada = Object.keys(validar(v)).length === 0 ? montarDespesa(v, { id: idDespesa, pausas }) : null;
  const prev = montada ? previa(montada, meio, hoje) : null;
  const perguntarAPartir = existente !== undefined && montada !== null && mudouCobranca(existente, montada);
  const mesesAPartir = Array.from({ length: 13 }, (_, k) => somarMesesAoMes(mesDe(hoje), k));

  async function salvar(e: Event) {
    e.preventDefault();
    if (travado.current) return;
    const encontrados = validar(v);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    travado.current = true;
    setSalvando(true);
    setErroGeral('');
    try {
      const marca = resolverMarca(v.marca, v.descricao, estado.marcas);
      if (marca.nova) await salvarMarca(base, marca.nova);
      const despesa = montarDespesa(v, { id: idDespesa, marcaId: marca.marcaId ?? marca.nova?.id, pausas });
      const aplicarDesde = existente && mudouCobranca(existente, despesa) ? aPartirDe : undefined;
      await salvarDespesa(base, despesa, { hoje, aPartirDe: aplicarDesde });
      mostrar(existente ? 'Despesa atualizada' : 'Despesa cadastrada');
      navegar({ tela: 'despesa', id: idDespesa });
    } catch (err) {
      setErroGeral(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
      travado.current = false;
      setSalvando(false);
    }
  }

  const props: PropsCampos = { v, erros, alterar };

  return (
    <form class="formulario" onSubmit={(e) => void salvar(e)} noValidate>
      <h1>{existente ? 'Editar despesa' : 'Nova despesa'}</h1>

      {!existente && (
        <div class="segmentado" role="radiogroup" aria-label="Tipo de despesa">
          {TIPOS.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={v.tipo === t.valor} onClick={() => alterar('tipo', t.valor)}>
              {t.rotulo}
            </button>
          ))}
        </div>
      )}

      <Campo id="f-descricao" rotulo="Descrição" erro={erros.descricao}>
        <input id="f-descricao" value={v.descricao} autocomplete="off" onInput={(e) => alterar('descricao', e.currentTarget.value)} />
      </Campo>
      <Campo id="f-marca" rotulo="Loja ou marca (opcional)" dica="O logo aparece sozinho para marcas conhecidas.">
        <input id="f-marca" list="f-marcas" value={v.marca} autocomplete="off" onInput={(e) => alterar('marca', e.currentTarget.value)} />
        <datalist id="f-marcas">
          {estado.marcas.map((m) => (
            <option key={m.id} value={m.nome} />
          ))}
        </datalist>
      </Campo>
      <div class="duas-colunas">
        <Campo id="f-categoria" rotulo="Categoria" erro={erros.categoriaId}>
          <select id="f-categoria" value={v.categoriaId} onChange={(e) => alterar('categoriaId', e.currentTarget.value)}>
            <option value="">Escolha…</option>
            {estado.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="f-meio" rotulo="Meio de pagamento">
          <select id="f-meio" value={v.meioPagamentoId} onChange={(e) => alterar('meioPagamentoId', e.currentTarget.value)}>
            <option value="">Não informado</option>
            {estado.meios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {v.tipo === 'avulsa' && <CamposAvulsa {...props} />}
      {v.tipo === 'parcelada' && <CamposParcelada {...props} />}
      {v.tipo === 'recorrente' && <CamposRecorrente {...props} />}

      <Campo id="f-obs" rotulo="Observações (opcional)">
        <textarea id="f-obs" value={v.observacoes} onInput={(e) => alterar('observacoes', e.currentTarget.value)} />
      </Campo>

      {v.aConfirmar.length > 0 && (
        <fieldset class="cartao">
          <legend>A confirmar</legend>
          <p class="texto-suave">Marque o que você já conferiu.</p>
          {v.aConfirmar.map((c) => (
            <label class="check" key={c}>
              <input type="checkbox" onChange={() => alterar('aConfirmar', v.aConfirmar.filter((x) => x !== c))} />
              {ROTULO_A_CONFIRMAR[c]}
            </label>
          ))}
        </fieldset>
      )}

      {perguntarAPartir && (
        <Campo id="f-a-partir" rotulo="Aplicar a mudança a partir de" dica="Meses anteriores e cobranças já pagas não mudam.">
          <select id="f-a-partir" value={aPartirDe} onChange={(e) => setAPartirDe(e.currentTarget.value)}>
            {mesesAPartir.map((m) => (
              <option key={m} value={m}>
                {formatarMes(m)}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {montada && prev && prev.lancamentos.length > 0 && <Previa d={montada} lancamentos={prev.lancamentos} anteriores={prev.anteriores} />}

      {erroGeral && (
        <p class="erro-geral" role="alert">
          {erroGeral}
        </p>
      )}
      <button type="submit" class="botao botao-primario botao-largo" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar despesa'}
      </button>
    </form>
  );
}
