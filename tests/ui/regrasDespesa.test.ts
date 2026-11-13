import { describe, expect, it } from 'vitest';
import {
  atualizarAConfirmar,
  montarDespesa,
  mudouCobranca,
  previa,
  aplicarFatura,
  resolverMarca,
  validar,
  vencimentoPelaFatura,
  valoresDeDespesa,
  valoresIniciais,
  type ValoresForm,
} from '../../src/ui/telas/regrasDespesa';
import { CARTAO, PIX, avulsa, parcelada, recorrente } from '../fabricas';

const v = (o: Partial<ValoresForm>): ValoresForm => ({ ...valoresIniciais('2026-10'), categoriaId: 'cat-outros', ...o });

describe('validar', () => {
  it('avulsa vazia: descrição e valor', () => {
    expect(validar(v({ descricao: '' }))).toEqual({
      descricao: 'Informe a descrição.',
      valor: 'Informe um valor maior que zero.',
    });
  });

  it('categoria obrigatória', () => {
    expect(validar(v({ descricao: 'Luz', valor: '10', categoriaId: '' }))).toEqual({ categoriaId: 'Escolha uma categoria.' });
  });

  it('avulsa válida', () => {
    expect(validar(v({ descricao: 'Luz', valor: '120,50', vencimento: '2026-10-20' }))).toEqual({});
  });

  it('parcelada: número de parcelas, valores e parcela inicial', () => {
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '1', valorTotal: '100' }))).toEqual({
      numParcelas: 'Informe de 2 a 120 parcelas.',
    });
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '3' }))).toEqual({
      valorTotal: 'Informe o valor total ou o valor da parcela.',
    });
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '12', valorParcela: '10', comecaNaParcela: '13' }))).toEqual({
      comecaNaParcela: 'A parcela inicial deve estar entre 1 e 12.',
    });
  });

  it('recorrente: início e fim', () => {
    expect(validar(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90' }))).toEqual({
      inicio: 'Informe a data da primeira cobrança.',
    });
    expect(validar(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90', inicio: '2026-10-10', fim: '2026-09-01' }))).toEqual({
      fim: 'O fim não pode ser antes do início.',
    });
  });
});

