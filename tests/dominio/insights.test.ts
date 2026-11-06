import { describe, expect, it } from 'vitest';
import { compararComAnterior, compromissosFuturos, evolucao, gastosPorMeio } from '../../src/dominio/insights';
import { detalhar, type Cadastros } from '../../src/dominio/resumo';
import type { Despesa, Lancamento } from '../../src/dominio/tipos';
import { avulsa, CARTAO, lanc, parcelada, PIX, recorrente } from '../fabricas';

const HOJE = '2026-12-15';

function itensDe(despesas: Despesa[], lancamentos: Lancamento[]) {
  const cad: Cadastros = { despesas, categorias: [], marcas: [], meios: [CARTAO, PIX] };
  return detalhar(lancamentos, cad, HOJE);
}

const despesas: Despesa[] = [
  avulsa({ id: 'av-mercado', descricao: 'Mercado ⟦teste⟧', categoriaId: 'cat-mercado', meioPagamentoId: 'mp-pix' }),
  avulsa({ id: 'av-saude', descricao: 'Farmácia', categoriaId: 'cat-saude', meioPagamentoId: 'mp-cartao' }),
  avulsa({ id: 'av-lazer', descricao: 'Cinema', categoriaId: 'cat-lazer', meioPagamentoId: 'mp-pix' }),
  avulsa({ id: 'av-sem-meio', descricao: 'Feira', categoriaId: 'cat-outros' }),
  recorrente({ id: 're-luz', descricao: 'Luz', categoriaId: 'cat-casa', meioPagamentoId: 'mp-cartao', valorVariavel: true }),
];

const lancamentos: Lancamento[] = [
  lanc({ id: 'out-merc', despesaId: 'av-mercado', mes: '2026-10', valor: 10000, pagoEm: '2026-10-05' }),
  lanc({ id: 'dez-merc', despesaId: 'av-mercado', mes: '2026-12', valor: 20000, pagoEm: '2026-12-03', valorPago: 21000 }),
  lanc({ id: 'dez-saude', despesaId: 'av-saude', mes: '2026-12', vencimento: '2026-12-20', valor: 5000 }),
  lanc({ id: 'dez-luz', despesaId: 're-luz', mes: '2026-12', valor: 8000, estimado: true, pagoEm: '2026-12-10', valorPago: 7000 }),
  lanc({ id: 'dez-feira', despesaId: 'av-sem-meio', mes: '2026-12', valor: 5000 }),
  lanc({ id: 'jan-merc', despesaId: 'av-mercado', mes: '2027-01', valor: 25000 }),
  lanc({ id: 'jan-lazer', despesaId: 'av-lazer', mes: '2027-01', valor: 3000 }),
  lanc({ id: 'jan-luz', despesaId: 're-luz', mes: '2027-01', valor: 8000, estimado: true }),
];

const itens = itensDe(despesas, lancamentos);

describe('compararComAnterior', () => {
  it('na virada de ano compara janeiro com dezembro, usando o valor pago quando pago', () => {
    const c = compararComAnterior(itens, '2027-01');
    expect(c.atual).toBe(36000);
    expect(c.anterior).toBe(38000); // 21000 (pago) + 5000 + 7000 (pago) + 5000
    expect(c.variacao).toBe(-2000);
    expect(c.percentual).toBeCloseTo(-2000 / 38000, 10);
  });

  it('inclui categorias de um só mês, maior aumento primeiro e empate por categoriaId', () => {
    expect(compararComAnterior(itens, '2027-01').porCategoria).toEqual([
      { categoriaId: 'cat-mercado', atual: 25000, anterior: 21000, variacao: 4000 },
      { categoriaId: 'cat-lazer', atual: 3000, anterior: 0, variacao: 3000 },
      { categoriaId: 'cat-casa', atual: 8000, anterior: 7000, variacao: 1000 },
      { categoriaId: 'cat-outros', atual: 0, anterior: 5000, variacao: -5000 },
      { categoriaId: 'cat-saude', atual: 0, anterior: 5000, variacao: -5000 },
    ]);
  });

  it('mês anterior vazio dá percentual null, sem dividir por zero', () => {
    const c = compararComAnterior(itens, '2026-12');
    expect(c.anterior).toBe(0);
    expect(c.atual).toBe(38000);
    expect(c.variacao).toBe(38000);
    expect(c.percentual).toBeNull();
  });

  it('os dois meses vazios dão zero', () => {
    expect(compararComAnterior(itens, '2027-06')).toEqual({ atual: 0, anterior: 0, variacao: 0, percentual: null, porCategoria: [] });
  });
});

