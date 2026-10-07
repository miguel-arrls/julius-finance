import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { iniciais, Logo } from '../../src/ui/componentes/Logo';
import { buscarNoCatalogo } from '../../src/marcas/identificar';

describe('Logo', () => {
  it('usa a imagem enviada pelo usuário primeiro', () => {
    const { container } = render(
      <Logo rotulo="x" marca={{ id: 'm', nome: 'M', apelidos: [], logoImagem: 'data:image/png;base64,AAA', logoSlug: 'spotify' }} />,
    );
    expect(container.querySelector('img')!.getAttribute('src')).toBe('data:image/png;base64,AAA');
  });

  it('depois o logo do catálogo, com a cor da marca', () => {
    const { container } = render(<Logo rotulo="x" marca={{ id: 'm', nome: 'M', apelidos: [], logoSlug: 'spotify' }} />);
    const path = container.querySelector('path')!;
    const item = buscarNoCatalogo('spotify')!;
    expect(path.getAttribute('d')).toBe(item.path);
    expect(path.getAttribute('fill')).toBe(`#${item.hex}`);
  });

  it('sem logo, usa o ícone da categoria', () => {
    const { container } = render(<Logo rotulo="x" categoria={{ id: 'c', nome: 'Saúde', cor: '#047857', icone: 'heartbeat', ordem: 1 }} />);
    expect(container.querySelector('.logo-icone svg')).not.toBeNull();
  });

  it('sem nada, mostra iniciais', () => {
    const { container } = render(<Logo rotulo="Despesa teste" />);
    expect(container.textContent).toBe('DT');
  });

  it('iniciais', () => {
    expect(iniciais('academia smart fit')).toBe('AS');
    expect(iniciais('Luz')).toBe('L');
    expect(iniciais('   ')).toBe('?');
  });
});
