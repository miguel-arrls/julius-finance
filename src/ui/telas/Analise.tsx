import { useMemo } from 'preact/hooks';
import { formatarMes, formatarMesCurto, somarMesesAoMes } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { compararComAnterior, compromissosFuturos, evolucao, gastosPorMeio, type MesEvolucao } from '../../dominio/insights';
import { detalhar } from '../../dominio/resumo';
import type { Centavos, MesISO } from '../../dominio/tipos';
import { LogoMeio } from '../componentes/Logo';
import { SeletorMes } from '../componentes/SeletorMes';
import { usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { caminho, type FiltrosRota } from '../rota';
import { formatarPercentual, formatarVariacao, plural } from '../textos';

const MAX_CATEGORIAS = 5;

/** Classe de cor da variação: gastar mais é ruim (vermelho), gastar menos é bom (verde). */
const classeVariacao = (c: Centavos) => (c > 0 ? 'negativo' : c < 0 ? 'positivo' : '');

function GraficoEvolucao({ meses, media }: { meses: MesEvolucao[]; media: Centavos | null }) {
  const L = 320;
  const A = 150;
  const topo = 12;
  const base = A - 22;
  const maior = Math.max(1, media ?? 0, ...meses.map((m) => m.total));
  const escala = (c: Centavos) => ((base - topo) * c) / maior;
  const passo = L / meses.length;
  const largura = Math.min(36, passo * 0.6);
  const yMedia = media !== null ? base - escala(media) : null;
  const descricao =
    `Gasto dos últimos ${meses.length} meses: ` +
    meses.map((m) => `${formatarMesCurto(m.mes)} ${formatarReais(m.total)}`).join('; ') +
    (media !== null ? `. Média dos meses fechados: ${formatarReais(media)}.` : '.');

  return (
    <svg class="grafico" viewBox={`0 0 ${L} ${A}`} role="img" aria-label={descricao}>
      <line x1="0" x2={L} y1={base} y2={base} class="grafico-eixo" />
      {meses.map((m, i) => {
        const x = passo * i + (passo - largura) / 2;
        const hPago = escala(m.pago);
        const hPendente = escala(m.pendente);
        const ultimo = i === meses.length - 1;
        return (
          <g key={m.mes}>
            {hPendente > 0 && (
              <rect x={x} y={base - hPago - hPendente} width={largura} height={hPendente} rx="4" class="grafico-pendente" />
            )}
            {hPago > 0 && <rect x={x} y={base - hPago} width={largura} height={hPago} rx="4" class="grafico-pago" />}
            <text x={x + largura / 2} y={A - 6} text-anchor="middle" class={`grafico-rotulo${ultimo ? ' grafico-rotulo-atual' : ''}`}>
              {formatarMesCurto(m.mes).slice(0, 3)}
            </text>
          </g>
        );
      })}
      {yMedia !== null && <line x1="0" x2={L} y1={yMedia} y2={yMedia} class="grafico-media" />}
    </svg>
  );
}

export function Analise({ estado }: { estado: Estado }) {
  const hoje = usarHoje();
  const { mes } = usarMes();
  const itens = useMemo(() => detalhar(estado.lancamentos, estado, hoje), [estado, hoje]);
  const comparacao = compararComAnterior(itens, mes);
  const porMeio = gastosPorMeio(itens, mes);
  const evo = evolucao(itens, mes, 6);
  const compromissos = compromissosFuturos(itens, estado.despesas, mes);
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const meios = new Map(estado.meios.map((m) => [m.id, m]));
  const anterior = somarMesesAoMes(mes, -1);
  const lista = (f: FiltrosRota, m: MesISO = mes) => caminho({ tela: 'lancamentos', filtros: { mes: m, ...f } });
  const subiram = comparacao.porCategoria.filter((c) => c.variacao > 0).slice(0, MAX_CATEGORIAS);
  const maiorMeio = porMeio[0]?.total || 1;

  return (
    <>
      <SeletorMes />

      <section class="cartao" aria-labelledby="titulo-comparacao">
        <h2 id="titulo-comparacao">Comparado a {formatarMes(anterior)}</h2>
        <p class="destaque-numero">
          <span class={classeVariacao(comparacao.variacao)}>
            {comparacao.percentual !== null ? formatarPercentual(comparacao.percentual) : formatarVariacao(comparacao.variacao)}
          </span>
        </p>
        <p class="texto-suave">
          {formatarReais(comparacao.atual)} agora · {formatarReais(comparacao.anterior)} em {formatarMesCurto(anterior)}
          {comparacao.percentual === null && comparacao.atual > 0 ? ' · sem gastos no mês anterior para comparar' : ''}
        </p>
        {subiram.length > 0 && (
          <>
            <h3>O que mais subiu</h3>
            <ul class="lista-simples">
              {subiram.map((c) => (
                <li key={c.categoriaId}>
                  <a href={lista({ categoriaId: c.categoriaId })}>
                    <span class="chip-cor" style={{ background: categorias.get(c.categoriaId)?.cor ?? '#57534E' }} />
                    <span class="lista-simples-nome">{categorias.get(c.categoriaId)?.nome ?? 'Sem categoria'}</span>
                    <span class="negativo">{formatarVariacao(c.variacao)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-por-meio">
        <h2 id="titulo-por-meio">Por cartão e meio de pagamento</h2>
        {porMeio.length === 0 ? (
          <p class="texto-suave">Nada lançado neste mês.</p>
        ) : (
          <ul class="barras">
            {porMeio.map((g) => {
              const meio = g.meioId ? meios.get(g.meioId) : undefined;
              const nome = meio?.nome ?? 'Não informado';
              const largura = Math.max(4, Math.round((g.total / maiorMeio) * 100));
              const conteudo = (
                <>
                  <span class="barra-topo">
                    <span class="barra-nome">
                      {meio && <LogoMeio meio={meio} tamanho={24} />}
                      {nome} · {plural(g.qtd, 'lançamento', 'lançamentos')}
                    </span>
                    <span>{formatarReais(g.total)}</span>
                  </span>
                  <span class="barra-trilho">
                    <span class="barra-preenchida grafico-pago" style={{ width: `${largura}%` }} />
                  </span>
                </>
              );
              return (
                <li key={g.meioId ?? 'nenhum'}>
                  {g.meioId ? (
                    <a class="barra-link" href={lista({ meioPagamentoId: g.meioId })}>
                      {conteudo}
                    </a>
                  ) : (
                    <span class="barra-link">{conteudo}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="titulo-evolucao">
        <h2 id="titulo-evolucao">Últimos 6 meses</h2>
        <figure class="cartao figura-grafico">
          <GraficoEvolucao meses={evo.meses} media={evo.media} />
          <figcaption class="legenda">
            <span>
              <span class="amostra grafico-pago" /> Pago
            </span>
            <span>
              <span class="amostra grafico-pendente" /> A pagar
            </span>
            {evo.media !== null && (
              <span>
                <span class="amostra amostra-linha" /> Média {formatarReais(evo.media)}
              </span>
            )}
          </figcaption>
        </figure>
        <ul class="lista-simples">
          {evo.meses.map((m) => (
            <li key={m.mes}>
              <a href={lista({}, m.mes)}>
                <span class="lista-simples-nome">{formatarMesCurto(m.mes)}</span>
                <span class="texto-suave">{m.temEstimado ? 'inclui estimativas' : ''}</span>
                <span>{formatarReais(m.total)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-compromissos">
        <h2 id="titulo-compromissos">Compromissos daqui para frente</h2>
        <div class="cartoes-resumo">
          <div class="metrica">
            <span class="metrica-rotulo">Fixos por mês</span>
            <span class="metrica-valor">{formatarReais(compromissos.fixosMensal)}</span>
          </div>
          <div class="metrica">
            <span class="metrica-rotulo">Variáveis (estimado)</span>
            <span class="metrica-valor">{formatarReais(compromissos.variaveisEstimado)}</span>
          </div>
        </div>
        {compromissos.parceladas.length > 0 ? (
          <ul class="lista-simples">
            {compromissos.parceladas.map((p) => (
              <li key={p.despesaId}>
                <a href={caminho({ tela: 'despesa', id: p.despesaId })}>
                  <span class="lista-simples-nome">
                    {p.descricao}
                    <span class="texto-suave">
                      {plural(p.parcelasRestantes, 'parcela', 'parcelas')} · até {formatarMesCurto(p.ultimoMes)}
                    </span>
                  </span>
                  <span>{formatarReais(p.restante)}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p class="texto-suave">Nenhuma parcela a vencer.</p>
        )}
      </section>
    </>
  );
}
