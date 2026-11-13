import { IconAlertTriangle, IconChartBar, IconChevronRight, IconDownload, IconSettings } from '@tabler/icons-preact';
import { useMemo } from 'preact/hooks';
import { desfazerPagamento, desfazerVariosPagamentos, marcarPaga, marcarVariosPagos } from '../../dados/repositorio';
import { formatarData, formatarMes, formatarMesCurto, somarMesesAoMes } from '../../dominio/datas';
import { compararComAnterior } from '../../dominio/insights';
import { formatarReais } from '../../dominio/dinheiro';
import {
  backupAtrasado,
  contarAConfirmar,
  detalhar,
  faturasDoMes,
  proximosVencimentos,
  resumoDoMes,
  totaisProximosMeses,
  type Fatura,
  type ItemLista,
} from '../../dominio/resumo';
import type { Centavos } from '../../dominio/tipos';
import { AlertasAtrasadas } from '../componentes/AlertasAtrasadas';
import { CarrosselCartoes } from '../componentes/CarrosselCartoes';
import { ValorQueCabe } from '../componentes/ValorQueCabe';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { SeletorMes } from '../componentes/SeletorMes';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { caminho, type FiltrosRota } from '../rota';
import { formatarPercentual, formatarVariacao, plural } from '../textos';

const MENSAGEM_FALHA = 'Não foi possível marcar como paga. Tente de novo.';

function Metrica({
  rotulo,
  valor,
  destaque = false,
  classe = '',
  href,
}: {
  rotulo: string;
  valor: Centavos;
  destaque?: boolean;
  classe?: string;
  href?: string;
}) {
  const css = `metrica${destaque ? ' metrica-destaque' : ''}`;
  const conteudo = (
    <>
      <span class="metrica-rotulo">{rotulo}</span>
      <ValorQueCabe class={`metrica-valor ${classe}`}>{formatarReais(valor)}</ValorQueCabe>
    </>
  );
  return href ? (
    <a class={`${css} metrica-link`} href={href}>
      {conteudo}
    </a>
  ) : (
    <div class={css}>{conteudo}</div>
  );
}

