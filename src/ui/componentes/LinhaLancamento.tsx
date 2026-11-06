import { IconCheck, IconCopy, IconEdit } from '@tabler/icons-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { formatarReais } from '../../dominio/dinheiro';
import { valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { caminho } from '../rota';
import { ROTULO_FREQUENCIA } from '../textos';
import { Logo, LogoMeio } from './Logo';
import { PilulaSituacao } from './PilulaSituacao';

const DISTANCIA_DESLIZE = 70;
const TEMPO_SEGURAR = 500;
const TOLERANCIA_SEGURAR = 10;

export type Deslize = 'abrir' | 'fechar' | null;

/**
 * Deslizar mais de 70 px, e mais na horizontal que na vertical (senão é rolagem):
 * para a esquerda abre as ações da linha, para a direita fecha. Nunca paga direto.
 */
export function deslize(dx: number, dy: number): Deslize {
  if (Math.abs(dx) <= DISTANCIA_DESLIZE || Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'abrir' : 'fechar';
}

/** Tocar e segurar: o dedo não pode ter andado mais que a tolerância. */
export function aindaSegurando(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) <= TOLERANCIA_SEGURAR;
}

export function descreverLancamento(item: ItemLista): string {
  const { despesa: d, lancamento: l } = item;
  if (d.tipo === 'parcelada' && l.numero) return `Parcela ${l.numero}/${d.numParcelas}`;
  if (d.tipo === 'recorrente') return ROTULO_FREQUENCIA[d.frequencia];
  return 'Avulsa';
}

export function LinhaLancamento({ item, onPagar }: { item: ItemLista; onPagar?: (item: ItemLista) => void }) {
  const { lancamento: l, despesa: d } = item;
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const engolirClique = useRef(false);
  const acoesRef = useRef<HTMLDivElement>(null);
  const [aberta, setAberta] = useState(false);
  const podePagar = onPagar !== undefined && item.situacao !== 'paga';
  const subtitulo = [item.categoria?.nome, descreverLancamento(item), item.meio?.nome].filter(Boolean).join(' · ');

  useEffect(() => () => clearTimeout(relogio.current), []);
  useEffect(() => {
    // Leva o foco para a primeira ação, para leitores de tela anunciarem o menu.
    if (aberta) acoesRef.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, [aberta]);

  function abrir() {
    engolirClique.current = true;
    setAberta(true);
  }

  function pararRelogio() {
    clearTimeout(relogio.current);
    relogio.current = undefined;
  }

  return (
    <li
      class={`linha${aberta ? ' linha-aberta' : ''}`}
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
        engolirClique.current = false;
        pararRelogio();
        relogio.current = setTimeout(abrir, TEMPO_SEGURAR);
      }}
      onPointerMove={(e) => {
        if (inicio.current && !aindaSegurando(e.clientX - inicio.current.x, e.clientY - inicio.current.y)) pararRelogio();
      }}
      onPointerUp={(e) => {
        pararRelogio();
        if (inicio.current) {
          const r = deslize(e.clientX - inicio.current.x, e.clientY - inicio.current.y);
          if (r === 'abrir') abrir();
          if (r === 'fechar' && aberta) {
            engolirClique.current = true;
            setAberta(false);
          }
        }
        inicio.current = null;
      }}
      onPointerCancel={() => {
        pararRelogio();
        inicio.current = null;
      }}
      onContextMenu={(e) => {
        // Clique direito no PC (e o "segurar" de alguns navegadores) abre o mesmo menu.
        e.preventDefault();
        abrir();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && aberta) setAberta(false);
      }}
    >
      <a
        class="linha-principal"
        href={caminho({ tela: 'despesa', id: d.id })}
        onClick={(e) => {
          if (engolirClique.current) {
            e.preventDefault();
            engolirClique.current = false;
          }
        }}
      >
        {item.meio?.bancoSlug ? (
          <span class="logo-com-meio">
            <Logo marca={item.marca} categoria={item.categoria} rotulo={d.descricao} />
            <LogoMeio meio={item.meio} tamanho={20} />
          </span>
        ) : (
          <Logo marca={item.marca} categoria={item.categoria} rotulo={d.descricao} />
        )}
        <span class="linha-textos">
          <span class="linha-titulo">{d.descricao}</span>
          <span class="linha-sub">{subtitulo}</span>
        </span>
        <span class="linha-valores">
          <span class="linha-valor">{formatarReais(valorEfetivo(l))}</span>
          <PilulaSituacao situacao={item.situacao} vencimento={l.vencimento} estimado={l.estimado} />
        </span>
      </a>
      {podePagar && !aberta && (
        <button type="button" class="botao-icone botao-pagar" aria-label={`Marcar ${d.descricao} como paga`} onClick={() => onPagar!(item)}>
          <IconCheck size={22} aria-hidden="true" />
        </button>
      )}
      {aberta && (
        <div class="linha-acoes" role="group" aria-label={`Ações de ${d.descricao}`} ref={acoesRef}>
          {podePagar && (
            <button
              type="button"
              class="linha-acao linha-acao-pagar"
              onClick={() => {
                setAberta(false);
                onPagar!(item);
              }}
            >
              <IconCheck size={20} aria-hidden="true" />
              Pagar
            </button>
          )}
          <a class="linha-acao" href={caminho({ tela: 'editar', id: d.id })}>
            <IconEdit size={20} aria-hidden="true" />
            Editar
          </a>
          <a class="linha-acao" href={caminho({ tela: 'nova', de: d.id })}>
            <IconCopy size={20} aria-hidden="true" />
            Duplicar
          </a>
          <button type="button" class="linha-acao" onClick={() => setAberta(false)}>
            Fechar
          </button>
        </div>
      )}
    </li>
  );
}
