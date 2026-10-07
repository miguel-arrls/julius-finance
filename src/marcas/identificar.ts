import { normalizar } from '../dominio/filtros';
import type { Marca } from '../dominio/tipos';
import { CATALOGO } from './catalogo.gerado';
import type { MarcaCatalogo } from './tipos';

const POR_SLUG = new Map(CATALOGO.map((i) => [i.slug, i]));

export type Identificacao = { tipo: 'marca'; marca: Marca } | { tipo: 'catalogo'; item: MarcaCatalogo } | null;

function palavras(texto: string): string {
  return normalizar(texto).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function buscarNoCatalogo(slug: string): MarcaCatalogo | undefined {
  return POR_SLUG.get(slug);
}

/** O texto contém o termo como palavra(s) inteira(s), ignorando acento e caixa. */
export function contemTermo(texto: string, termo: string): boolean {
  const t = palavras(termo);
  return t !== '' && ` ${palavras(texto)} `.includes(` ${t} `);
}

export function identificarMarca(texto: string, marcas: Marca[], catalogo: MarcaCatalogo[] = CATALOGO): Identificacao {
  let melhorMarca: { tamanho: number; marca: Marca } | null = null;
  for (const marca of marcas) {
    for (const termo of [marca.nome, ...marca.apelidos]) {
      if (!contemTermo(texto, termo)) continue;
      const tamanho = palavras(termo).length;
      if (!melhorMarca || tamanho > melhorMarca.tamanho) melhorMarca = { tamanho, marca };
    }
  }
  if (melhorMarca) return { tipo: 'marca', marca: melhorMarca.marca };

  let melhorItem: { tamanho: number; item: MarcaCatalogo } | null = null;
  for (const item of catalogo) {
    if (!contemTermo(texto, item.nome)) continue;
    const tamanho = palavras(item.nome).length;
    if (!melhorItem || tamanho > melhorItem.tamanho) melhorItem = { tamanho, item };
  }
  return melhorItem ? { tipo: 'catalogo', item: melhorItem.item } : null;
}

export function buscarCatalogoPorNome(termo: string, limite = 12): MarcaCatalogo[] {
  const t = palavras(termo);
  if (!t) return [];
  const semEspaco = t.replace(/ /g, '');
  return CATALOGO.filter((i) => palavras(i.nome).includes(t) || i.slug.includes(semEspaco)).slice(0, limite);
}
