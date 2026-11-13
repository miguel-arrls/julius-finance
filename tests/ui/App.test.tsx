import { render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import { inicializarPadrao } from '../../src/dados/repositorio';
import { App, LimiteDeErro } from '../../src/ui/App';
import { ErroLeitura } from '../../src/ui/consulta';
import { HOJE, novaBase } from './auxiliar';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  location.hash = '';
});

describe('App', () => {
  it('explica o problema quando o armazenamento não abre', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = { open: () => Promise.reject(new Error('bloqueado')) } as unknown as JuliusDB;
    render(<App base={base} hoje={HOJE} />);
    expect(await screen.findByRole('heading', { name: 'Não foi possível abrir seus dados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('explica o problema quando a leitura dos dados falha depois de abrir', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = await novaBase();
    vi.spyOn(base.despesas, 'toArray').mockRejectedValue(new Error('x'));
    render(<App base={base} hoje={HOJE} />);
    expect(await screen.findByRole('heading', { name: 'Não foi possível abrir seus dados' })).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).toBeNull();
  });

  it('sem crypto.randomUUID (http na rede local), a nova despesa abre normalmente', async () => {
    const base = await novaBase();
    await inicializarPadrao(base);
    // Como o Safari por http://192.168.x.x: getRandomValues existe, randomUUID não.
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    location.hash = '#/nova';
    render(<App base={base} hoje={HOJE} />);
    expect(await screen.findByRole('heading', { name: 'Nova despesa' })).toBeInTheDocument();
  });

  it('erro ao desenhar uma tela não é confundido com armazenamento bloqueado', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const Explode = () => {
      throw new TypeError('falha de programação');
    };
    render(
      <LimiteDeErro>
        <Explode />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado nesta tela' })).toBeInTheDocument();
    expect(screen.queryByText(/janelas privadas/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Voltar ao início' })).toBeInTheDocument();
  });

  it('falha de leitura dos dados continua com a mensagem de armazenamento', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const FalhaLeitura = () => {
      throw new ErroLeitura(new Error('IDB'));
    };
    render(
      <LimiteDeErro>
        <FalhaLeitura />
      </LimiteDeErro>,
    );
    expect(screen.getByRole('heading', { name: 'Não foi possível abrir seus dados' })).toBeInTheDocument();
  });

  it('abre e mostra a navegação principal', async () => {
    render(<App base={await novaBase()} hoje={HOJE} />);
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    for (const nome of ['Início', 'Lançamentos', 'Nova despesa', 'Despesas', 'Ajustes']) {
      expect(within(nav).getByRole('link', { name: nome })).toBeInTheDocument();
    }
  });

  it('marca o grupo da rota atual com aria-current', async () => {
    location.hash = '#/despesas/x';
    render(<App base={await novaBase()} hoje={HOJE} />);
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Despesas' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });
});
