import type { Browser, Page, TestInfo } from '@playwright/test';
import { AGORA, backupDoCenario } from './cenarios';

export const LARGURA_MOVEL = 767;

/** Contexto limpo na largura e no tema pedidos, com o relógio congelado em AGORA. */
export async function abrirPagina(browser: Browser, info: TestInfo, largura: number, tema: 'claro' | 'escuro' = 'claro') {
  const movel = largura <= LARGURA_MOVEL;
  const contexto = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: { width: largura, height: 900 },
    deviceScaleFactor: 1, // layout é o mesmo em CSS px; 1x mantém a pasta de prints leve
    isMobile: movel,
    hasTouch: movel,
    colorScheme: tema === 'escuro' ? 'dark' : 'light',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await contexto.newPage();
  await page.clock.setFixedTime(new Date(AGORA));
  return { contexto, page };
}

/** Abre o app e importa o backup do cenário pela tela de boas-vindas ("vazio" fica nas boas-vindas). */
export async function prepararCenario(page: Page, cenario: string) {
  await page.goto('./');
  const backup = backupDoCenario(cenario);
  if (!backup) {
    await page.getByRole('heading', { name: 'Boas-vindas ao Julius' }).waitFor();
    return;
  }
  await page.getByLabel('Importar minhas contas').setInputFiles({
    name: `cenario-${cenario}.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup), 'utf-8'),
  });
  await page.getByRole('region', { name: 'Confirmar importação' }).getByRole('button', { name: 'Importar', exact: true }).click();
  await saiuDasBoasVindas(page);
}

export async function comecarDoZero(page: Page) {
  await page.getByRole('button', { name: 'Começar do zero' }).click();
  await saiuDasBoasVindas(page);
}

/** A barra de navegação já aparece nas boas-vindas: o sinal de pronto é o título delas sumir. */
async function saiuDasBoasVindas(page: Page) {
  await page.getByRole('heading', { name: 'Boas-vindas ao Julius' }).waitFor({ state: 'detached' });
  await page.locator('main h1').first().waitFor();
}

/** Troca de rota garantindo tela nova (a mesma rota de novo passa por outra antes). */
export async function ir(page: Page, hash: string) {
  if ((await page.evaluate(() => location.hash)) === hash) {
    await page.evaluate(() => (location.hash = '#/ajustes'));
    await page.getByRole('heading', { name: 'Ajustes', level: 1 }).waitFor();
  }
  await page.evaluate((h) => (location.hash = h), hash);
  await page.locator('main h1').first().waitFor();
}

/** Esconde avisos temporários (ex.: "Dados importados"), que não fazem parte da tela. */
export async function estabilizar(page: Page) {
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}
