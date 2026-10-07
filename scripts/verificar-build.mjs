// Confere o que o iPhone precisa para instalar e o que garante a privacidade. Sai com código 1 se faltar algo.
import { existsSync, readFileSync } from 'node:fs';

const erros = [];
const ler = (caminho) => readFileSync(caminho, { encoding: 'utf-8' });

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html não existe. Rode npm run build antes.');
  process.exit(1);
}
const html = ler('dist/index.html');
// O Vite grava o atributo content da meta com aspas escapadas (&#39;), então desescapa antes de conferir.
if (!html.replaceAll('&#39;', "'").includes("connect-src 'self'")) erros.push('CSP com connect-src ausente em dist/index.html');
if (!html.includes('manifest.webmanifest')) erros.push('manifest não referenciado em dist/index.html');
if (!html.includes('apple-touch-icon')) erros.push('apple-touch-icon ausente em dist/index.html');
if (!html.includes('registerSW.js')) erros.push('registro do service worker ausente em dist/index.html');

for (const f of ['dist/sw.js', 'dist/registerSW.js', 'dist/manifest.webmanifest', 'dist/apple-touch-icon-180x180.png', 'dist/pwa-192x192.png', 'dist/pwa-512x512.png']) {
  if (!existsSync(f)) erros.push(`${f} não existe`);
}

if (existsSync('dist/sw.js')) {
  const sw = ler('dist/sw.js');
  if (!sw.includes('skipWaiting') || !sw.includes('clientsClaim')) {
    erros.push('service worker sem atualização automática (skipWaiting/clientsClaim)');
  }
}

if (existsSync('dist/manifest.webmanifest')) {
  const m = JSON.parse(ler('dist/manifest.webmanifest'));
  if (m.start_url !== '/julius-finance/') erros.push(`manifest.start_url inesperado: ${m.start_url}`);
  if (m.display !== 'standalone') erros.push(`manifest.display inesperado: ${m.display}`);
  if (m.lang !== 'pt-BR') erros.push(`manifest.lang inesperado: ${m.lang}`);
}

if (erros.length > 0) {
  console.error(erros.join('\n'));
  process.exit(1);
}
console.log('Build verificado: CSP, manifest, service worker e ícones presentes.');
