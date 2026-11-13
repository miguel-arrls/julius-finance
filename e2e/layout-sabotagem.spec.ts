/**
 * Teste do teste: cada regra de e2e/layout/invariantes.ts precisa acusar um bug conhecido.
 * O bug é reintroduzido por CSS/JS numa tela que estava limpa; a regra tem de passar de 0 para ≥1 violação.
 * Se uma regra ficar cega (mudança no verificador ou no app), este arquivo falha.
 */
import { expect, test } from '@playwright/test';
import { abrirPagina, estabilizar, ir, prepararCenario } from './layout/apoio';
import { coletarErros, REGRAS, verificarAcessibilidade, verificarLayout } from './layout/invariantes';

interface Sabotagem {
  regra: string;
  bug: string;
  cenario: string;
  largura: number;
  rota: string;
  acao?: (p: import('@playwright/test').Page) => Promise<void>;
  css?: string;
  js?: string;
}

const SABOTAGENS: Sabotagem[] = [
  {
    regra: REGRAS.sobreposicao,
    bug: 'seletor de meio encolhido sobrepõe o "Novo cartão" (bug de 06/11/2026)',
    cenario: 'carregado',
    largura: 390,
    rota: '#/nova',
    css: '.seletor-meio-opcoes { flex: 0 1 auto !important; }',
  },
  {
    regra: REGRAS.preencher,
    bug: 'cartão único com largura fixa deixa sobra à direita (bug de 07/11/2026)',
    cenario: 'tipico',
    largura: 390,
    rota: '#/inicio',
    css: '.cartao-banco:only-child { width: min(300px, 82vw) !important; max-width: none !important; margin-inline: 0 !important; }',
  },
  {
    regra: REGRAS.rolagem,
    bug: 'coluna 1fr cresce com o conteúdo no tablet (bug de 07/11/2026)',
    cenario: 'carregado',
    largura: 768,
    rota: '#/inicio',
    css: '.casca { grid-template-columns: 232px 1fr !important; } .conteudo { width: auto !important; } .grade-inicio { display: grid !important; grid-template-columns: 1fr 1fr !important; }',
  },
  {
    regra: REGRAS.caixa,
    bug: 'título longo sem quebra vaza da lista',
    cenario: 'carregado',
    largura: 390,
    rota: '#/despesas',
    css: '.linha-titulo { white-space: nowrap !important; overflow: visible !important; text-overflow: clip !important; }',
  },
  {
    regra: REGRAS.alvo,
    bug: 'engrenagem de Ajustes com 24 px',
    cenario: 'tipico',
    largura: 390,
    rota: '#/inicio',
    css: '.engrenagem { width: 24px !important; height: 24px !important; min-width: 0 !important; min-height: 0 !important; }',
  },
  {
    regra: REGRAS.rotulo,
    bug: 'rótulo da descrição escondido',
    cenario: 'tipico',
    largura: 390,
    rota: '#/nova',
    css: 'label[for="f-descricao"] { display: none !important; }',
  },
  {
    regra: REGRAS.erro,
    bug: 'exceção não tratada na página',
    cenario: 'tipico',
    largura: 390,
    rota: '#/inicio',
    js: 'setTimeout(() => { throw new Error("sabotagem") }, 0)',
  },
  {
    regra: `${REGRAS.axe}: color-contrast`,
    bug: 'texto secundário claro demais no tema claro',
    cenario: 'tipico',
    largura: 390,
    rota: '#/despesas',
    css: '.linha-sub { color: #d8d8d8 !important; }',
  },
];

test.describe.configure({ mode: 'parallel' });

for (const s of SABOTAGENS) {
  test(`a regra "${s.regra}" acusa: ${s.bug}`, async ({ browser }, info) => {
    const { contexto, page } = await abrirPagina(browser, info, s.largura);
    const erros = coletarErros(page);
    await prepararCenario(page, s.cenario);
    await ir(page, s.rota);
    await estabilizar(page);
    const medir = async () => [...(await verificarLayout(page)), ...(await verificarAcessibilidade(page)), ...erros()].filter((v) => v.regra === s.regra);

    expect(await medir(), 'a tela precisa estar limpa antes da sabotagem').toEqual([]);
    if (s.css) await page.addStyleTag({ content: s.css });
    if (s.js) await page.evaluate(s.js);
    await page.waitForTimeout(150);
    expect((await medir()).length, `a regra não acusou: ${s.bug}`).toBeGreaterThan(0);
    await contexto.close();
  });
}
