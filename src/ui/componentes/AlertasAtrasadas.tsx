import { IconAlertTriangle } from '@tabler/icons-preact';
import { formatarDataCurta } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { plural } from '../textos';

/** Até este número, um alerta por conta com o botão Pagar; acima, um alerta só que leva à lista. */
export const MAX_ALERTAS_INDIVIDUAIS = 2;

export function AlertasAtrasadas({
  atrasadas,
  hrefTodas,
  aoPagar,
}: {
  atrasadas: ItemLista[];
  hrefTodas: string;
  aoPagar: (item: ItemLista) => void;
}) {
  if (atrasadas.length === 0) return null;
  if (atrasadas.length > MAX_ALERTAS_INDIVIDUAIS) {
    const total = atrasadas.reduce((s, i) => s + valorEfetivo(i.lancamento), 0);
    return (
      <section class="alerta" aria-label="Contas atrasadas">
        <IconAlertTriangle aria-hidden="true" />
        <span class="alerta-textos">
          <strong>{plural(atrasadas.length, 'conta atrasada', 'contas atrasadas')}</strong>
          <span>{formatarReais(total)} no total</span>
        </span>
        <a class="alerta-acao" href={hrefTodas}>
          Ver
        </a>
      </section>
    );
  }
  return (
    <>
      {atrasadas.map((i) => {
        const { despesa: d, lancamento: l } = i;
        const detalhe = [formatarReais(valorEfetivo(l)), l.vencimento && `venceu ${formatarDataCurta(l.vencimento)}`, i.meio?.nome]
          .filter(Boolean)
          .join(' · ');
        return (
          <section class="alerta" key={l.id} aria-label={`${d.descricao} atrasada`}>
            <IconAlertTriangle aria-hidden="true" />
            <span class="alerta-textos">
              <strong>{d.descricao} está atrasada</strong>
              <span>{detalhe}</span>
            </span>
            <button type="button" class="alerta-acao" aria-label={`Pagar ${d.descricao}`} onClick={() => aoPagar(i)}>
              Pagar
            </button>
          </section>
        );
      })}
    </>
  );
}
