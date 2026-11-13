import { useEffect, useState } from 'preact/hooks';
import { ehMesISO } from '../dominio/datas';
import type { Filtros } from '../dominio/filtros';
import type { Situacao, TipoDespesa } from '../dominio/tipos';

/** Filtros que a lista aceita pela rota (o texto da busca fica só na tela). */
export type FiltrosRota = Omit<Filtros, 'texto'> & { todosMeses?: true };

export type Rota =
  | { tela: 'inicio' }
  | { tela: 'lancamentos'; filtros?: FiltrosRota }
  | { tela: 'nova'; de?: string }
  | { tela: 'editar'; id: string }
  | { tela: 'despesas' }
  | { tela: 'despesa'; id: string }
  | { tela: 'analise' }
  | { tela: 'ajustes' }
  | { tela: 'categorias' }
  | { tela: 'marcas' }
  | { tela: 'meios' }
  | { tela: 'backup' }
  | { tela: 'dados' };

type TelaSimples = Exclude<Rota['tela'], 'editar' | 'despesa'>;
const SIMPLES: readonly TelaSimples[] = [
  'inicio', 'lancamentos', 'nova', 'despesas', 'analise', 'ajustes', 'categorias', 'marcas', 'meios', 'backup', 'dados',
];
const SITUACOES: readonly Situacao[] = ['paga', 'pendente', 'atrasada', 'sem-vencimento'];
const TIPOS: readonly TipoDespesa[] = ['avulsa', 'parcelada', 'recorrente'];

/** Lê os filtros da consulta; valores inválidos são ignorados um a um. */
function lerFiltros(q: URLSearchParams): FiltrosRota | undefined {
  const f: FiltrosRota = {};
  const mes = q.get('mes');
  if (ehMesISO(mes)) f.mes = mes;
  else if (mes === 'todos') f.todosMeses = true;
  const situacao = q.get('situacao');
  if (SITUACOES.includes(situacao as Situacao)) f.situacao = situacao as Situacao;
  const tipo = q.get('tipo');
  if (TIPOS.includes(tipo as TipoDespesa)) f.tipo = tipo as TipoDespesa;
  const categoria = q.get('categoria');
  if (categoria) f.categoriaId = categoria;
  const meio = q.get('meio');
  if (meio) f.meioPagamentoId = meio;
  return Object.keys(f).length > 0 ? f : undefined;
}

export function lerRota(hash: string): Rota {
  const semPrefixo = hash.replace(/^#\/?/, '');
  const interrogacao = semPrefixo.indexOf('?');
  const trilha = interrogacao < 0 ? semPrefixo : semPrefixo.slice(0, interrogacao);
  let partes: string[];
  let consulta: URLSearchParams;
  try {
    partes = trilha.split('/').filter(Boolean).map(decodeURIComponent);
    consulta = new URLSearchParams(interrogacao < 0 ? '' : semPrefixo.slice(interrogacao + 1));
  } catch {
    return { tela: 'inicio' }; // hash malformado (ex.: %)
  }
  const [a, b, c] = partes;
  if (c !== undefined) return { tela: 'inicio' };
  if (a === 'editar' && b) return { tela: 'editar', id: b };
  if (a === 'despesas' && b) return { tela: 'despesa', id: b };
  if (b !== undefined || !SIMPLES.includes(a as TelaSimples)) return { tela: 'inicio' };
  if (a === 'lancamentos') {
    const filtros = lerFiltros(consulta);
    return filtros ? { tela: 'lancamentos', filtros } : { tela: 'lancamentos' };
  }
  if (a === 'nova') {
    const de = consulta.get('de');
    return de ? { tela: 'nova', de } : { tela: 'nova' };
  }
  return { tela: a as Exclude<TelaSimples, 'lancamentos' | 'nova'> };
}

function comConsulta(base: string, pares: [string, string | undefined][]): string {
  const q = new URLSearchParams();
  for (const [k, v] of pares) if (v) q.set(k, v);
  const texto = q.toString();
  return texto ? `${base}?${texto}` : base;
}

export function caminho(r: Rota): string {
  if (r.tela === 'editar') return `#/editar/${encodeURIComponent(r.id)}`;
  if (r.tela === 'despesa') return `#/despesas/${encodeURIComponent(r.id)}`;
  if (r.tela === 'lancamentos') {
    const f = r.filtros ?? {};
    return comConsulta('#/lancamentos', [
      ['mes', f.todosMeses ? 'todos' : f.mes],
      ['situacao', f.situacao],
      ['categoria', f.categoriaId],
      ['meio', f.meioPagamentoId],
      ['tipo', f.tipo],
    ]);
  }
  if (r.tela === 'nova') return comConsulta('#/nova', [['de', r.de]]);
  return `#/${r.tela}`;
}

export function navegar(r: Rota): void {
  location.hash = caminho(r);
}

export function usarRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(location.hash));
  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota(location.hash));
      try {
        window.scrollTo(0, 0);
      } catch {
        // jsdom não implementa scrollTo
      }
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return rota;
}
