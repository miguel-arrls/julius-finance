import { IconPlus } from '@tabler/icons-preact';
import type { MeioPagamento } from '../../dominio/tipos';
import { ROTULO_MEIO } from '../textos';
import { LogoMeio } from './Logo';

/** Escolha do meio de pagamento em cartões tocáveis, com "Não informado" e atalho para cadastrar um novo. */
export function SeletorMeio({
  meios,
  valor,
  aoEscolher,
  aoNovo,
}: {
  meios: MeioPagamento[];
  valor: string;
  aoEscolher: (id: string) => void;
  aoNovo: () => void;
}) {
  return (
    <fieldset class="campo">
      <legend class="campo-rotulo" id="f-meio-rotulo">
        Meio de pagamento
      </legend>
      <div class="seletor-meio">
        <div role="radiogroup" aria-labelledby="f-meio-rotulo" class="seletor-meio-opcoes">
          <button type="button" role="radio" aria-checked={valor === ''} class="opcao-meio opcao-meio-vazia" onClick={() => aoEscolher('')}>
            <span class="opcao-meio-nome">Não informado</span>
          </button>
          {meios.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={valor === m.id} class="opcao-meio" onClick={() => aoEscolher(m.id)}>
              <LogoMeio meio={m} tamanho={32} />
              <span class="opcao-meio-textos">
                <span class="opcao-meio-nome">{m.nome}</span>
                <span class="opcao-meio-tipo">{ROTULO_MEIO[m.tipo]}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" class="opcao-meio opcao-meio-novo" onClick={aoNovo}>
          <IconPlus size={20} aria-hidden="true" />
          <span class="opcao-meio-nome">Novo cartão</span>
        </button>
      </div>
    </fieldset>
  );
}
