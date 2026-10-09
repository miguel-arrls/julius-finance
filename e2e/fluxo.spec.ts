import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  // Força o caminho de download (a folha de compartilhar não existe no teste).
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  page.on('dialog', (d) => void d.accept());
});

async function comecarDoZero(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Começar do zero' }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

test('parcelada: cadastrar, pagar, exportar, apagar tudo e importar de volta', async ({ page }, info) => {
  await comecarDoZero(page);

  await page.getByRole('link', { name: 'Nova despesa' }).click();
  await page.getByRole('radio', { name: 'Parcelada' }).click();
  await page.getByLabel('Descrição').fill('Notebook Ação');
  await page.getByLabel('Categoria').selectOption('cat-compras');
  await page.getByLabel('Valor total').fill('1.200,00');
  await page.getByLabel('Número de parcelas').fill('3');
  await page.getByLabel('1º vencimento').fill('2026-11-10');
  await expect(page.getByRole('region', { name: 'Parcelas que serão geradas' }).getByText('R$ 400,00')).toHaveCount(3);
  await page.getByRole('button', { name: 'Salvar despesa' }).click();

  await expect(page.getByRole('heading', { name: 'Notebook Ação' })).toBeVisible();
  await page.getByRole('button', { name: 'Marcar Parcela 1/3 como paga' }).click();
  await expect(page.getByRole('button', { name: 'Desfazer pagamento de Parcela 1/3' })).toBeVisible();

  await page.getByRole('link', { name: 'Ajustes' }).click();
  await page.getByRole('link', { name: 'Backup e importação' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  const arquivo = info.outputPath('backup.json');
  await (await download).saveAs(arquivo);
  expect(JSON.parse(readFileSync(arquivo, { encoding: 'utf-8' })).dados.despesas[0].descricao).toBe('Notebook Ação');

  await page.evaluate(
    () =>
      new Promise<void>((pronto) => {
        const r = indexedDB.deleteDatabase('julius');
        r.onsuccess = r.onerror = r.onblocked = () => pronto();
      }),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boas-vindas ao Julius' })).toBeVisible();

  await page.getByLabel('Importar minhas contas').setInputFiles(arquivo);
  await page.getByRole('region', { name: 'Confirmar importação' }).getByRole('button', { name: 'Importar', exact: true }).click();
  await page.getByRole('link', { name: 'Despesas' }).click();
  await page.getByRole('tab', { name: 'Parceladas' }).click();
  await page.getByRole('link', { name: /Notebook Ação/ }).click();
  await expect(page.getByRole('button', { name: 'Desfazer pagamento de Parcela 1/3' })).toBeVisible();
});

test('deslizar uma linha para a esquerda marca como paga', async ({ page }) => {
  await comecarDoZero(page);

  await page.getByRole('link', { name: 'Nova despesa' }).click();
  await page.getByLabel('Descrição').fill('Conta teste');
  await page.getByLabel('Categoria').selectOption('cat-moradia');
  await page.getByLabel('Valor').fill('10,00');
  await page.getByLabel('Vencimento').fill('2030-01-10');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByRole('heading', { name: 'Conta teste' })).toBeVisible();

  await page.getByRole('link', { name: 'Lançamentos' }).click();
  await page.getByLabel('Mês').selectOption('');
  const linha = page.getByRole('listitem').filter({ hasText: 'Conta teste' });
  const caixa = (await linha.boundingBox())!;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(caixa.x + caixa.width - 60, y);
  await page.mouse.down();
  await page.mouse.move(caixa.x + 20, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('Conta teste marcada como paga')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible(); // não navegou
});

test('nova despesa: campos lado a lado começam na mesma altura, mesmo com rótulo quebrado', async ({ page }) => {
  // Em 320 px "Data da compra (opcional)" quebra em duas linhas com qualquer fonte.
  await page.setViewportSize({ width: 320, height: 700 });
  await comecarDoZero(page);
  await page.getByRole('link', { name: 'Nova despesa' }).click();
  for (const tipo of ['Avulsa', 'Parcelada', 'Recorrente']) {
    await page.getByRole('radio', { name: tipo }).click();
    await expect(page.locator('.duas-colunas').first()).toBeVisible();
    const grades = await page.locator('.duas-colunas').evaluateAll((gs) =>
      gs.map((g) => ({
        texto: g.textContent,
        rotulos: [...g.querySelectorAll('.campo-rotulo')].map((r) => Math.round(r.getBoundingClientRect().height)),
        topos: [...g.children].map((c) => Math.round(c.querySelector('input, select')?.getBoundingClientRect().top ?? -1)),
      })),
    );
    expect(grades.length, tipo).toBeGreaterThan(0);
    if (tipo !== 'Recorrente') {
      const data = grades.find((g) => g.texto?.includes('Data da compra'))!;
      expect(Math.max(...data.rotulos), 'o rótulo precisa quebrar para o teste valer').toBeGreaterThan(Math.min(...data.rotulos));
    }
    expect(grades.filter((g) => new Set(g.topos).size > 1).map((g) => g.texto), tipo).toEqual([]);
  }
});
