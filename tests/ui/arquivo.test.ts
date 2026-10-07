import { afterEach, describe, expect, it, vi } from 'vitest';
import { compartilharOuBaixar, lerArquivoTexto } from '../../src/ui/arquivo';

const nav = navigator as unknown as { canShare?: unknown; share?: unknown };

const criarOriginal = URL.createObjectURL;
const revogarOriginal = URL.revokeObjectURL;

afterEach(() => {
  URL.createObjectURL = criarOriginal;
  URL.revokeObjectURL = revogarOriginal;
  delete nav.canShare;
  delete nav.share;
  vi.restoreAllMocks();
});

describe('compartilharOuBaixar', () => {
  it('sem folha de compartilhar, baixa com o nome certo', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    let nome = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nome = this.download;
    });
    expect(await compartilharOuBaixar('a.csv', 'x', 'text/csv')).toBe('baixado');
    expect(nome).toBe('a.csv');
  });

  it('usa a folha de compartilhar quando o aparelho aceita arquivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(nav, { canShare: () => true, share });
    expect(await compartilharOuBaixar('b.json', '{}', 'application/json')).toBe('compartilhado');
    expect(share).toHaveBeenCalledOnce();
  });

  it('cancelar o compartilhamento não baixa nada', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    Object.assign(nav, { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError')) });
    expect(await compartilharOuBaixar('b.json', '{}', 'application/json')).toBe('cancelado');
    expect(clique).not.toHaveBeenCalled();
  });
});

describe('lerArquivoTexto', () => {
  it('lê UTF-8 com acentos', async () => {
    const f = new File(['Açaí ⟦⟧'], 'x.json', { type: 'application/json' });
    expect(await lerArquivoTexto(f)).toBe('Açaí ⟦⟧');
  });
});