describe('gastosPorMeio', () => {
  it('agrupa por meio, com sem meio como undefined, maior total primeiro', () => {
    expect(gastosPorMeio(itens, '2026-12')).toEqual([
      { meioId: 'mp-pix', total: 21000, qtd: 1 },
      { meioId: 'mp-cartao', total: 12000, qtd: 2 },
      { meioId: undefined, total: 5000, qtd: 1 },
    ]);
  });

  it('empate ordena por meioId, com undefined por último', () => {
    const empatados = itensDe(despesas, [
      lanc({ id: 'e1', despesaId: 'av-sem-meio', mes: '2027-03', valor: 3000 }),
      lanc({ id: 'e2', despesaId: 'av-mercado', mes: '2027-03', valor: 3000 }),
      lanc({ id: 'e3', despesaId: 'av-saude', mes: '2027-03', valor: 3000 }),
    ]);
    expect(gastosPorMeio(empatados, '2027-03').map((g) => g.meioId)).toEqual(['mp-cartao', 'mp-pix', undefined]);
  });

  it('mês vazio dá lista vazia', () => {
    expect(gastosPorMeio(itens, '2027-06')).toEqual([]);
  });
});

describe('evolucao', () => {
  it('janela de 6 meses em ordem cronológica, com meses vazios e virada de ano', () => {
    const e = evolucao(itens, '2027-01');
    expect(e.meses).toEqual([
      { mes: '2026-08', total: 0, pago: 0, pendente: 0, temEstimado: false },
      { mes: '2026-09', total: 0, pago: 0, pendente: 0, temEstimado: false },
      { mes: '2026-10', total: 10000, pago: 10000, pendente: 0, temEstimado: false },
      { mes: '2026-11', total: 0, pago: 0, pendente: 0, temEstimado: false },
      // a luz estimada de dezembro já foi paga, então não conta como estimada
      { mes: '2026-12', total: 38000, pago: 28000, pendente: 10000, temEstimado: false },
      { mes: '2027-01', total: 36000, pago: 0, pendente: 36000, temEstimado: true },
    ]);
  });

  it('média exclui o mês atual e os meses zerados', () => {
    expect(evolucao(itens, '2027-01').media).toBe(24000); // (10000 + 38000) / 2
    expect(evolucao(itens, '2027-01', 3).media).toBe(38000);
  });

  it('média é null sem meses fechados com gasto', () => {
    expect(evolucao(itens, '2026-10', 3).media).toBeNull();
  });

  it('média arredonda para centavos inteiros', () => {
    const poucos = itensDe(despesas, [
      lanc({ id: 'r1', despesaId: 'av-mercado', mes: '2027-02', valor: 1000 }),
      lanc({ id: 'r2', despesaId: 'av-mercado', mes: '2027-03', valor: 1001 }),
    ]);
    expect(evolucao(poucos, '2027-04', 3).media).toBe(1001); // 1000,5
  });
});

