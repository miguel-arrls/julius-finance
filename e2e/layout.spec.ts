/**
 * Matriz de layout: cenários × larguras × temas × telas. Cada combinação passa pelas regras de
 * e2e/layout/invariantes.ts (+ axe-core nas larguras de matriz.json) e, fora do CI, é comparada ao
 * print aprovado em C:\VBCODE\julius-finance-prints\referencia.
 * Tela nova = uma linha em e2e/layout/matriz.json + o caminho até ela em TELAS abaixo.
 * Regra nova = uma função em invariantes.ts + a sabotagem que prova que ela acusa (layout-sabotagem.spec.ts).
 */
import { expect, test, type Page } from '@playwright/test';
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { abrirPagina, comecarDoZero, estabilizar, ir, prepararCenario } from './layout/apoio';
import { IDS } from './layout/cenarios';
import { coletarErros, verificarAcessibilidade, verificarLayout, type Violacao } from './layout/invariantes';
import { PASTA_PRINTS } from './layout/pastas';

interface Matriz {
  larguras: number[];
  temas: ('claro' | 'escuro')[];
  cenarios: string[];
  axeLarguras: number[];
  telas: { nome: string; soVazio?: boolean; precisaDados?: boolean }[];
}
const MATRIZ: Matriz = JSON.parse(readFileSync(new URL('./layout/matriz.json', import.meta.url), { encoding: 'utf-8' }));
const COMPARAR_PRINTS = !process.env.CI;

type Ids = (typeof IDS)[string];
/** Como chegar a cada tela da matriz.json. */
const TELAS: Record<string, (page: Page, ids: Ids | undefined) => Promise<void>> = {
  'boas-vindas': async () => {},
  inicio: (p) => ir(p, '#/inicio'),
  lancamentos: (p) => ir(p, '#/lancamentos'),
  'lancamentos-por-cartao': (p, ids) => ir(p, `#/lancamentos?meio=${ids!.cartao}`),
  'despesas-recorrentes': (p) => ir(p, '#/despesas'),
  'despesas-parceladas': async (p) => {
    await ir(p, '#/despesas');
    await p.getByRole('tab', { name: 'Parceladas' }).click();
  },
  'despesas-avulsas': async (p) => {
    await ir(p, '#/despesas');
    await p.getByRole('tab', { name: 'Avulsas' }).click();
  },
  'despesa-parcelada': (p, ids) => ir(p, `#/despesas/${ids!.parcelada}`),
  'despesa-recorrente': (p, ids) => ir(p, `#/despesas/${ids!.recorrente}`),
  'editar-avulsa': (p, ids) => ir(p, `#/editar/${ids!.avulsa}`),
  'nova-avulsa': (p) => ir(p, '#/nova'),
  'nova-avulsa-no-cartao': async (p) => {
    await ir(p, '#/nova');
    await p.locator('.opcao-meio-cor').first().click();
  },
  'nova-parcelada': async (p) => {
    await ir(p, '#/nova');
    await p.getByRole('radio', { name: 'Parcelada' }).click();
  },
  'nova-recorrente': async (p) => {
    await ir(p, '#/nova');
    await p.getByRole('radio', { name: 'Recorrente' }).click();
  },
  'folha-novo-cartao': async (p) => {
    await ir(p, '#/nova');
    await p.getByRole('button', { name: 'Novo cartão' }).click();
    await p.getByRole('dialog', { name: 'Novo cartão' }).waitFor();
  },
  analise: (p) => ir(p, '#/analise'),
  ajustes: (p) => ir(p, '#/ajustes'),
  categorias: (p) => ir(p, '#/categorias'),
  marcas: (p) => ir(p, '#/marcas'),
  meios: (p) => ir(p, '#/meios'),
  backup: (p) => ir(p, '#/backup'),
  dados: (p) => ir(p, '#/dados'),
};

test.describe.configure({ mode: 'parallel' });

test('toda tela da matriz.json tem caminho em TELAS (e vice-versa)', () => {
  expect(MATRIZ.telas.map((t) => t.nome).sort()).toEqual(Object.keys(TELAS).sort());
});

for (const cenario of MATRIZ.cenarios) {
  for (const largura of MATRIZ.larguras) {
    for (const tema of MATRIZ.temas) {
      test(`layout ${cenario} ${largura} ${tema}`, async ({ browser }, info) => {
        test.setTimeout(300_000);
        const { contexto, page } = await abrirPagina(browser, info, largura, tema);
        const erros = coletarErros(page);
        await prepararCenario(page, cenario);

        const violacoes: (Violacao & { tela: string })[] = [];
        const telas = MATRIZ.telas.filter((t) => (cenario === 'vazio' ? !t.precisaDados : !t.soVazio));
        for (const tela of telas) {
          if (cenario === 'vazio' && tela.nome !== 'boas-vindas' && (await page.getByRole('heading', { name: 'Boas-vindas ao Julius' }).count()) > 0) {
            await comecarDoZero(page);
          }
          await TELAS[tela.nome]!(page, IDS[cenario]);
          await estabilizar(page);

          const achados = [...(await verificarLayout(page)), ...erros()];
          if (MATRIZ.axeLarguras.includes(largura)) achados.push(...(await verificarAcessibilidade(page)));
          violacoes.push(...achados.map((a) => ({ ...a, tela: tela.nome })));

          if (COMPARAR_PRINTS) {
            await expect.soft(page, `print de ${tela.nome}`).toHaveScreenshot([cenario, `${largura}-${tema}`, `${tela.nome}.png`], {
              fullPage: true,
              animations: 'disabled',
              caret: 'hide',
            });
          }
        }
        await contexto.close();

        const relatorio = violacoes.map((v) => `• [${v.tela}] ${v.regra}: ${v.elemento} (${v.detalhe})`).join('\n');
        expect(violacoes, `Regras violadas em ${cenario}/${largura}/${tema}:\n${relatorio}`).toEqual([]);
      });
    }
  }
}

// Guarda esperado/atual/diferença de cada print que mudou, fora do repositório (test-results é apagado a
// cada execução). Reprovação só por regra não gera print novo e não entra aqui.
test.afterEach(async ({}, info) => {
  if (!COMPARAR_PRINTS) return;
  const mudaram = info.attachments.filter((a) => a.path?.endsWith('-diff.png')).map((a) => a.path!.replace(/-diff\.png$/, ''));
  if (mudaram.length === 0) return;
  const destino = join(PASTA_PRINTS, 'falhas', process.env.JULIUS_EXECUCAO ?? 'sem-execucao');
  for (const a of info.attachments) {
    if (!a.path || !existsSync(a.path) || !mudaram.some((m) => a.path!.startsWith(m))) continue;
    cpSync(a.path, join(destino, relative(info.outputDir, a.path)));
  }
});
