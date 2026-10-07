import { Icone, NOMES_ICONES } from '../icones';

export function SeletorIcone({ valor, aoEscolher }: { valor?: string; aoEscolher: (nome: string) => void }) {
  return (
    <fieldset class="campo">
      <legend class="campo-rotulo">Ícone</legend>
      <div class="grade-icones">
        {NOMES_ICONES.map((nome) => (
          <button key={nome} type="button" aria-label={`Ícone ${nome}`} aria-pressed={valor === nome} onClick={() => aoEscolher(nome)}>
            <Icone nome={nome} tamanho={22} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
