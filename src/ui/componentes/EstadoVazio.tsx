import { Icone } from '../icones';

export interface AcaoVazio {
  rotulo: string;
  href?: string;
  onClick?: () => void;
}

export function EstadoVazio({ icone = 'receipt', titulo, texto, acao }: { icone?: string; titulo: string; texto?: string; acao?: AcaoVazio }) {
  return (
    <div class="estado-vazio">
      <span class="estado-vazio-icone">
        <Icone nome={icone} tamanho={32} />
      </span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {acao &&
        (acao.href ? (
          <a class="botao botao-primario" href={acao.href}>
            {acao.rotulo}
          </a>
        ) : (
          <button type="button" class="botao botao-primario" onClick={acao.onClick}>
            {acao.rotulo}
          </button>
        ))}
    </div>
  );
}
