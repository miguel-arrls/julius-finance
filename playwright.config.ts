import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import { PASTA_PRINTS } from './e2e/layout/pastas';

// Uma pasta de falhas por execução; definida no processo principal e herdada pelos workers.
process.env.JULIUS_EXECUCAO ??= new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // Comparação de prints só local: o CI roda em Linux, com fontes diferentes das do Windows.
  snapshotPathTemplate: join(PASTA_PRINTS, 'referencia', '{arg}{ext}'),
  updateSnapshots: 'missing',
  use: {
    baseURL: 'http://localhost:4173/julius-finance/',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
  },
  projects: [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/julius-finance/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