describe('montarDespesa', () => {
  it('parcelada só com o valor da parcela calcula o total', () => {
    const d = montarDespesa(v({ tipo: 'parcelada', descricao: 'Celular', numParcelas: '12', valorParcela: '450,00', comecaNaParcela: '11' }), { id: 'x' });
    expect(d).toMatchObject({ tipo: 'parcelada', valorTotal: 540000, valorParcela: 45000, numParcelas: 12, comecaNaParcela: 11, mesPrimeira: '2026-10' });
  });

  it('avulsa sem vencimento usa o mês informado', () => {
    expect(montarDespesa(v({ descricao: 'X', valor: '10', mes: '2026-12' }), { id: 'x' })).toMatchObject({ mes: '2026-12', vencimento: undefined });
  });

  it('recorrente preserva as pausas recebidas', () => {
    const d = montarDespesa(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90', inicio: '2026-10-10' }), { id: 'x', pausas: [{ de: '2026-12-01' }] });
    expect(d).toMatchObject({ tipo: 'recorrente', valor: 9990, pausas: [{ de: '2026-12-01' }] });
  });
});

describe('auxiliares', () => {
  it('resolverMarca', () => {
    const marcas = [{ id: 'm1', nome: 'Loja do Bairro', apelidos: ['Lojinha'] }, { id: 'm2', nome: 'Spotify', apelidos: [], logoSlug: 'spotify' }];
    const id = () => 'novo';
    expect(resolverMarca('lojinha', 'qualquer', marcas, id)).toEqual({ marcaId: 'm1' });
    expect(resolverMarca('Netflix', 'qualquer', marcas, id)).toEqual({ nova: { id: 'novo', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' } });
    expect(resolverMarca('Padaria do Zé', 'pão', marcas, id)).toEqual({ nova: { id: 'novo', nome: 'Padaria do Zé', apelidos: [] } });
    expect(resolverMarca('', 'Netflix família', [], id)).toEqual({ nova: { id: 'novo', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' } });
    expect(resolverMarca('', 'Spotify Premium', marcas, id)).toEqual({ marcaId: 'm2' });
    expect(resolverMarca('', 'Conta de luz', marcas, id)).toEqual({});
  });

  it('atualizarAConfirmar tira o que foi preenchido', () => {
    expect(
      atualizarAConfirmar(v({ tipo: 'parcelada', aConfirmar: ['vencimento', 'loja', 'valorTotal'], primeiroVencimento: '2026-11-10', marca: 'Loja' })),
    ).toEqual(['valorTotal']);
  });

  it('montarDespesa: avulsa salva sem vencimento ganha "vencimento" a confirmar, sem repetir, e perde ao preencher', () => {
    const avulsaForm = (o: Partial<ValoresForm>) => v({ descricao: 'Conserto', valor: '150,00', mes: '2026-11', ...o });
    expect(montarDespesa(avulsaForm({ vencimento: '', aConfirmar: [] }), { id: 'x' }).aConfirmar).toEqual(['vencimento']);
    expect(montarDespesa(avulsaForm({ vencimento: '', aConfirmar: ['valorTotal'] }), { id: 'x' }).aConfirmar).toEqual(['valorTotal', 'vencimento']);
    expect(montarDespesa(avulsaForm({ vencimento: '', aConfirmar: ['vencimento', 'valorTotal'] }), { id: 'x' }).aConfirmar).toEqual([
      'vencimento',
      'valorTotal',
    ]);
    expect(montarDespesa(avulsaForm({ vencimento: '2026-10-10', aConfirmar: ['vencimento'] }), { id: 'x' }).aConfirmar).toEqual([]);
    expect(montarDespesa(avulsaForm({ vencimento: '2026-10-10', aConfirmar: [] }), { id: 'x' }).aConfirmar).toEqual([]);
  });

  it('o formulário não mostra "vencimento" a confirmar antes de salvar', () => {
    expect(atualizarAConfirmar(v({ tipo: 'avulsa', vencimento: '', aConfirmar: [] }))).toEqual([]);
  });

  it('parcelada e recorrente salvas sem vencimento não ganham "vencimento" a confirmar', () => {
    const p = montarDespesa(v({ tipo: 'parcelada', descricao: 'TV', valorTotal: '300,00', numParcelas: '3', primeiroVencimento: '', mesPrimeira: '2026-11' }), { id: 'p' });
    expect(p.aConfirmar).toEqual([]);
    const r = montarDespesa(v({ tipo: 'recorrente', descricao: 'Luz', valor: '100,00', inicio: '2026-10-08' }), { id: 'r' });
    expect(r.aConfirmar).toEqual([]);
  });

  it('mudouCobranca considera só o que altera as cobranças', () => {
    expect(mudouCobranca(recorrente(), recorrente({ valor: 4990 }))).toBe(true);
    expect(mudouCobranca(recorrente(), recorrente({ descricao: 'Outra' }))).toBe(false);
  });

  it('previa da recorrente mostra as próximas e conta as anteriores a hoje', () => {
    const p = previa(recorrente({ inicio: '2026-08-08' }), undefined, '2026-10-06');
    expect(p.lancamentos.map((l) => l.dataCobranca)).toEqual(['2026-10-08', '2026-11-08', '2026-12-08']);
    expect(p.anteriores).toBe(2);
  });
});

describe('vencimento pela fatura do cartão', () => {
  const parc = (o: Partial<ValoresForm>) => v({ tipo: 'parcelada', numParcelas: '12', ...o });

  it('avulsa: a data da compra decide a fatura (no dia do fechamento vai para a seguinte)', () => {
    expect(vencimentoPelaFatura(v({ dataCompra: '2026-10-01' }), CARTAO)).toBe('2026-10-07');
    expect(vencimentoPelaFatura(v({ dataCompra: '2026-10-02' }), CARTAO)).toBe('2026-11-07');
  });

  it('avulsa sem data da compra: dia de vencimento do cartão no mês da fatura', () => {
    expect(vencimentoPelaFatura(v({ dataCompra: '', mes: '2026-12' }), CARTAO)).toBe('2026-12-07');
    expect(vencimentoPelaFatura(v({ dataCompra: '', mes: '' }), CARTAO)).toBeUndefined();
  });

  it('parcelada que começa na parcela 11: vencimento da parcela 11, não da 1', () => {
    expect(vencimentoPelaFatura(parc({ dataCompra: '2026-01-01', comecaNaParcela: '11' }), CARTAO)).toBe('2026-11-07');
    expect(vencimentoPelaFatura(parc({ dataCompra: '2026-01-01', comecaNaParcela: '1' }), CARTAO)).toBe('2026-01-07');
  });

  it('parcelada sem data da compra: o mês informado já é o da parcela inicial', () => {
    expect(vencimentoPelaFatura(parc({ dataCompra: '', mesPrimeira: '2026-11', comecaNaParcela: '11' }), CARTAO)).toBe('2026-11-07');
  });

  it('só para cartão de crédito com os dois dias', () => {
    expect(vencimentoPelaFatura(v({ dataCompra: '2026-10-01' }), PIX)).toBeUndefined();
    expect(vencimentoPelaFatura(v({ dataCompra: '2026-10-01' }), { ...CARTAO, diaFechamento: undefined })).toBeUndefined();
    expect(vencimentoPelaFatura(v({ dataCompra: '2026-10-01' }), undefined)).toBeUndefined();
  });

  it('aplicarFatura preenche o vencimento só no modo automático e fora da recorrente', () => {
    expect(aplicarFatura(v({ dataCompra: '2026-10-01', vencimento: '' }), CARTAO).vencimento).toBe('2026-10-07');
    expect(aplicarFatura(parc({ dataCompra: '2026-10-01' }), CARTAO).primeiroVencimento).toBe('2026-10-07');
    expect(aplicarFatura(v({ dataCompra: '2026-10-01', vencimento: '2026-12-15', vencimentoManual: true }), CARTAO).vencimento).toBe('2026-12-15');
    expect(aplicarFatura(v({ dataCompra: '2026-10-01', vencimento: '2026-12-15' }), PIX).vencimento).toBe('2026-12-15');
    const rec = v({ tipo: 'recorrente', inicio: '2026-10-01' });
    expect(aplicarFatura(rec, CARTAO)).toEqual(rec);
  });

  it('editar: vencimento gravado diferente do calculado abre no modo manual, sem perder a data', () => {
    const naRegra = avulsa({ meioPagamentoId: CARTAO.id, dataCompra: '2026-10-01', vencimento: '2026-10-07', mes: '2026-10' });
    const foraDaRegra = avulsa({ meioPagamentoId: CARTAO.id, dataCompra: '2026-10-01', vencimento: '2026-12-15', mes: '2026-12' });
    const aConfirmar = avulsa({ meioPagamentoId: CARTAO.id, vencimento: undefined, mes: '2026-12', aConfirmar: ['vencimento'] });
    expect(valoresDeDespesa(naRegra, [], '2026-10', [CARTAO]).vencimentoManual).toBe(false);
    expect(valoresDeDespesa(foraDaRegra, [], '2026-10', [CARTAO])).toMatchObject({ vencimentoManual: true, vencimento: '2026-12-15' });
    expect(valoresDeDespesa(aConfirmar, [], '2026-10', [CARTAO]).vencimentoManual).toBe(false);
    const parcForaDaRegra = parcelada({ meioPagamentoId: CARTAO.id, dataCompra: '2026-10-01', primeiroVencimento: '2026-10-20', mesPrimeira: '2026-10' });
    expect(valoresDeDespesa(parcForaDaRegra, [], '2026-10', [CARTAO]).vencimentoManual).toBe(true);
  });
});

describe('round-trip valoresDeDespesa -> montarDespesa', () => {
  const marcas = [{ id: 'm1', nome: 'Loja', apelidos: [] }];
  const desc = 'Açaí & Cia — ção ⟦⟧';
  const semCarimbo = ({ criadaEm: _c, atualizadaEm: _a, ...resto }: Record<string, unknown>) => resto;
  const casos = {
    avulsa: avulsa({ descricao: desc, valor: 120000, marcaId: 'm1', observacoes: 'obs ç', meioPagamentoId: 'mp-cartao', dataCompra: '2026-09-30', aConfirmar: ['valorTotal'] }),
    // Avulsa salva sem vencimento sempre fica com "vencimento" a confirmar.
    'avulsa sem vencimento': avulsa({ descricao: desc, valor: 120000, vencimento: undefined, mes: '2026-12', aConfirmar: ['vencimento'] }),
    'parcelada com valorParcela': parcelada({ descricao: desc, valorTotal: 120000, valorParcela: 40500, marcaId: 'm1' }),
    'parcelada sem valorParcela': parcelada({ descricao: desc, valorTotal: 120000, comecaNaParcela: 2 }),
    'recorrente anual com fim': recorrente({ descricao: desc, frequencia: 'anual', inicio: '2026-03-15', fim: '2029-03-15' }),
    recorrente: recorrente({ descricao: desc, valor: 120000, fim: '2027-10-08', valorVariavel: true, pausas: [{ de: '2026-12-01' }] }),
  };
  for (const [nome, d] of Object.entries(casos)) {
    it(nome, () => {
      const pausas = d.tipo === 'recorrente' ? d.pausas : undefined;
      const volta = montarDespesa(valoresDeDespesa(d, marcas, '2026-10'), { id: d.id, marcaId: d.marcaId, pausas });
      expect(semCarimbo({ ...volta })).toEqual(semCarimbo({ ...d }));
    });
  }
});
