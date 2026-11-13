import { useState } from 'preact/hooks';
import { salvarMeio } from '../../dados/repositorio';
import { ErroDominio, type MeioPagamento, type TipoMeio } from '../../dominio/tipos';
import { BANCOS, CORES_CARTAO, buscarBanco, filtrarBancos } from '../../marcas/bancos';
import { usarBase, usarHoje } from '../contexto';
import { ROTULO_MEIO } from '../textos';
import { Campo } from './Campo';
import { LogoMeio, corDoMeio } from './Logo';

const lerDia = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));
const MOSTRAR_BUSCA_A_PARTIR = 9;

/** Formulário de meio de pagamento: banco (com logo), nome, tipo, cor e dias da fatura. */
export function EditorMeio({
  inicial,
  aoSalvar,
  aoCancelar,
  rotulo = 'Editar meio de pagamento',
}: {
  inicial: MeioPagamento;
  aoSalvar: (meio: MeioPagamento) => void;
  aoCancelar: () => void;
  rotulo?: string;
}) {
  const base = usarBase();
  const hoje = usarHoje();
  const [nome, setNome] = useState(inicial.nome);
  const [tipo, setTipo] = useState<TipoMeio>(inicial.tipo);
  const [bancoSlug, setBancoSlug] = useState(inicial.bancoSlug ?? '');
  const [cor, setCor] = useState(inicial.cor ?? '');
  const [busca, setBusca] = useState('');
  const [fechamento, setFechamento] = useState(inicial.diaFechamento?.toString() ?? '');
  const [vencimento, setVencimento] = useState(inicial.diaVencimento?.toString() ?? '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const bancos = filtrarBancos(busca);
  const corAtual = corDoMeio({ nome, bancoSlug: bancoSlug || undefined, cor: cor || undefined });

  function escolherBanco(slug: string) {
    const anterior = buscarBanco(bancoSlug);
    const novo = buscarBanco(slug);
    // O nome acompanha o banco enquanto o usuário não tiver digitado outro.
    if (!nome.trim() || nome === anterior?.nome) setNome(novo?.nome ?? '');
    setBancoSlug(slug);
    setCor('');
  }

  async function salvar(e: Event) {
    e.preventDefault();
    if (salvando) return;
    const meio: MeioPagamento = {
      id: inicial.id,
      nome,
      tipo,
      ...(tipo === 'credito' ? { diaFechamento: lerDia(fechamento), diaVencimento: lerDia(vencimento) } : {}),
      ...(bancoSlug ? { bancoSlug } : {}),
      ...(cor ? { cor } : {}),
    };
    setSalvando(true);
    try {
      await salvarMeio(base, meio, hoje);
      aoSalvar({ ...meio, nome: nome.trim() });
    } catch (err) {
      if (!(err instanceof ErroDominio)) console.error(err);
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <form class="cartao editor-meio" onSubmit={(e) => void salvar(e)} noValidate aria-label={rotulo}>
      <fieldset class="campo">
        <legend class="campo-rotulo">Banco</legend>
        {BANCOS.length >= MOSTRAR_BUSCA_A_PARTIR && (
          <>
            <label for="mp-busca-banco" class="campo-rotulo">
              Buscar banco
            </label>
            <input
              id="mp-busca-banco"
              type="search"
              class="busca"
              placeholder="Nome do banco"
              value={busca}
              onInput={(e) => setBusca(e.currentTarget.value)}
            />
          </>
        )}
        <div class="grade-bancos" role="radiogroup" aria-label="Banco">
          {bancos.map((b) => (
            <button key={b.slug} type="button" role="radio" aria-checked={bancoSlug === b.slug} onClick={() => escolherBanco(b.slug)}>
              <LogoMeio meio={{ nome: b.nome, bancoSlug: b.slug }} tamanho={36} />
              <span>{b.nome}</span>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={bancoSlug === ''} onClick={() => escolherBanco('')}>
            <LogoMeio meio={{ nome: nome || 'Outro', cor: cor || undefined }} tamanho={36} />
            <span>Outro</span>
          </button>
        </div>
        {bancos.length === 0 && <p class="campo-dica">Nenhum banco com esse nome. Escolha "Outro".</p>}
      </fieldset>

      <Campo id="mp-nome" rotulo="Nome">
        <input id="mp-nome" value={nome} placeholder="Ex.: Nubank crédito" onInput={(e) => setNome(e.currentTarget.value)} />
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

      <fieldset class="campo">
        <legend class="campo-rotulo">Cor do cartão</legend>
        <div class="grade-cores" role="radiogroup" aria-label="Cor do cartão">
          {bancoSlug && (
            <button type="button" role="radio" aria-checked={cor === ''} aria-label="Cor do banco" onClick={() => setCor('')}>
              <span class="amostra-cor" style={{ backgroundColor: buscarBanco(bancoSlug)?.cor }} />
            </button>
          )}
          {CORES_CARTAO.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={cor === c || (!bancoSlug && cor === '' && i === 0)}
              aria-label={`Cor ${i + 1}`}
              onClick={() => setCor(c)}
            >
              <span class="amostra-cor" style={{ backgroundColor: c }} />
            </button>
          ))}
        </div>
      </fieldset>

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

      <div class="previa-cartao" style={{ backgroundColor: corAtual }} aria-hidden="true">
        <span>{nome.trim() || 'Novo cartão'}</span>
        <span>{ROTULO_MEIO[tipo]}</span>
      </div>

      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <div class="acoes">
        <button type="submit" class="botao botao-primario" disabled={salvando}>
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
