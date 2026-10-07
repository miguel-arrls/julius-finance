import { describe, expect, it } from 'vitest';
import { buscarCatalogoPorNome, buscarNoCatalogo, contemTermo, identificarMarca } from '../../src/marcas/identificar';

const slug = (texto: string) => {
  const r = identificarMarca(texto, []);
  return r?.tipo === 'catalogo' ? r.item.slug : r;
};

describe('contemTermo', () => {
  it('compara palavras inteiras, sem acento e sem caixa', () => {
    expect(contemTermo('Academia Força Total', 'forca total')).toBe(true);
    expect(contemTermo('Maxi Mercado', 'Max')).toBe(false);
    expect(contemTermo('Pão de Açúcar', 'acucar')).toBe(true);
    expect(contemTermo('qualquer', '')).toBe(false);
  });
});

describe('identificarMarca', () => {
  it('acha no catálogo pelo nome dentro da descrição', () => {
    expect(slug('Google Fotos extra')).toBe('google');
    expect(slug('Spotify Premium')).toBe('spotify');
    expect(slug('NETFLIX padrão')).toBe('netflix');
  });

  it('termo mais longo vence', () => {
    expect(slug('Google Drive extra')).toBe('googledrive');
  });

  it('não confunde pedaço de palavra e devolve null quando não acha', () => {
    expect(slug('Maxi Mercado')).toBeNull();
    expect(slug('Açaí da esquina')).toBeNull();
  });

  it('marca do usuário (nome ou apelido) vence o catálogo', () => {
    const marcas = [{ id: 'ft', nome: 'Força Total', apelidos: [] }, { id: 'm', nome: 'Música da família', apelidos: ['spotify'] }];
    expect(identificarMarca('Academia Força Total', marcas)).toEqual({ tipo: 'marca', marca: marcas[0] });
    expect(identificarMarca('Spotify', marcas)).toEqual({ tipo: 'marca', marca: marcas[1] });
  });
});

describe('catálogo', () => {
  it('busca por slug e por nome', () => {
    expect(buscarNoCatalogo('spotify')?.nome).toBe('Spotify');
    expect(buscarNoCatalogo('nao-existe')).toBeUndefined();
    expect(buscarCatalogoPorNome('goo').map((i) => i.slug)).toContain('google');
    expect(buscarCatalogoPorNome('  ')).toEqual([]);
  });
});
