/**
 * UUID v4 para os registros do app.
 * `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost). Aberto por http no IP da rede
 * (teste no iPhone com `npm run dev -- --host`), o Safari não o oferece; `getRandomValues` existe em qualquer
 * contexto e gera o mesmo formato.
 */
export function novoId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; // versão 4
  b[8] = (b[8]! & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
