import { fechamentoDaFatura } from '../../dominio/cartao';
import { formatarDataCurta } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import type { Fatura } from '../../dominio/resumo';
import type { MeioPagamento } from '../../dominio/tipos';
import { plural } from '../textos';
import { corDoMeio, LogoMeio } from './Logo';

/**
 * Cartões de crédito em rolagem horizontal, na cor do banco, com a fatura que vence no mês.
 * Tocar no cartão abre a lista filtrada por ele; o botão paga a fatura inteira.
 */
export function CarrosselCartoes({
  meios,
  faturas,
  hrefDoMeio,
  aoPagar,
}: {
  meios: MeioPagamento[];
  faturas: Fatura[];
  hrefDoMeio: (id: string) => string;
  aoPagar: (f: Fatura, meio: MeioPagamento) => void;
}) {
  const cartoes = meios.filter((m) => m.tipo === 'credito');
  if (cartoes.length === 0) return null;
  return (
    <section class="carrossel" aria-label="Cartões de crédito" data-layout="preencher">
      {cartoes.map((m) => {
        const doCartao = faturas.filter((f) => f.meioId === m.id);
        // A fatura "principal" vence no dia do cartão; outras datas vêm de vencimentos digitados à mão.
        const principal = (f: Fatura) => Number(f.vencimento.slice(8)) === m.diaVencimento;
        const fatura =
          doCartao.find((f) => principal(f) && !f.pago) ?? doCartao.find(principal) ?? doCartao.find((f) => !f.pago) ?? doCartao[0];
        const total = doCartao.reduce((s, f) => s + f.total, 0);
        const fecha = fatura && m.diaFechamento ? fechamentoDaFatura(fatura.vencimento, m.diaFechamento) : undefined;
        return (
          <article key={m.id} class="cartao-banco" style={{ backgroundColor: corDoMeio(m) }} aria-label={`Cartão ${m.nome}`}>
            <a class="cartao-banco-link" href={hrefDoMeio(m.id)}>
              {/* Todo cartão do carrossel é de crédito (a seção já diz isso): o nome fica com a linha inteira. */}
              <span class="cartao-banco-topo">
                <span class="cartao-banco-nome">
                  <LogoMeio meio={m} tamanho={28} />
                  {m.nome}
                </span>
              </span>
              <span class="cartao-banco-meio">
                <span class="cartao-banco-rotulo">{fatura ? 'Fatura do mês' : 'Sem fatura neste mês'}</span>
                <span class="cartao-banco-valor">{formatarReais(total)}</span>
              </span>
            </a>
            <span class="cartao-banco-rodape">
              {fatura ? (
                <span>
                  {fecha && `Fecha ${formatarDataCurta(fecha)} · `}Vence {formatarDataCurta(fatura.vencimento)} ·{' '}
                  {plural(doCartao.reduce((s, f) => s + f.ids.length, 0), 'lançamento', 'lançamentos')}
                </span>
              ) : (
                <span>
                  {m.diaFechamento && m.diaVencimento ? `Fecha dia ${m.diaFechamento} · vence dia ${m.diaVencimento}` : 'Dias da fatura não informados'}
                </span>
              )}
              {fatura &&
                (fatura.pago ? (
                  <span class="cartao-banco-pago">Fatura paga</span>
                ) : (
                  <button type="button" class="cartao-banco-pagar" style={{ color: corDoMeio(m) }} onClick={() => aoPagar(fatura, m)}>
                    Pagar fatura
                  </button>
                ))}
            </span>
          </article>
        );
      })}
    </section>
  );
}
