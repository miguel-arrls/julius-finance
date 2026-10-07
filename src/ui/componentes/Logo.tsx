import type { Categoria, Marca } from '../../dominio/tipos';
import { buscarNoCatalogo } from '../../marcas/identificar';
import { Icone } from '../icones';

const COR_PADRAO = '#57534E';

export function iniciais(texto: string): string {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Identificação visual: imagem enviada → logo do catálogo → ícone da marca/categoria → iniciais.
 * Decorativo (o nome aparece ao lado), por isso aria-hidden.
 */
export function Logo({
  marca,
  categoria,
  rotulo,
  tamanho = 40,
}: {
  marca?: Marca;
  categoria?: Categoria;
  rotulo: string;
  tamanho?: number;
}) {
  const estilo = { width: `${tamanho}px`, height: `${tamanho}px` };
  if (marca?.logoImagem) {
    return <img class="logo logo-imagem" src={marca.logoImagem} alt="" style={estilo} />;
  }
  const item = marca?.logoSlug ? buscarNoCatalogo(marca.logoSlug) : undefined;
  if (item) {
    const lado = Math.round(tamanho * 0.6);
    return (
      <span class="logo logo-catalogo" style={estilo} aria-hidden="true">
        <svg viewBox="0 0 24 24" width={lado} height={lado}>
          <path d={item.path} fill={`#${item.hex}`} />
        </svg>
      </span>
    );
  }
  const cor = marca?.cor ?? categoria?.cor ?? COR_PADRAO;
  const fundo = { ...estilo, color: cor, backgroundColor: `${cor}1f` };
  const icone = marca?.icone ?? categoria?.icone;
  if (icone) {
    return (
      <span class="logo logo-icone" style={fundo} aria-hidden="true">
        <Icone nome={icone} tamanho={Math.round(tamanho * 0.55)} />
      </span>
    );
  }
  return (
    <span class="logo logo-iniciais" style={fundo} aria-hidden="true">
      {iniciais(rotulo)}
    </span>
  );
}
