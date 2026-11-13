/**
 * Cenários de dados SINTÉTICOS da matriz de layout (o repositório é público: nada real aqui).
 * Cada cenário vira um arquivo de backup importado pela própria tela de boas-vindas, então a matriz
 * exercita o mesmo caminho que o usuário usa. Datas fixas + relógio congelado = prints estáveis.
 */
import { montarBackupInicial, type DefinicaoInicial, type SemDatas } from '../../src/dados/dadosIniciais';
import type { ArquivoBackup } from '../../src/dados/db';
import type { Despesa } from '../../src/dominio/tipos';

/** "Hoje" de todos os testes de layout. O relógio do navegador é congelado neste instante. */
export const HOJE = '2026-11-10';
export const AGORA = '2026-11-10T12:00:00-03:00';

const base = { observacoes: '', aConfirmar: [] };

const tipico: DefinicaoInicial = {
  meios: [
    { id: 'mp-nubank', nome: 'Nubank', tipo: 'credito', diaFechamento: 2, diaVencimento: 9, bancoSlug: 'nubank' },
    { id: 'mp-pix', nome: 'Pix', tipo: 'pix' },
  ],
  marcas: [{ id: 'm-netflix', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' }],
  despesas: [
    { ...base, id: 'd-netflix', tipo: 'recorrente', descricao: 'Netflix', categoriaId: 'cat-assinaturas', marcaId: 'm-netflix', meioPagamentoId: 'mp-nubank', valor: 4490, valorVariavel: false, frequencia: 'mensal', inicio: '2026-08-15', pausas: [] },
    { ...base, id: 'd-aluguel', tipo: 'recorrente', descricao: 'Aluguel', categoriaId: 'cat-moradia', meioPagamentoId: 'mp-pix', valor: 150000, valorVariavel: false, frequencia: 'mensal', inicio: '2026-08-05', pausas: [] },
    { ...base, id: 'd-mercado', tipo: 'avulsa', descricao: 'Mercado do mês', categoriaId: 'cat-alimentacao', meioPagamentoId: 'mp-pix', valor: 48730, vencimento: '2026-11-03', mes: '2026-11' },
    { ...base, id: 'd-celular', tipo: 'parcelada', descricao: 'Celular', categoriaId: 'cat-compras', meioPagamentoId: 'mp-nubank', valorTotal: 429900, numParcelas: 12, primeiroVencimento: '2026-11-09', mesPrimeira: '2026-11', comecaNaParcela: 11 },
    { ...base, id: 'd-farmacia', tipo: 'avulsa', descricao: 'Farmácia', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix', valor: 8990, vencimento: '2026-11-06', mes: '2026-11' },
  ] satisfies SemDatas<Despesa>[],
  pagamentos: [
    { lancamentoId: 'd-aluguel@2026-08', pagoEm: '2026-08-05' },
    { lancamentoId: 'd-aluguel@2026-09', pagoEm: '2026-09-05' },
    { lancamentoId: 'd-aluguel@2026-10', pagoEm: '2026-10-05' },
    { lancamentoId: 'd-aluguel@2026-11', pagoEm: '2026-11-05' },
    { lancamentoId: 'd-mercado#1', pagoEm: '2026-11-03' },
  ],
};

const LONGA = 'Assinatura anual do aplicativo de edição de fotos ⟦premium⟧ com acentuação';

const carregado: DefinicaoInicial = {
  meios: [
    { id: 'mp-mp', nome: 'Cartão Mercado Pago', tipo: 'credito', diaFechamento: 2, diaVencimento: 7, bancoSlug: 'mercadopago' },
    { id: 'mp-nubank', nome: 'Nubank', tipo: 'credito', diaFechamento: 1, diaVencimento: 9, bancoSlug: 'nubank' },
    { id: 'mp-inter', nome: 'Inter', tipo: 'credito', diaFechamento: 20, diaVencimento: 28, bancoSlug: 'inter' },
    { id: 'mp-pix', nome: 'Pix', tipo: 'pix' },
    { id: 'mp-boleto', nome: 'Boleto', tipo: 'boleto' },
  ],
  marcas: [
    { id: 'm-netflix', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' },
    { id: 'm-spotify', nome: 'Spotify', apelidos: [], logoSlug: 'spotify' },
  ],
  despesas: [
    { ...base, id: 'd-longa', tipo: 'recorrente', descricao: LONGA, categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-mp', valor: 123456789, valorVariavel: false, frequencia: 'mensal', inicio: '2026-09-01', pausas: [] },
    { ...base, id: 'd-netflix', tipo: 'recorrente', descricao: 'Netflix', categoriaId: 'cat-assinaturas', marcaId: 'm-netflix', meioPagamentoId: 'mp-nubank', valor: 4490, valorVariavel: false, frequencia: 'mensal', inicio: '2026-07-15', pausas: [] },
    { ...base, id: 'd-spotify', tipo: 'recorrente', descricao: 'Spotify família', categoriaId: 'cat-assinaturas', marcaId: 'm-spotify', meioPagamentoId: 'mp-inter', valor: 3490, valorVariavel: false, frequencia: 'mensal', inicio: '2026-07-20', pausas: [{ de: '2026-10-25' }] },
    { ...base, id: 'd-luz', tipo: 'recorrente', descricao: 'Conta de luz', categoriaId: 'cat-moradia', meioPagamentoId: 'mp-boleto', valor: 21345, valorVariavel: true, frequencia: 'mensal', inicio: '2026-07-12', pausas: [] },
    { ...base, id: 'd-academia', tipo: 'recorrente', descricao: 'Academia', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix', valor: 11990, valorVariavel: false, frequencia: 'mensal', inicio: '2026-06-03', fim: '2026-10-03', pausas: [] },
    { ...base, id: 'd-geladeira', tipo: 'parcelada', descricao: 'Geladeira frost free inox 480 litros', categoriaId: 'cat-compras', meioPagamentoId: 'mp-mp', valorTotal: 589900, numParcelas: 10, primeiroVencimento: '2026-09-07', mesPrimeira: '2026-09', comecaNaParcela: 1 },
    { ...base, id: 'd-quitada', tipo: 'parcelada', descricao: 'Tênis de corrida', categoriaId: 'cat-compras', meioPagamentoId: 'mp-nubank', valorTotal: 59980, numParcelas: 2, primeiroVencimento: '2026-10-09', mesPrimeira: '2026-10', comecaNaParcela: 1 },
    { ...base, id: 'd-atrasada', tipo: 'avulsa', descricao: 'IPVA 2026 ⟦cota única⟧', categoriaId: 'cat-transporte', meioPagamentoId: 'mp-boleto', valor: 187654, vencimento: '2026-11-04', mes: '2026-11' },
    { ...base, id: 'd-confirmar', tipo: 'avulsa', descricao: 'Conserto do carro', categoriaId: 'cat-transporte', valor: 95000, mes: '2026-11', aConfirmar: ['vencimento', 'loja'] },
    { ...base, id: 'd-paga', tipo: 'avulsa', descricao: 'Restaurante aniversário', categoriaId: 'cat-lazer', meioPagamentoId: 'mp-inter', valor: 34560, vencimento: '2026-10-28', mes: '2026-10', dataCompra: '2026-10-10' },
    { ...base, id: 'd-outubro', tipo: 'avulsa', descricao: 'Material escolar', categoriaId: 'cat-outros', meioPagamentoId: 'mp-pix', valor: 21000, vencimento: '2026-10-15', mes: '2026-10' },
  ] satisfies SemDatas<Despesa>[],
  pagamentos: [
    { lancamentoId: 'd-longa@2026-09', pagoEm: '2026-10-07' },
    { lancamentoId: 'd-longa@2026-10', pagoEm: '2026-11-07' },
    { lancamentoId: 'd-netflix@2026-10', pagoEm: '2026-11-09' },
    { lancamentoId: 'd-luz@2026-07', pagoEm: '2026-07-12' },
    { lancamentoId: 'd-luz@2026-08', pagoEm: '2026-08-12', valorPago: 19870 },
    { lancamentoId: 'd-luz@2026-09', pagoEm: '2026-09-12', valorPago: 25010 },
    { lancamentoId: 'd-luz@2026-10', pagoEm: '2026-10-12', valorPago: 22220 },
    { lancamentoId: 'd-geladeira#1', pagoEm: '2026-09-07' },
    { lancamentoId: 'd-geladeira#2', pagoEm: '2026-10-07' },
    { lancamentoId: 'd-quitada#1', pagoEm: '2026-10-09' },
    { lancamentoId: 'd-quitada#2', pagoEm: '2026-11-09' },
    { lancamentoId: 'd-paga#1', pagoEm: '2026-10-28' },
    { lancamentoId: 'd-outubro#1', pagoEm: '2026-10-15' },
  ],
};

/** Registros de cada cenário que as telas de detalhe, edição e filtro abrem. */
export const IDS: Record<string, { parcelada: string; recorrente: string; avulsa: string; cartao: string }> = {
  tipico: { parcelada: 'd-celular', recorrente: 'd-netflix', avulsa: 'd-farmacia', cartao: 'mp-nubank' },
  carregado: { parcelada: 'd-geladeira', recorrente: 'd-longa', avulsa: 'd-atrasada', cartao: 'mp-mp' },
};

/** null = começar do zero (sem dados). */
export const CENARIOS: Record<string, DefinicaoInicial | null> = { vazio: null, tipico, carregado };

export function backupDoCenario(nome: string): ArquivoBackup | null {
  const def = CENARIOS[nome];
  if (def === undefined) throw new Error(`Cenário desconhecido: ${nome}`);
  return def === null ? null : montarBackupInicial(def, HOJE, AGORA);
}
