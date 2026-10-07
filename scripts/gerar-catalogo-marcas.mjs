// Gera src/marcas/catalogo.gerado.ts com uma seleção do pacote simple-icons (licença CC0).
import { writeFileSync } from 'node:fs';
import * as icones from 'simple-icons';

const SLUGS = [
  'netflix', 'spotify', 'youtube', 'youtubemusic', 'hbo', 'hbomax', 'max', 'crunchyroll', 'applemusic', 'appletv',
  'deezer', 'paramountplus', 'twitch', 'playstation', 'steam', 'epicgames', 'icloud', 'google', 'googleplay',
  'googledrive', 'dropbox', 'anthropic', 'claude', 'notion', 'duolingo', 'tinder', 'uber', 'ubereats', 'ifood',
  'airbnb', 'bookingdotcom', 'mercadopago', 'nubank', 'picpay', 'paypal', 'visa', 'mastercard', 'americanexpress',
  'shopee', 'aliexpress', 'carrefour', 'mcdonalds', 'burgerking', 'starbucks', 'kfc', 'cocacola', 'shell', 'vivo',
  'apple', 'samsung', 'xiaomi', 'motorola', 'dell', 'lenovo', 'hp', 'lg', 'sony', 'nike', 'adidas', 'puma', 'zara',
  'handm', 'ikea', 'leroymerlin', 'waze', 'googlemaps', 'appstore', 'github', 'discord', 'whatsapp', 'telegram',
  'instagram', 'facebook', 'tiktok', 'pinterest', 'reddit', 'patreon', 'audible', 'medium', 'dazn', 'nba',
  'pagseguro', 'wise', 'revolut', 'binance', 'coinbase', 'ebay', 'etsy', 'zoom', 'trello', 'figma', 'mubi', 'vimeo',
  'soundcloud', 'tidal', 'bandcamp', 'wikipedia', 'protonmail', 'proton', 'bitwarden', '1password', 'nordvpn',
  'expressvpn', 'mullvad', 'surfshark', 'cloudflare', 'vercel', 'digitalocean', 'hostinger', 'godaddy', 'namecheap',
];

const porSlug = new Map(
  Object.values(icones)
    .filter((i) => i && typeof i === 'object' && 'slug' in i)
    .map((i) => [i.slug, i]),
);
const faltando = SLUGS.filter((s) => !porSlug.has(s));
if (faltando.length > 0) {
  console.error(`Slugs inexistentes no simple-icons: ${faltando.join(', ')}`);
  process.exit(1);
}
const itens = SLUGS.map((s) => {
  const i = porSlug.get(s);
  return { slug: s, nome: i.title, hex: i.hex, path: i.path };
});
const conteudo =
  '// Gerado por scripts/gerar-catalogo-marcas.mjs a partir do pacote simple-icons (CC0). Não editar à mão.\n' +
  "import type { MarcaCatalogo } from './tipos';\n\n" +
  `export const CATALOGO: MarcaCatalogo[] = ${JSON.stringify(itens, null, 2)};\n`;
writeFileSync(new URL('../src/marcas/catalogo.gerado.ts', import.meta.url), conteudo, { encoding: 'utf-8' });
console.log(`${itens.length} marcas gravadas em src/marcas/catalogo.gerado.ts`);
