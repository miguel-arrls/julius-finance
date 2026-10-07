import { describe, expect, it } from 'vitest';
import { gerarCsv } from '../../src/dados/csv';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import { detalhar } from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, parcelada, PIX, recorrente } from '../fabricas';

describe('gerarCsv', () => {
  it('gera o texto exato: BOM, ";", vírgula decimal, aspas escapadas e CRLF', () => {
    const itens = detalhar(
      [
        lanc({ id: 'a#1', despesaId: 'a', mes: '2026-10', vencimento: '2026-10-05', valor: 123456 }),
        lanc({ id: 'p#11', despesaId: 'p', numero: 11, mes: '2026-10', valor: 45000 }),
        lanc({ id: 'r@2026-10', despesaId: 'r', mes: '2026-10', vencimento: '2026-10-08', valor: 3990, pagoEm: '2026-10-08', valorPago: 4000 }),
      ],
      {
        despesas: [
          avulsa({ id: 'a', descricao: 'Consulta; retorno', marcaId: 'm', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix', observacoes: 'linha1\nlinha2' }),
          parcelada({ id: 'p', descricao: 'Celular', categoriaId: 'cat-compras', numParcelas: 12 }),
          recorrente({ id: 'r', descricao: 'Streaming', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
        ],
        categorias: CATEGORIAS_PADRAO,
        marcas: [{ id: 'm', nome: 'Clínica "Boa"', apelidos: [] }],
        meios: [CARTAO, PIX],
      },
      '2026-10-06',
    );

    expect(gerarCsv(itens)).toBe(
      '﻿' +
        'Descrição;Loja/marca;Categoria;Tipo;Parcela;Mês;Vencimento;Valor;Situação;Pago em;Meio de pagamento;Observações\r\n' +
        '"Consulta; retorno";"Clínica ""Boa""";Saúde;Avulsa;;10/2026;05/10/2026;1234,56;Atrasada;;Pix;"linha1\nlinha2"\r\n' +
        'Celular;;Compras;Parcelada;11/12;10/2026;;450,00;Sem vencimento;;;\r\n' +
        'Streaming;;Assinaturas;Recorrente;;10/2026;08/10/2026;40,00;Paga;08/10/2026;Cartão Teste;\r\n',
    );
  });
});
