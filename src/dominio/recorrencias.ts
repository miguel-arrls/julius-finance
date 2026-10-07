import { vencimentoNoCartao } from './cartao';
import { ehDataISO, mesDe, somarDias, somarMeses, somarMesesAoMes, ultimoDia } from './datas';
import {
  ErroDominio,
  type DataISO,
  type DespesaRecorrente,
  type Frequencia,
  type Lancamento,
  type MeioPagamento,
  type MesISO,
  type Mudancas,
} from './tipos';

const LIMITE_OCORRENCIAS = 5000;

export type EstadoRecorrencia = 'ativa' | 'pausada' | 'encerrada';

/** Gera ocorrências até o fim do mês atual + 12 meses. */
export function horizonte(hoje: DataISO): DataISO {
  return ultimoDia(somarMesesAoMes(mesDe(hoje), 12));
}

export function chavePeriodo(frequencia: Frequencia, data: DataISO): string {
  if (frequencia === 'mensal') return mesDe(data);
  if (frequencia === 'anual') return data.slice(0, 4);
  return data;
}

export function idOcorrencia(despesaId: string, chave: string): string {
  return `${despesaId}@${chave}`;
}

export function estaPausada(r: DespesaRecorrente, data: DataISO): boolean {
  return r.pausas.some((p) => data >= p.de && (p.ate === undefined || data < p.ate));
}

function validarRecorrente(r: DespesaRecorrente): void {
  if (!Number.isInteger(r.valor) || r.valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
  if (!ehDataISO(r.inicio)) throw new ErroDominio('Informe a data da primeira cobrança.');
  if (r.fim !== undefined && (!ehDataISO(r.fim) || r.fim < r.inicio)) {
    throw new ErroDominio('O fim não pode ser antes do início.');
  }
}

export function datasDeCobranca(r: DespesaRecorrente, ate: DataISO): DataISO[] {
  const limite = r.fim && r.fim < ate ? r.fim : ate;
  const datas: DataISO[] = [];
  for (let k = 0; k < LIMITE_OCORRENCIAS; k++) {
    const data =
      r.frequencia === 'mensal'
        ? somarMeses(r.inicio, k)
        : r.frequencia === 'semanal'
          ? somarDias(r.inicio, 7 * k)
          : somarMeses(r.inicio, 12 * k);
    if (data > limite) break;
    if (!estaPausada(r, data)) datas.push(data);
  }
  return datas;
}

export function vencimentoDaCobranca(data: DataISO, meio?: MeioPagamento): DataISO {
  if (meio?.tipo === 'credito' && meio.diaFechamento && meio.diaVencimento) {
    return vencimentoNoCartao(data, meio.diaFechamento, meio.diaVencimento);
  }
  return data;
}

export function gerarOcorrencias(r: DespesaRecorrente, meio: MeioPagamento | undefined, hoje: DataISO): Lancamento[] {
  validarRecorrente(r);
  return datasDeCobranca(r, horizonte(hoje)).map((data) => {
    const chave = chavePeriodo(r.frequencia, data);
    const vencimento = vencimentoDaCobranca(data, meio);
    return {
      id: idOcorrencia(r.id, chave),
      despesaId: r.id,
      chavePeriodo: chave,
      dataCobranca: data,
      vencimento,
      mes: mesDe(vencimento),
      valor: r.valor,
      estimado: r.valorVariavel,
    };
  });
}

/**
 * Cria as ocorrências que faltam e remove as não pagas que deixaram de valer.
 * Com `aPartirDe`, também recria as não pagas desse mês em diante (edição de valor/data).
 */
export function sincronizarRecorrencia(
  r: DespesaRecorrente,
  meio: MeioPagamento | undefined,
  existentes: Lancamento[],
  hoje: DataISO,
  aPartirDe?: MesISO,
): Mudancas {
  const geradas = gerarOcorrencias(r, meio, hoje);
  const validas = new Set(geradas.map((l) => l.id));
  const doMesmo = existentes.filter((l) => l.despesaId === r.id);
  const remover = doMesmo
    .filter((l) => !l.pagoEm && (!validas.has(l.id) || (aPartirDe !== undefined && l.mes >= aPartirDe)))
    .map((l) => l.id);
  const removidos = new Set(remover);
  const mantidos = new Set(doMesmo.filter((l) => !removidos.has(l.id)).map((l) => l.id));
  return { salvar: geradas.filter((l) => !mantidos.has(l.id)), remover };
}

export function pausar(r: DespesaRecorrente, data: DataISO): DespesaRecorrente {
  if (r.pausas.some((p) => p.ate === undefined)) throw new ErroDominio('Esta recorrência já está pausada.');
  return { ...r, pausas: [...r.pausas, { de: data }] };
}

export function retomar(r: DespesaRecorrente, data: DataISO): DespesaRecorrente {
  const i = r.pausas.findIndex((p) => p.ate === undefined);
  if (i === -1) throw new ErroDominio('Esta recorrência não está pausada.');
  const aberta = r.pausas[i]!;
  if (data < aberta.de) throw new ErroDominio('A retomada não pode ser antes do início da pausa.');
  return { ...r, pausas: r.pausas.map((p, j) => (j === i ? { de: p.de, ate: data } : p)) };
}

export function encerrar(r: DespesaRecorrente, fim: DataISO): DespesaRecorrente {
  if (fim < r.inicio) throw new ErroDominio('O fim não pode ser antes do início.');
  return { ...r, fim };
}

export function estadoRecorrencia(r: DespesaRecorrente, hoje: DataISO): EstadoRecorrencia {
  if (r.fim && r.fim < hoje) return 'encerrada';
  if (r.pausas.some((p) => p.ate === undefined && p.de <= hoje)) return 'pausada';
  return 'ativa';
}
