import { mesDe, somarMeses, somarMesesAoMes } from './datas';
import { dividirEmParcelas } from './dinheiro';
import {
  ErroDominio,
  type Centavos,
  type DespesaAvulsa,
  type DespesaParcelada,
  type Lancamento,
  type Mudancas,
} from './tipos';

export const MAX_PARCELAS = 120;

export function idParcela(despesaId: string, numero: number): string {
  return `${despesaId}#${numero}`;
}

function validarParcelada(d: DespesaParcelada): void {
  if (!Number.isInteger(d.numParcelas) || d.numParcelas < 1 || d.numParcelas > MAX_PARCELAS) {
    throw new ErroDominio(`O número de parcelas deve estar entre 1 e ${MAX_PARCELAS}.`);
  }
  if (!Number.isInteger(d.comecaNaParcela) || d.comecaNaParcela < 1 || d.comecaNaParcela > d.numParcelas) {
    throw new ErroDominio(`A parcela inicial deve estar entre 1 e ${d.numParcelas}.`);
  }
  const valor = d.valorParcela ?? d.valorTotal;
  if (!Number.isInteger(valor) || valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
}

export function valoresDasParcelas(d: DespesaParcelada): Centavos[] {
  if (d.valorParcela !== undefined) return Array.from({ length: d.numParcelas }, () => d.valorParcela!);
  return dividirEmParcelas(d.valorTotal, d.numParcelas);
}

/** Quanto a soma das parcelas informadas passa do total (juros, por exemplo). */
export function diferencaParcelas(d: DespesaParcelada): Centavos {
  return d.valorParcela === undefined ? 0 : d.valorParcela * d.numParcelas - d.valorTotal;
}

export function gerarParcelas(d: DespesaParcelada): Lancamento[] {
  validarParcelada(d);
  const valores = valoresDasParcelas(d);
  const parcelas: Lancamento[] = [];
  for (let numero = d.comecaNaParcela; numero <= d.numParcelas; numero++) {
    const deslocamento = numero - d.comecaNaParcela;
    const vencimento = d.primeiroVencimento ? somarMeses(d.primeiroVencimento, deslocamento) : undefined;
    parcelas.push({
      id: idParcela(d.id, numero),
      despesaId: d.id,
      numero,
      mes: vencimento ? mesDe(vencimento) : somarMesesAoMes(d.mesPrimeira, deslocamento),
      vencimento,
      valor: valores[numero - 1]!,
      estimado: false,
    });
  }
  return parcelas;
}

/** Recalcula as parcelas após uma edição sem tocar nas pagas e sem duplicar. */
export function regerarParcelas(d: DespesaParcelada, existentes: Lancamento[]): Mudancas {
  validarParcelada(d);
  const pagas = existentes.filter((l) => l.pagoEm);
  if (pagas.length > 0) {
    const numeros = pagas.map((l) => l.numero ?? 0);
    const maior = Math.max(...numeros);
    if (maior > d.numParcelas) {
      throw new ErroDominio(`Já existe pagamento na parcela ${maior}. O número de parcelas não pode ser menor que ${maior}.`);
    }
    const menor = Math.min(...numeros);
    if (menor < d.comecaNaParcela) {
      throw new ErroDominio(`A parcela ${menor} já foi paga. "Começa na parcela" não pode ser maior que ${menor}.`);
    }
  }
  const idsPagos = new Set(pagas.map((l) => l.id));
  const novas = gerarParcelas(d);
  const idsNovos = new Set(novas.map((l) => l.id));
  return {
    salvar: novas.filter((l) => !idsPagos.has(l.id)),
    remover: existentes.filter((l) => !l.pagoEm && !idsNovos.has(l.id)).map((l) => l.id),
  };
}

export function gerarAvulsa(d: DespesaAvulsa): Lancamento {
  if (!Number.isInteger(d.valor) || d.valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
  return {
    id: `${d.id}#1`,
    despesaId: d.id,
    mes: d.vencimento ? mesDe(d.vencimento) : d.mes,
    vencimento: d.vencimento,
    valor: d.valor,
    estimado: false,
  };
}

export function regerarAvulsa(d: DespesaAvulsa, existentes: Lancamento[]): Mudancas {
  const nova = gerarAvulsa(d);
  const anterior = existentes.find((l) => l.id === nova.id);
  const salvar = anterior?.pagoEm ? { ...nova, pagoEm: anterior.pagoEm, valorPago: anterior.valorPago } : nova;
  return { salvar: [salvar], remover: existentes.filter((l) => l.id !== nova.id).map((l) => l.id) };
}
