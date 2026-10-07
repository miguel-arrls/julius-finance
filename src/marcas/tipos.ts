export interface MarcaCatalogo {
  slug: string;
  nome: string;
  /** Cor da marca sem '#'. */
  hex: string;
  /** Caminho SVG em viewBox 0 0 24 24. */
  path: string;
}