describe('compromissosFuturos', () => {
  const MES = '2027-01';

  const despesasC: Despesa[] = [
    parcelada({ id: 'pa-cel', descricao: 'Celular', numParcelas: 4, valorTotal: 100000 }),
    parcelada({ id: 'pa-tv', descricao: 'Televisão', numParcelas: 3, valorTotal: 30000 }),
    parcelada({ id: 'pa-bike', descricao: 'Bicicleta', numParcelas: 1, valorTotal: 5000 }),
    parcelada({ id: 'pa-sofa', descricao: 'Sofá', numParcelas: 1, valorTotal: 9000 }),
    recorrente({ id: 're-stream', valor: 3990 }),
    recorrente({ id: 're-anual', valor: 12010, frequencia: 'anual', inicio: '2026-03-01' }),
    recorrente({ id: 're-semanal', valor: 1000, frequencia: 'semanal', inicio: '2026-12-01' }),
    recorrente({ id: 're-ultimo-dia', valor: 500, inicio: '2027-01-31' }),
    recorrente({ id: 're-futura', valor: 99999, inicio: '2027-02-01' }),
    recorrente({ id: 're-encerra-no-mes', valor: 700, fim: '2027-01-01' }),
    recorrente({ id: 're-encerrada', valor: 99999, fim: '2026-12-31' }),
    recorrente({ id: 're-pausada', valor: 99999, pausas: [{ de: '2026-12-01' }] }),
    recorrente({ id: 're-retomada', valor: 200, pausas: [{ de: '2026-11-01', ate: '2026-12-01' }] }),
    recorrente({ id: 're-luz', valor: 8000, valorVariavel: true }),
    recorrente({ id: 're-agua', valor: 2400, valorVariavel: true, frequencia: 'anual' }),
    recorrente({ id: 're-gas-pausado', valor: 99999, valorVariavel: true, pausas: [{ de: '2027-01-01' }] }),
    avulsa({ id: 'av-qualquer', valor: 99999, mes: MES }),
  ];

  const lancC: Lancamento[] = [
    lanc({ id: 'pa-cel#1', despesaId: 'pa-cel', numero: 1, mes: '2026-11', valor: 25000, pagoEm: '2026-11-10' }),
    lanc({ id: 'pa-cel#2', despesaId: 'pa-cel', numero: 2, mes: '2026-12', valor: 25000, pagoEm: '2026-12-10', valorPago: 24000 }),
    lanc({ id: 'pa-cel#3', despesaId: 'pa-cel', numero: 3, mes: '2027-01', valor: 25000 }),
    lanc({ id: 'pa-cel#4', despesaId: 'pa-cel', numero: 4, mes: '2027-02', valor: 25000 }),
    // parcela atrasada de mês anterior fica fora: conta só de `mes` em diante
    lanc({ id: 'pa-tv#1', despesaId: 'pa-tv', numero: 1, mes: '2026-12', vencimento: '2026-12-05', valor: 10000 }),
    lanc({ id: 'pa-tv#2', despesaId: 'pa-tv', numero: 2, mes: '2027-01', valor: 10000 }),
    lanc({ id: 'pa-tv#3', despesaId: 'pa-tv', numero: 3, mes: '2027-03', valor: 10000 }),
    lanc({ id: 'pa-bike#1', despesaId: 'pa-bike', numero: 1, mes: '2027-02', valor: 5000 }),
    lanc({ id: 'pa-sofa#1', despesaId: 'pa-sofa', numero: 1, mes: '2027-01', valor: 9000, pagoEm: '2027-01-02' }),
    lanc({ id: 're-stream@2027-01', despesaId: 're-stream', mes: '2027-01', valor: 3990 }),
    lanc({ id: 'av-qualquer', despesaId: 'av-qualquer', mes: '2027-01', valor: 99999 }),
  ];

  const c = compromissosFuturos(itensDe(despesasC, lancC), despesasC, MES);

  it('parceladas com parcelas pagas e futuras: só o que falta, pelo valor previsto', () => {
    expect(c.parceladas).toEqual([
      { despesaId: 'pa-tv', descricao: 'Televisão', restante: 20000, parcelasRestantes: 2, ultimoMes: '2027-03' },
      { despesaId: 'pa-bike', descricao: 'Bicicleta', restante: 5000, parcelasRestantes: 1, ultimoMes: '2027-02' },
      { despesaId: 'pa-cel', descricao: 'Celular', restante: 50000, parcelasRestantes: 2, ultimoMes: '2027-02' },
    ]);
  });

  it('parcelada quitada não entra', () => {
    expect(c.parceladas.some((p) => p.despesaId === 'pa-sofa')).toBe(false);
  });

  it('fixos mensais convertem anual e semanal e ignoram pausadas, encerradas e futuras', () => {
    // 3990 + round(12010/12)=1001 + round(1000*52/12)=4333 + 500 + 700 + 200
    expect(c.fixosMensal).toBe(10724);
  });

  it('variáveis somam a estimativa mensal e ignoram pausa em aberto', () => {
    // 8000 + 2400/12
    expect(c.variaveisEstimado).toBe(8200);
  });

  it('sem despesas dá zeros', () => {
    expect(compromissosFuturos([], [], MES)).toEqual({ parceladas: [], fixosMensal: 0, variaveisEstimado: 0 });
  });
});
