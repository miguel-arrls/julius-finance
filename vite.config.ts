import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

export const CSP = [
  "default-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join('; ');

// A CSP entra só no build: no modo dev o Vite precisa de scripts próprios para o recarregamento.
function csp(): Plugin {
  return {
    name: 'julius-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: '/julius-finance/',
  plugins: [preact(), csp()],
});
