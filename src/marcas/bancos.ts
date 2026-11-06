import { normalizar } from '../dominio/filtros';
import { buscarNoCatalogo } from './identificar';
import type { MarcaCatalogo } from './tipos';

export interface Banco {
  slug: string;
  nome: string;
  /** Cor do cartão, escurecida quando preciso para texto branco ter contraste AA (≥ 4,5:1). */
  cor: string;
  /** Chave do catálogo embutido, quando o banco tem logo lá. */
  logo?: string;
}

/** Bancos e emissores comuns no Brasil. Os que não têm logo no catálogo aparecem com as iniciais. */
export const BANCOS: Banco[] = [
  { slug: 'nubank', nome: 'Nubank', cor: '#820AD1', logo: 'nubank' },
  { slug: 'inter', nome: 'Inter', cor: '#B85300' },
  { slug: 'itau', nome: 'Itaú', cor: '#B84F00' },
  { slug: 'bradesco', nome: 'Bradesco', cor: '#CC092F' },
  { slug: 'santander', nome: 'Santander', cor: '#CC0000' },
  { slug: 'bancodobrasil', nome: 'Banco do Brasil', cor: '#0038A8' },
  { slug: 'caixa', nome: 'Caixa', cor: '#005CA9' },
  { slug: 'c6', nome: 'C6 Bank', cor: '#242424' },
  { slug: 'picpay', nome: 'PicPay', cor: '#0E7A36', logo: 'picpay' },
  { slug: 'mercadopago', nome: 'Mercado Pago', cor: '#00699B', logo: 'mercadopago' },
  { slug: 'pagbank', nome: 'PagBank', cor: '#1B6E3A', logo: 'pagseguro' },
  { slug: 'btg', nome: 'BTG Pactual', cor: '#001E62' },
  { slug: 'xp', nome: 'XP', cor: '#1C1C1C' },
  { slug: 'sicredi', nome: 'Sicredi', cor: '#2F7A2B' },
  { slug: 'sicoob', nome: 'Sicoob', cor: '#00594F' },
  { slug: 'neon', nome: 'Neon', cor: '#0052CC' },
  { slug: 'americanexpress', nome: 'American Express', cor: '#1F5FA0', logo: 'americanexpress' },
];

/** Cores para quem escolhe "Outro banco" ou quer trocar a cor; todas com contraste AA para texto branco. */
export const CORES_CARTAO = ['#57534E', '#7C3AED', '#BE185D', '#B42318', '#A15C07', '#0F766E', '#1D4ED8', '#374151'];

const POR_SLUG = new Map(BANCOS.map((b) => [b.slug, b]));

export function buscarBanco(slug: string | undefined): Banco | undefined {
  return slug ? POR_SLUG.get(slug) : undefined;
}

export function logoDoBanco(slug: string | undefined): MarcaCatalogo | undefined {
  const logo = buscarBanco(slug)?.logo;
  return logo ? buscarNoCatalogo(logo) : undefined;
}

export function filtrarBancos(termo: string): Banco[] {
  const t = normalizar(termo);
  return t ? BANCOS.filter((b) => normalizar(b.nome).includes(t)) : BANCOS;
}
