import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { novoId } from '../../src/dados/ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('novoId', () => {
  it('gera UUID v4 com crypto.randomUUID disponível', () => {
    expect(novoId()).toMatch(UUID_V4);
  });

  it('fora de contexto seguro (http na rede local, sem randomUUID) gera UUID v4 únicos', () => {
    // No Safari, por http://192.168.x.x, crypto.randomUUID não existe; getRandomValues sim.
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    expect(crypto.randomUUID).toBeUndefined();
    const ids = Array.from({ length: 1000 }, () => novoId());
    for (const id of ids) expect(id).toMatch(UUID_V4);
    expect(new Set(ids).size).toBe(1000);
  });

  it('nenhum arquivo do app chama crypto.randomUUID direto', () => {
    const raiz = join(__dirname, '../../src');
    const arquivos = readdirSync(raiz, { recursive: true, encoding: 'utf-8' }).filter((f) => /\.(ts|tsx)$/.test(f));
    const diretos = arquivos.filter(
      (f) => !f.replaceAll('\\', '/').endsWith('dados/ids.ts') && readFileSync(join(raiz, f), { encoding: 'utf-8' }).includes('crypto.randomUUID'),
    );
    expect(diretos).toEqual([]);
  });
});
