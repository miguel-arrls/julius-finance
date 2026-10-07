import { useState } from 'preact/hooks';
import { desfazerImportacao, importar, lerBackup, resumirBackup } from '../../dados/backup';
import type { ArquivoBackup, JuliusDB } from '../../dados/db';
import { materializarTodas } from '../../dados/repositorio';
import { formatarDataHora } from '../../dominio/datas';
import type { DataISO } from '../../dominio/tipos';
import { lerArquivoTexto } from '../arquivo';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';
import { usarToast } from './Toast';

const dataValida = (s: string) => s !== '' && !Number.isNaN(Date.parse(s));

/** Cria as cobranças que faltam das recorrentes depois de trocar os dados. Uma falha aqui não desfaz a troca. */
export async function materializarSemFalhar(base: JuliusDB, hoje: DataISO): Promise<void> {
  try {
    await materializarTodas(base, hoje);
  } catch (err) {
    console.error(err);
  }
}

export function ImportarBackup({
  estado,
  rotulo = 'Escolher arquivo de backup',
  aoConcluir,
}: {
  estado: Estado;
  rotulo?: string;
  aoConcluir?: () => void;
}) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const [erro, setErro] = useState('');
  const [pendente, setPendente] = useState<ArquivoBackup | null>(null);
  const [importando, setImportando] = useState(false);

  async function escolher(e: Event) {
    setErro('');
    const input = e.currentTarget as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    try {
      const r = lerBackup(await lerArquivoTexto(arquivo));
      input.value = '';
      if (!r.ok) {
        setPendente(null);
        setErro(r.erro);
        return;
      }
      setPendente(r.arquivo);
    } catch (err) {
      console.error(err);
      setPendente(null);
      setErro('Não foi possível ler o arquivo. Tente de novo.');
    }
  }

  async function desfazer() {
    try {
      await desfazerImportacao(base);
      await materializarSemFalhar(base, hoje);
      mostrar('Importação desfeita');
    } catch (err) {
      console.error(err);
      mostrar('Não foi possível desfazer a importação.');
    }
  }

  async function confirmar() {
    if (!pendente) return;
    setImportando(true);
    try {
      await importar(base, pendente);
      await materializarSemFalhar(base, hoje);
      setPendente(null);
      mostrar('Dados importados', { rotulo: 'Desfazer', executar: () => void desfazer() });
      aoConcluir?.();
    } catch (err) {
      console.error(err);
      setErro('Não foi possível importar. Seus dados não foram alterados.');
    } finally {
      setImportando(false);
    }
  }

  const resumo = pendente ? resumirBackup(pendente) : null;
  const ultimaAlteracao = estado.despesas.reduce((max, d) => (d.atualizadaEm > max ? d.atualizadaEm : max), '');
  const temDados = estado.despesas.length > 0;

  return (
    <div>
      <label class="botao">
        {rotulo}
        <input type="file" accept="application/json,.json" class="visualmente-oculto" onChange={(e) => void escolher(e)} />
      </label>
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
      {resumo && (
        <section class="cartao" aria-label="Confirmar importação">
          <p>
            <strong>
              O arquivo tem {plural(resumo.despesas, 'despesa', 'despesas')} e {plural(resumo.lancamentos, 'lançamento', 'lançamentos')}
            </strong>
            {dataValida(resumo.exportadoEm) ? `, exportado em ${formatarDataHora(resumo.exportadoEm)}` : ''}.
          </p>
          {temDados ? (
            <p>
              Seus dados atuais ({plural(estado.despesas.length, 'despesa', 'despesas')}
              {dataValida(ultimaAlteracao) ? `, última alteração em ${formatarDataHora(ultimaAlteracao)}` : ''}) serão substituídos. Você pode
              desfazer logo em seguida.
            </p>
          ) : (
            <p>O app ainda está vazio.</p>
          )}
          <div class="acoes">
            <button type="button" class="botao botao-primario" disabled={importando} onClick={() => void confirmar()}>
              {temDados ? 'Substituir meus dados' : 'Importar'}
            </button>
            <button type="button" class="botao" onClick={() => setPendente(null)}>
              Cancelar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
