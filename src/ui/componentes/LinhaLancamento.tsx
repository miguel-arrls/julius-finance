import { IconCheck } from '@tabler/icons-preact';
import { useRef } from 'preact/hooks';
import { formatarReais } from '../../dominio/dinheiro';
import { valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { caminho } from '../rota';
import { ROTULO_FREQUENCIA } from '../textos';
import { Logo } from './Logo';
import { PilulaSituacao } from './PilulaSituacao';

const DISTANCIA_DESLIZE = 70;

export function descreverLancamento(item: ItemLista): string {
  const { despesa: d, lancamento: l } = item;
  if (d.tipo === 'parcelada' && l.numero) return `Parcela ${l.numero}/${d.numParcelas}`;
  if (d.tipo === 'recorrente') return ROTULO_FREQUENCIA[d.frequencia];
  return 'Avulsa';
}

export function LinhaLancamento({ item, onPagar }: { item: ItemLista; onPagar?: (item: ItemLista) => void }) {
  const { lancamento: l, despesa: d } = item;
  const inicioX = useRef<number | null>(null);
  const deslizou = useRef(false);
  const podePagar = onPagar !== undefined && item.situacao !== 'paga';
  const subtitulo = [item.categoria?.nome, descreverLancamento(item)].filter(Boolean).join(' · ');

  return (
    <li
      class="linha"
      onPointerDown={(e) => {
        inicioX.current = e.clientX;
        deslizou.current = false;
      }}
      onPointerUp={(e) => {
        if (inicioX.current !== null && podePagar && e.clientX - inicioX.current < -DISTANCIA_DESLIZE) {
          deslizou.current = true;
          onPagar!(item);
        }
        inicioX.current = null;
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
