import { describe, expect, it } from 'vitest';
import {
  encerrar,
  estadoRecorrencia,
  gerarOcorrencias,
  horizonte,
  pausar,
  retomar,
  sincronizarRecorrencia,
} from '../../src/dominio/recorrencias';
import { aplicar, CARTAO, esperarErroDominio, recorrente } from '../fabricas';

const HOJE = '2026-10-06';

describe('horizonte', () => {
  it('vai até o fim do mês atual + 12', () => {
    expect(horizonte(HOJE)).toBe('2027-10-31');
  });
});

describe('gerarOcorrencias', () => {
  it('mensal: do início até o horizonte, com ID por mês', () => {
    const r = gerarOcorrencias(recorrente(), undefined, HOJE);
    expect(r).toHaveLength(13);
    expect(r[0]).toEqual({
      id: 're1@2026-10',
      despesaId: 're1',
      chavePeriodo: '2026-10',
      dataCobranca: '2026-10-08',
      vencimento: '2026-10-08',
      mes: '2026-10',
      valor: 3990,
      estimado: false,
    });
    expect(r.at(-1)!.id).toBe('re1@2027-10');
  });

  it('no cartão, o vencimento segue a fatura e o mês é o do vencimento', () => {
    const r = gerarOcorrencias(recorrente(), CARTAO, HOJE);
    expect(r[0]).toMatchObject({ dataCobranca: '2026-10-08', vencimento: '2026-11-07', mes: '2026-11' });
    expect(r.at(-1)).toMatchObject({ dataCobranca: '2027-10-08', vencimento: '2027-11-07', mes: '2027-11' });
  });

  it('dia 31 acompanha o fim de cada mês', () => {
    const r = gerarOcorrencias(recorrente({ inicio: '2026-01-31' }), undefined, HOJE);
    expect(r.slice(0, 3).map((l) => l.dataCobranca)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('semanal: a cada 7 dias, chave pela data', () => {
    const r = gerarOcorrencias(recorrente({ frequencia: 'semanal', inicio: '2026-10-06' }), undefined, HOJE);
    expect(r).toHaveLength(56);
    expect(r.slice(0, 2).map((l) => l.id)).toEqual(['re1@2026-10-06', 're1@2026-10-13']);
  });

  it('anual: 29/02 vira 28/02 nos anos não bissextos', () => {
    const r = gerarOcorrencias(recorrente({ frequencia: 'anual', inicio: '2024-02-29' }), undefined, HOJE);
    expect(r.map((l) => [l.id, l.dataCobranca])).toEqual([
      ['re1@2024', '2024-02-29'],
      ['re1@2025', '2025-02-28'],
      ['re1@2026', '2026-02-28'],
      ['re1@2027', '2027-02-28'],
    ]);
  });

  it('anual: volta a 29/02 quando o ano é bissexto novamente', () => {
    const r = gerarOcorrencias(recorrente({ frequencia: 'anual', inicio: '2024-02-29' }), undefined, '2028-03-01');
    expect(r.find((l) => l.id === 're1@2028')?.dataCobranca).toBe('2028-02-29');
  });

  it('respeita o fim', () => {
    expect(gerarOcorrencias(recorrente({ fim: '2026-12-31' }), undefined, HOJE).map((l) => l.id)).toEqual([
      're1@2026-10',
      're1@2026-11',
      're1@2026-12',
    ]);
  });

  it('valor variável gera estimativas', () => {
    expect(gerarOcorrencias(recorrente({ valorVariavel: true }), undefined, HOJE).every((l) => l.estimado)).toBe(true);
  });

  it('pula o período pausado', () => {
    const r = gerarOcorrencias(recorrente({ pausas: [{ de: '2026-12-01', ate: '2027-03-01' }] }), undefined, HOJE);
    expect(r.map((l) => l.chavePeriodo)).toEqual([
      '2026-10', '2026-11', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
    ]);
  });

  it.each([
    [{ valor: 0 }, 'Informe um valor maior que zero.'],
    [{ inicio: '2026-02-30' }, 'Informe a data da primeira cobrança.'],
    [{ fim: '2026-01-01' }, 'O fim não pode ser antes do início.'],
  ])('rejeita %o', (o, mensagem) => {
    esperarErroDominio(() => gerarOcorrencias(recorrente(o), undefined, HOJE), mensagem);
  });
});

describe('sincronizarRecorrencia', () => {
  it('é idempotente', () => {
    const primeira = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    expect(sincronizarRecorrencia(recorrente(), undefined, primeira, HOJE)).toEqual({ salvar: [], remover: [] });
  });

  it('pausar remove só as ocorrências não pagas a partir da pausa', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-12' ? { ...l, pagoEm: '2026-12-08', valorPago: l.valor } : l));
    const m = sincronizarRecorrencia(pausar(recorrente(), '2026-12-01'), undefined, atual, HOJE);
    expect(m.salvar).toEqual([]);
    expect(m.remover).toHaveLength(10);
    expect(m.remover).not.toContain('re1@2026-12');
    expect(m.remover).not.toContain('re1@2026-11');
  });

  it('editar a partir de um mês troca o valor só dali em diante', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-10' ? { ...l, pagoEm: '2026-10-08', valorPago: 3990 } : l));
    const final = aplicar(atual, sincronizarRecorrencia(recorrente({ valor: 4990 }), undefined, atual, HOJE, '2027-01'));
    const valores = Object.fromEntries(final.map((l) => [l.chavePeriodo, l.valor]));
    expect(valores['2026-10']).toBe(3990);
    expect(valores['2026-11']).toBe(3990);
    expect(valores['2026-12']).toBe(3990);
    expect(valores['2027-01']).toBe(4990);
    expect(valores['2027-10']).toBe(4990);
    expect(final).toHaveLength(13);
  });

  it('editar sem "a partir de" não altera lançamentos existentes', () => {
    const atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    expect(sincronizarRecorrencia(recorrente({ valor: 4990 }), undefined, atual, HOJE)).toEqual({ salvar: [], remover: [] });
  });

  it('encerrar mantém ocorrência paga depois do fim', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2027-01' ? { ...l, pagoEm: '2027-01-08' } : l));
    const m = sincronizarRecorrencia(encerrar(recorrente(), '2026-11-30'), undefined, atual, HOJE);
    expect(m.remover).not.toContain('re1@2027-01');
    expect(m.remover).toContain('re1@2026-12');
  });

  it('pagas nunca mudam na edição a partir de um mês', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2027-02' ? { ...l, pagoEm: '2027-02-08', valorPago: 3990 } : l));
    const m = sincronizarRecorrencia(recorrente({ valor: 4990 }), undefined, atual, HOJE, '2027-01');
    expect(m.remover).not.toContain('re1@2027-02');
    expect(m.salvar.map((l) => l.id)).not.toContain('re1@2027-02');
    const final = aplicar(atual, m);
    const paga = final.find((l) => l.id === 're1@2027-02')!;
    expect(paga.valor).toBe(3990);
    expect(paga.pagoEm).toBe('2027-02-08');
  });

  it('semanal com setembro pago: mudar o dia a partir de outubro não cria nada antes de outubro', () => {
    const segunda = recorrente({ frequencia: 'semanal', inicio: '2026-09-07' }); // 07/09/2026 é segunda-feira
    let atual = aplicar([], sincronizarRecorrencia(segunda, undefined, [], HOJE));
    atual = atual.map((l) => (l.mes === '2026-09' ? { ...l, pagoEm: l.dataCobranca, valorPago: l.valor } : l));
    const setembroAntes = atual.filter((l) => l.mes === '2026-09');
    expect(setembroAntes.map((l) => l.id)).toEqual(['re1@2026-09-07', 're1@2026-09-14', 're1@2026-09-21', 're1@2026-09-28']);
    const m = sincronizarRecorrencia({ ...segunda, inicio: '2026-09-08' }, undefined, atual, HOJE, '2026-10');
    expect(m.salvar.filter((l) => l.mes < '2026-10').map((l) => l.id)).toEqual([]);
    const final = aplicar(atual, m);
    expect(final.filter((l) => l.mes === '2026-09')).toEqual(setembroAntes);
    expect(final.filter((l) => l.mes === '2026-10').map((l) => l.id)).toEqual([
      're1@2026-10-06',
      're1@2026-10-13',
      're1@2026-10-20',
      're1@2026-10-27',
    ]);
  });

  it('com "a partir de", não remove as não pagas de antes desse mês, mesmo as que deixaram de valer', () => {
    const segunda = recorrente({ frequencia: 'semanal', inicio: '2026-09-07' });
    let atual = aplicar([], sincronizarRecorrencia(segunda, undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-09-07' ? { ...l, pagoEm: '2026-09-07', valorPago: l.valor } : l));
    const m = sincronizarRecorrencia({ ...segunda, inicio: '2026-09-08' }, undefined, atual, HOJE, '2026-10');
    expect(m.remover.filter((id) => id < 're1@2026-10')).toEqual([]);
    expect(m.salvar.filter((l) => l.mes < '2026-10')).toEqual([]);
  });

  it('mensal: mudar o dia a partir de um mês não toca os meses anteriores', () => {
    const r = recorrente({ inicio: '2026-08-08' });
    let atual = aplicar([], sincronizarRecorrencia(r, undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-08' ? { ...l, pagoEm: '2026-08-08', valorPago: l.valor } : l));
    const anteriores = atual.filter((l) => l.mes < '2026-11');
    const m = sincronizarRecorrencia({ ...r, inicio: '2026-08-20' }, undefined, atual, HOJE, '2026-11');
    expect(m.salvar.filter((l) => l.mes < '2026-11')).toEqual([]);
    expect(m.remover.filter((id) => id < 're1@2026-11')).toEqual([]);
    const final = aplicar(atual, m);
    expect(final.filter((l) => l.mes < '2026-11')).toEqual(anteriores);
    expect(final.find((l) => l.id === 're1@2026-11')!.vencimento).toBe('2026-11-20');
  });

  it('sem "a partir de", continua removendo as não pagas que deixaram de valer e criando as que faltam', () => {
    const segunda = recorrente({ frequencia: 'semanal', inicio: '2026-09-07' });
    const atual = aplicar([], sincronizarRecorrencia(segunda, undefined, [], HOJE));
    const m = sincronizarRecorrencia({ ...segunda, inicio: '2026-09-08' }, undefined, atual, HOJE);
    expect(m.remover).toContain('re1@2026-09-07');
    expect(m.salvar.map((l) => l.id)).toContain('re1@2026-09-08');
  });

  it('ignora lançamentos de outra despesa', () => {
    const outroDespesa = { id: 'outra#1', despesaId: 'outra', mes: '2026-10', valor: 5000, estimado: false };
    const m = sincronizarRecorrencia(recorrente(), undefined, [outroDespesa], HOJE);
    expect(m.remover).not.toContain('outra#1');
    expect(m.salvar.map((l) => l.id)).not.toContain('outra#1');
  });
});

describe('pausar, retomar, encerrar e estado', () => {
  it('pausar e retomar registram o intervalo', () => {
    const p = pausar(recorrente(), '2026-12-01');
    expect(p.pausas).toEqual([{ de: '2026-12-01' }]);
    expect(retomar(p, '2027-03-01').pausas).toEqual([{ de: '2026-12-01', ate: '2027-03-01' }]);
  });

  it('rejeita operações inválidas', () => {
    esperarErroDominio(() => pausar(pausar(recorrente(), '2026-12-01'), '2026-12-05'), 'Esta recorrência já está pausada.');
    esperarErroDominio(() => retomar(recorrente(), '2026-12-01'), 'Esta recorrência não está pausada.');
    esperarErroDominio(
      () => retomar(pausar(recorrente(), '2026-12-01'), '2026-11-01'),
      'A retomada não pode ser antes do início da pausa.',
    );
    esperarErroDominio(() => encerrar(recorrente(), '2026-01-01'), 'O fim não pode ser antes do início.');
  });

  it('estadoRecorrencia', () => {
    expect(estadoRecorrencia(recorrente(), HOJE)).toBe('ativa');
    expect(estadoRecorrencia(pausar(recorrente(), '2026-10-01'), HOJE)).toBe('pausada');
    expect(estadoRecorrencia(pausar(recorrente(), '2026-11-01'), HOJE)).toBe('ativa');
    expect(estadoRecorrencia(recorrente({ inicio: '2026-01-08', fim: '2026-10-01' }), HOJE)).toBe('encerrada');
  });
});
