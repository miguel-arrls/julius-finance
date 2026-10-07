import type { ItemLista } from './resumo';
import type { MesISO, Situacao, TipoDespesa } from './tipos';

export interface Filtros {
  texto?: string;
  mes?: MesISO;
  categoriaId?: string;
  situacao?: Situacao;
  tipo?: TipoDespesa;
  meioPagamentoId?: string;
}

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function ordenarItens(a: ItemLista, b: ItemLista): number {
  return (
    a.lancamento.mes.localeCompare(b.lancamento.mes) ||
    (a.lancamento.vencimento ?? '9999').localeCompare(b.lancamento.vencimento ?? '9999') ||
    a.despesa.descricao.localeCompare(b.despesa.descricao, 'pt-BR') ||
    (a.lancamento.numero ?? 0) - (b.lancamento.numero ?? 0)
  );
}

export function filtrar(itens: ItemLista[], f: Filtros): ItemLista[] {
  const termo = normalizar(f.texto ?? '');
  return itens
    .filter((i) => {
      if (f.mes && i.lancamento.mes !== f.mes) return false;
      if (f.categoriaId && i.despesa.categoriaId !== f.categoriaId) return false;
      if (f.situacao && i.situacao !== f.situacao) return false;
      if (f.tipo && i.despesa.tipo !== f.tipo) return false;
      if (f.meioPagamentoId && i.despesa.meioPagamentoId !== f.meioPagamentoId) return false;
      if (termo) {
        const alvos = [i.despesa.descricao, i.marca?.nome ?? '', ...(i.marca?.apelidos ?? [])];
        if (!alvos.some((a) => normalizar(a).includes(termo))) return false;
      }
      return true;
    })
    .sort(ordenarItens);
}