export function Inicio({ estado }: { estado: Estado }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes } = usarMes();
  const mostrar = usarToast();

  const itens = useMemo(() => detalhar(estado.lancamentos, estado, hoje), [estado, hoje]);
  const doMes = itens.filter((i) => i.lancamento.mes === mes);
  const resumo = resumoDoMes(itens, mes);
  const proximos = proximosVencimentos(itens, mes);
  const faturas = faturasDoMes(itens, mes);
  const futuros = totaisProximosMeses(itens, mes, 3);
  const aConfirmar = contarAConfirmar(estado.despesas);
  const lembrarBackup = estado.despesas.length > 0 && backupAtrasado(estado.config?.ultimoBackupEm, hoje);
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const maiorCategoria = resumo.porCategoria[0]?.total || 1;
  const lista = (f: FiltrosRota) => caminho({ tela: 'lancamentos', filtros: { mes, ...f } });
  const comparacao = compararComAnterior(itens, mes);
  const maiorAumento = comparacao.porCategoria.find((c) => c.variacao > 0);
  const resumoInsight = [
    comparacao.percentual !== null
      ? `${formatarPercentual(comparacao.percentual)} vs ${formatarMesCurto(somarMesesAoMes(mes, -1))}`
      : 'Ver a análise do mês',
    maiorAumento && `maior aumento: ${categorias.get(maiorAumento.categoriaId)?.nome ?? 'Sem categoria'} (${formatarVariacao(maiorAumento.variacao)})`,
  ]
    .filter(Boolean)
    .join(' · ');

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

  async function pagarFatura(f: Fatura) {
    const ids = f.idsAbertos;
    try {
      await marcarVariosPagos(base, ids, hoje);
      mostrar(`Fatura de ${formatarData(f.vencimento)} marcada como paga`, {
        rotulo: 'Desfazer',
        executar: () => void desfazerVariosPagamentos(base, ids),
      });
    } catch {
      mostrar(MENSAGEM_FALHA);
    }
  }

  const atrasadas = proximos.filter((i) => i.situacao === 'atrasada');
  const anterior = somarMesesAoMes(mes, -1);
  const maior = resumo.porCategoria[0] ? categorias.get(resumo.porCategoria[0].categoriaId) : undefined;

  return (
    <>
      <div class="inicio-topo">
        <SeletorMes />
        <a href="#/ajustes" class="botao-icone engrenagem" aria-label="Ajustes">
          <IconSettings aria-hidden="true" />
        </a>
      </div>

      <section class="inicio-total" aria-label="Resumo do mês">
        <Metrica rotulo="Total do mês" valor={resumo.total} destaque href={lista({})} />
        {comparacao.percentual !== null && (
          <a class={`variacao ${comparacao.variacao > 0 ? 'negativo' : comparacao.variacao < 0 ? 'positivo' : ''}`} href="#/analise">
            {formatarPercentual(comparacao.percentual)} vs {formatarMesCurto(anterior)}
          </a>
        )}
      </section>

      <CarrosselCartoes
        meios={estado.meios}
        faturas={faturas}
        hrefDoMeio={(id) => lista({ meioPagamentoId: id })}
        aoPagar={(f) => void pagarFatura(f)}
      />

      <AlertasAtrasadas
        atrasadas={atrasadas}
        hrefTodas={lista({ todosMeses: true, situacao: 'atrasada' })}
        aoPagar={(i) => void pagar(i)}
      />

      {doMes.length > 0 && (
        <div class="indicadores">
          <a href="#/analise">
            <span>vs {formatarMesCurto(anterior)}</span>
            <strong class={comparacao.variacao > 0 ? 'negativo' : comparacao.variacao < 0 ? 'positivo' : ''}>
              {comparacao.percentual !== null ? formatarPercentual(comparacao.percentual) : 'sem base'}
            </strong>
          </a>
          <a href={lista({})}>
            <span>Lançamentos</span>
            <strong>{doMes.length}</strong>
          </a>
          <a href={resumo.porCategoria[0] ? lista({ categoriaId: resumo.porCategoria[0].categoriaId }) : lista({})}>
            <span>Maior gasto</span>
            <strong>{maior?.nome ?? 'Sem categoria'}</strong>
          </a>
        </div>
      )}

      <section class="cartoes-resumo" aria-label="Pago e pendente">
        <Metrica rotulo="Pago" valor={resumo.pago} classe="positivo" href={lista({ situacao: 'paga' })} />
        <Metrica rotulo="Pendente" valor={resumo.pendente} />
        {resumo.atrasado > 0 && (
          <Metrica
            rotulo={plural(resumo.qtdAtrasadas, 'atrasada', 'atrasadas')}
            valor={resumo.atrasado}
            classe="negativo"
            href={lista({ situacao: 'atrasada' })}
          />
        )}
      </section>

      {doMes.length > 0 && (
        <a class="aviso aviso-insight" href="#/analise">
          <IconChartBar aria-hidden="true" />
          <span>{resumoInsight}</span>
          <IconChevronRight class="aviso-seta" aria-hidden="true" />
        </a>
      )}

      {aConfirmar > 0 && (
        <a class="aviso aviso-atencao" href="#/despesas">
          <IconAlertTriangle aria-hidden="true" />
          <span>{aConfirmar === 1 ? '1 despesa tem dados a confirmar' : `${aConfirmar} despesas têm dados a confirmar`}</span>
        </a>
      )}
      {lembrarBackup && (
        <a class="aviso" href="#/backup">
          <IconDownload aria-hidden="true" />
          <span>Faça um backup: seus dados ficam só neste aparelho.</span>
        </a>
      )}

      <div class="grade-inicio">
        <section aria-labelledby="titulo-proximos">
          <h2 id="titulo-proximos">Próximos vencimentos</h2>
          {proximos.length > 0 ? (
            <ul class="lista">
              {proximos.map((i) => (
                <LinhaLancamento key={i.lancamento.id} item={i} onPagar={(x) => void pagar(x)} />
              ))}
            </ul>
          ) : (
            <p class="texto-suave">Nenhum vencimento pendente.</p>
          )}
        </section>

        <div>
          {doMes.length === 0 ? (
            <EstadoVazio
              titulo={`Nada lançado em ${formatarMes(mes)}`}
              texto="Cadastre uma despesa para ver o resumo deste mês."
              acao={{ rotulo: 'Cadastrar despesa', href: '#/nova' }}
            />
          ) : (
            <section aria-labelledby="titulo-categorias">
              <h2 id="titulo-categorias">Gastos por categoria</h2>
              <ul class="barras cartao">
                {resumo.porCategoria.map((c) => {
                  const cat = categorias.get(c.categoriaId);
                  const largura = Math.max(4, Math.round((c.total / maiorCategoria) * 100));
                  return (
                    <li key={c.categoriaId}>
                      <a class="barra-link" href={lista({ categoriaId: c.categoriaId })}>
                        <span class="barra-topo">
                          <span>{cat?.nome ?? 'Sem categoria'}</span>
                          <span>{formatarReais(c.total)}</span>
                        </span>
                        <span class="barra-trilho">
                          <span class="barra-preenchida" style={{ width: `${largura}%`, background: cat?.cor ?? '#57534E' }} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="titulo-futuros">
            <h2 id="titulo-futuros">Próximos meses</h2>
            <div class="meses-futuros">
              {futuros.map((f) => (
                <a class="metrica metrica-pequena metrica-link" key={f.mes} href={caminho({ tela: 'lancamentos', filtros: { mes: f.mes } })}>
                  <span class="metrica-rotulo">{formatarMesCurto(f.mes)}</span>
                  <ValorQueCabe class="metrica-valor">{formatarReais(f.total)}</ValorQueCabe>
                  {f.temEstimado && <span class="texto-suave">inclui estimativas</span>}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
