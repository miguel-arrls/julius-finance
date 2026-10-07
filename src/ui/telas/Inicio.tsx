import { IconAlertTriangle, IconDownload } from '@tabler/icons-preact';
import { useMemo } from 'preact/hooks';
import { desfazerPagamento, desfazerVariosPagamentos, marcarPaga, marcarVariosPagos } from '../../dados/repositorio';
import { formatarData, formatarMes, formatarMesCurto } from '../../dominio/datas';
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
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { SeletorMes } from '../componentes/SeletorMes';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

const MENSAGEM_FALHA = 'Não foi possível marcar como paga. Tente de novo.';

function Metrica({ rotulo, valor, destaque = false, classe = '' }: { rotulo: string; valor: Centavos; destaque?: boolean; classe?: string }) {
  return (
    <div class={`metrica${destaque ? ' metrica-destaque' : ''}`}>
      <span class="metrica-rotulo">{rotulo}</span>
      <span class={`metrica-valor ${classe}`}>{formatarReais(valor)}</span>
    </div>
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
  const proximos = proximosVencimentos(itens, 6);
  const faturas = faturasDoMes(itens, mes);
  const futuros = totaisProximosMeses(itens, mes, 3);
  const aConfirmar = contarAConfirmar(estado.despesas);
  const lembrarBackup = estado.despesas.length > 0 && backupAtrasado(estado.config?.ultimoBackupEm, hoje);
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const maiorCategoria = resumo.porCategoria[0]?.total || 1;

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

  return (
    <>
      <SeletorMes />
      <section class="cartoes-resumo" aria-label="Resumo do mês">
        <Metrica rotulo="Total do mês" valor={resumo.total} destaque />
        <Metrica rotulo="Pago" valor={resumo.pago} classe="positivo" />
        <Metrica rotulo="Pendente" valor={resumo.pendente} />
        {resumo.atrasado > 0 && (
          <Metrica rotulo={plural(resumo.qtdAtrasadas, 'atrasada', 'atrasadas')} valor={resumo.atrasado} classe="negativo" />
        )}
      </section>

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
          {faturas.map((f) => {
            const meio = estado.meios.find((m) => m.id === f.meioId);
            return (
              <section class="cartao" key={`${f.meioId}-${f.vencimento}`} aria-label={`Fatura ${meio?.nome ?? ''}`}>
                <div class="barra-topo">
                  <h2>Fatura {meio?.nome}</h2>
                  <strong>{formatarReais(f.total)}</strong>
                </div>
                <p class="texto-suave">
                  Vence em {formatarData(f.vencimento)} · {plural(f.ids.length, 'lançamento', 'lançamentos')}
                </p>
                {f.pago ? (
                  <span class="pilula pilula-paga">Fatura paga</span>
                ) : (
                  <button type="button" class="botao botao-largo" onClick={() => void pagarFatura(f)}>
                    Marcar fatura como paga
                  </button>
                )}
              </section>
            );
          })}

          {doMes.length === 0 ? (
            <EstadoVazio
              titulo={`Nada lançado em ${formatarMes(mes)}`}
              texto="Cadastre uma despesa para ver o resumo deste mês."
              acao={{ rotulo: 'Cadastrar despesa', href: '#/nova' }}
            />
          ) : (
            <section aria-labelledby="titulo-categorias">
              <h2 id="titulo-categorias">Gastos por categoria</h2>
              <ul class="barras">
                {resumo.porCategoria.map((c) => {
                  const cat = categorias.get(c.categoriaId);
                  const largura = Math.max(4, Math.round((c.total / maiorCategoria) * 100));
                  return (
                    <li key={c.categoriaId}>
                      <div class="barra-topo">
                        <span>{cat?.nome ?? 'Sem categoria'}</span>
                        <span>{formatarReais(c.total)}</span>
                      </div>
                      <div class="barra-trilho">
                        <div class="barra-preenchida" style={{ width: `${largura}%`, background: cat?.cor ?? '#57534E' }} />
                      </div>
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
                <div class="metrica metrica-pequena" key={f.mes}>
                  <span class="metrica-rotulo">{formatarMesCurto(f.mes)}</span>
                  <span class="metrica-valor">{formatarReais(f.total)}</span>
                  {f.temEstimado && <span class="texto-suave">inclui estimativas</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
