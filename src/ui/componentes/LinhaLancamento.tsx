import { IconCheck } from '@tabler/icons-preact';
import { useRef } from 'preact/hooks';
import { formatarReais } from '../../dominio/dinheiro';
import { valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { caminho } from '../rota';
import { ROTULO_FREQUENCIA } from '../textos';
import { Logo } from './Logo';
import { PilulaSituacao } from './PilulaSituacao';

const DISTANCIA_DESLIZE = 70;

/** Deslizar para a esquerda mais de 70 px, e mais na horizontal que na vertical (senão é rolagem). */
export function deslizePaga(dx: number, dy: number, podePagar: boolean): boolean {
  return podePagar && dx < -DISTANCIA_DESLIZE && Math.abs(dx) > Math.abs(dy);
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
  const deslizou = useRef(false);
  const podePagar = onPagar !== undefined && item.situacao !== 'paga';
  const subtitulo = [item.categoria?.nome, descreverLancamento(item)].filter(Boolean).join(' · ');

  return (
    <li
      class="linha"
      onPointerDown={(e) => {
        inicio.current = { x: e.clientX, y: e.clientY };
        deslizou.current = false;
      }}
      onPointerUp={(e) => {
        if (inicio.current && deslizePaga(e.clientX - inicio.current.x, e.clientY - inicio.current.y, podePagar)) {
          deslizou.current = true;
          onPagar!(item);
        }
        inicio.current = null;
      }}
      onPointerCancel={() => {
        inicio.current = null;
      }}
    >
      <a
        class="linha-principal"
        href={caminho({ tela: 'despesa', id: d.id })}
        onClick={(e) => {
          if (deslizou.current) {
            e.preventDefault();
            deslizou.current = false;
          }
        }}
      >
        <Logo marca={item.marca} categoria={item.categoria} rotulo={d.descricao} />
        <span class="linha-textos">
          <span class="linha-titulo">{d.descricao}</span>
          <span class="linha-sub">{subtitulo}</span>
        </span>
        <span class="linha-valores">
          <span class="linha-valor">{formatarReais(valorEfetivo(l))}</span>
          <PilulaSituacao situacao={item.situacao} vencimento={l.vencimento} estimado={l.estimado} />
        </span>
      </a>
      {podePagar && (
        <button type="button" class="botao-icone botao-pagar" aria-label={`Marcar ${d.descricao} como paga`} onClick={() => onPagar!(item)}>
          <IconCheck size={22} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
