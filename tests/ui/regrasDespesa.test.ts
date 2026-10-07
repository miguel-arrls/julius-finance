import { describe, expect, it } from 'vitest';
import {
  atualizarAConfirmar,
  montarDespesa,
  mudouCobranca,
  previa,
  resolverMarca,
  sugerirVencimento,
  validar,
  valoresIniciais,
  type ValoresForm,
} from '../../src/ui/telas/regrasDespesa';
import { CARTAO, PIX, recorrente } from '../fabricas';

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
  it('sugerirVencimento só para cartão com dias', () => {
    expect(sugerirVencimento('2026-10-02', CARTAO)).toBe('2026-11-07');
    expect(sugerirVencimento('2026-10-02', PIX)).toBeUndefined();
    expect(sugerirVencimento('', CARTAO)).toBeUndefined();
  });

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
