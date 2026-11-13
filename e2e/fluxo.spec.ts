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

  await page.getByRole('link', { name: 'Início' }).click();
  await page.getByRole('link', { name: 'Ajustes' }).click(); // engrenagem no topo do Início
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

test('cartão novo no formulário → Início → categoria → lista filtrada → deslizar → pagar', async ({ page }) => {
  await comecarDoZero(page);
  const agora = new Date();
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;

  await page.getByRole('link', { name: 'Nova despesa' }).click();
  await page.getByLabel('Descrição').fill('Conta teste');
  await page.getByLabel('Categoria').selectOption('cat-moradia');
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  const folha = page.getByRole('dialog', { name: 'Novo cartão' });
  await folha.getByRole('radio', { name: 'Inter' }).click();
  await folha.getByLabel('Dia de fechamento').fill('2');
  await folha.getByLabel('Dia de vencimento').fill('7');
  await folha.getByRole('button', { name: 'Salvar' }).click();
  await expect(folha).toBeHidden();
  await expect(page.getByRole('radio', { name: /^Inter/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Valor', { exact: true }).fill('10,00');
  // No cartão o vencimento sai da fatura: sem data da compra, o mês da fatura é o atual e vence no dia 7.
  const [ano, mm] = mes.split('-');
  await expect(page.getByText(`Vence 07/${mm}/${ano}, na fatura do Inter.`)).toBeVisible();
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByRole('heading', { name: 'Conta teste' })).toBeVisible();

  await page.getByRole('link', { name: 'Início' }).click();
  await page.getByRole('link', { name: /^Moradia/ }).click();
  await expect(page.getByRole('radio', { name: 'Moradia' })).toHaveAttribute('aria-checked', 'true');

  const linha = page.getByRole('listitem').filter({ hasText: 'Conta teste' });
  await expect(linha).toContainText('Inter');
  // Centraliza antes de deslizar: perto do rodapé o gesto começaria sobre o botão flutuante "+".
  await linha.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const caixa = (await linha.boundingBox())!;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(caixa.x + caixa.width - 60, y);
  await page.mouse.down();
  await page.mouse.move(caixa.x + 20, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible(); // não navegou nem pagou
  await linha.getByRole('group', { name: 'Ações de Conta teste' }).getByRole('button', { name: 'Pagar' }).click();
  await expect(page.getByText('Conta teste marcada como paga')).toBeVisible();
});

test('seletor de meio: nenhum cartão sobrepõe o vizinho nem o "Novo cartão"', async ({ page }) => {
  await comecarDoZero(page);
  await page.getByRole('link', { name: 'Nova despesa' }).click();
  for (const banco of ['Nubank', 'Inter', 'C6 Bank']) {
    await page.getByRole('button', { name: 'Novo cartão' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo cartão' });
    await folha.getByRole('radio', { name: banco }).click();
    await folha.getByLabel('Dia de fechamento').fill('2');
    await folha.getByLabel('Dia de vencimento').fill('7');
    await folha.getByRole('button', { name: 'Salvar' }).click();
    await expect(folha).toBeHidden();
  }
  const caixas = await page.locator('.seletor-meio .opcao-meio').evaluateAll((bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { nome: b.textContent, esquerda: Math.round(r.left), direita: Math.round(r.right) };
    }),
  );
  expect(caixas.length).toBe(5); // Não informado + 3 cartões + Novo cartão
  const sobrepostos = caixas.flatMap((c, i) => {
    const anterior = caixas[i - 1];
    return anterior && c.esquerda < anterior.direita ? [`${anterior.nome} × ${c.nome}`] : [];
  });
  expect(sobrepostos).toEqual([]);
});

test('carrossel: um cartão só ocupa a largura do conteúdo; com dois, o seguinte aparece na borda', async ({ page }) => {
  await comecarDoZero(page);
  const medir = () =>
    page.locator('.carrossel').evaluate((c) => {
      const estilo = getComputedStyle(c);
      const conteudo = c.getBoundingClientRect();
      const esquerda = conteudo.left + parseFloat(estilo.paddingLeft);
      const direita = conteudo.right - parseFloat(estilo.paddingRight);
      return {
        bordas: [Math.round(esquerda), Math.round(direita)],
        cartoes: [...c.querySelectorAll('.cartao-banco')].map((e) => {
          const r = e.getBoundingClientRect();
          return [Math.round(r.left), Math.round(r.right)];
        }),
        rolavel: c.scrollWidth > c.clientWidth,
      };
    });
  for (const banco of ['Nubank', 'Inter']) {
    await page.getByRole('link', { name: 'Nova despesa' }).click();
    await page.getByRole('button', { name: 'Novo cartão' }).click();
    const folha = page.getByRole('dialog', { name: 'Novo cartão' });
    await folha.getByRole('radio', { name: banco }).click();
    await folha.getByLabel('Dia de fechamento').fill('2');
    await folha.getByLabel('Dia de vencimento').fill('7');
    await folha.getByRole('button', { name: 'Salvar' }).click();
    await expect(folha).toBeHidden();
    await page.getByRole('link', { name: 'Início' }).click();
    await expect(page.getByRole('region', { name: 'Cartões de crédito' })).toBeVisible();
    const m = await medir();
    if (banco === 'Nubank') {
      expect(m.cartoes).toEqual([m.bordas]);
      expect(m.rolavel).toBe(false);
    } else {
      expect(m.cartoes).toHaveLength(2);
      expect(m.cartoes[0]![1]).toBeLessThan(m.bordas[1]!); // o primeiro não ocupa tudo: o segundo aparece
      expect(m.rolavel).toBe(true);
    }
  }
});

async function cartaoComFatura(page: Page, banco: string, nome: string) {
  await page.getByRole('link', { name: 'Nova despesa' }).first().click();
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  const folha = page.getByRole('dialog', { name: 'Novo cartão' });
  await folha.getByRole('radio', { name: banco }).click();
  await folha.getByLabel('Nome').fill(nome);
  await folha.getByLabel('Dia de fechamento').fill('2');
  await folha.getByLabel('Dia de vencimento').fill('7');
  await folha.getByRole('button', { name: 'Salvar' }).click();
  await expect(folha).toBeHidden();
  await page.getByLabel('Descrição').fill(`Assinatura anual do aplicativo ${banco}`);
  await page.getByLabel('Categoria').selectOption('cat-compras');
  await page.getByLabel('Valor', { exact: true }).fill('1.709,30');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByRole('heading', { name: `Assinatura anual do aplicativo ${banco}` })).toBeVisible();
}

test('Início no tablet e no PC: sem rolagem lateral e largura que não muda com a fatura', async ({ page }) => {
  await comecarDoZero(page);
  await cartaoComFatura(page, 'Mercado Pago', 'Cartão Mercado Pago');
  await page.getByRole('link', { name: 'Início' }).first().click();
  const medir = () =>
    page.evaluate(() => ({
      rola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      conteudo: Math.round(document.querySelector('.conteudo')!.getBoundingClientRect().width),
    }));
  for (const largura of [768, 900, 1024, 1280]) {
    await page.setViewportSize({ width: largura, height: 900 });
    await expect(page.locator('.carrossel')).toBeVisible();
    const pendente = await medir();
    expect(pendente.rola, `rolagem lateral em ${largura}`).toBe(false);
    if (largura === 1280) {
      await page.getByRole('article', { name: 'Cartão Cartão Mercado Pago' }).getByRole('button', { name: 'Pagar fatura' }).click();
      await expect(page.locator('.cartao-banco-pago')).toBeVisible();
      expect((await medir()).conteudo).toBe(pendente.conteudo);
    }
  }
});

test('carrossel: nome longo do cartão cabe em uma linha mesmo com vários cartões', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await comecarDoZero(page);
  await cartaoComFatura(page, 'Mercado Pago', 'Cartão Mercado Pago');
  await cartaoComFatura(page, 'Nubank', 'Nubank');
  await page.getByRole('link', { name: 'Início' }).first().click();
  const nome = page.locator('.cartao-banco-nome').first();
  await expect(nome).toHaveText('Cartão Mercado Pago');
  const { altura, linha } = await nome.evaluate((e) => ({
    altura: e.getBoundingClientRect().height,
    linha: parseFloat(getComputedStyle(e).lineHeight),
  }));
  expect(Math.round(altura / linha)).toBe(1);
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
