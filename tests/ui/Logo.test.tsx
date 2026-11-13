import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { corDoMeio, iniciais, Logo, LogoMeio } from '../../src/ui/componentes/Logo';
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

describe('LogoMeio', () => {
  it('banco com logo no catálogo: logo em branco na cor do banco', () => {
    const { container } = render(<LogoMeio meio={{ nome: 'Roxinho', bancoSlug: 'nubank' }} />);
    expect(container.querySelector('path')!.getAttribute('fill')).toBe('#ffffff');
    expect((container.firstChild as HTMLElement).style.backgroundColor).toBe('rgb(130, 10, 209)');
  });

  it('banco sem logo: iniciais do banco; a cor escolhida vence a do banco', () => {
    const { container } = render(<LogoMeio meio={{ nome: 'Meu cartão', bancoSlug: 'bancodobrasil', cor: '#0F766E' }} />);
    expect(container.textContent).toBe('BD');
    expect((container.firstChild as HTMLElement).style.backgroundColor).toBe('rgb(15, 118, 110)');
  });

  it('sem banco: iniciais do nome e cor neutra', () => {
    expect(corDoMeio({ nome: 'Pix' })).toBe('#57534E');
    const { container } = render(<LogoMeio meio={{ nome: 'Vale refeição' }} />);
    expect(container.textContent).toBe('VR');
  });
});
