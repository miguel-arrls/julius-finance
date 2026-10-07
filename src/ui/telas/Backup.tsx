import { desfazerImportacao, exportar, nomeArquivoBackup, serializar, temImportacaoParaDesfazer } from '../../dados/backup';
import { registrarBackup } from '../../dados/repositorio';
import { formatarDataHora } from '../../dominio/datas';
import { compartilharOuBaixar } from '../arquivo';
import { ImportarBackup } from '../componentes/ImportarBackup';
import { usarToast } from '../componentes/Toast';
import { usarConsulta } from '../consulta';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';

export function Backup({ estado }: { estado: Estado }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const podeDesfazer = usarConsulta(() => temImportacaoParaDesfazer(base), [base]);

  async function exportarJson() {
    try {
      const arquivo = await exportar(base);
      const r = await compartilharOuBaixar(nomeArquivoBackup(hoje), serializar(arquivo), 'application/json');
      if (r === 'cancelado') return;
      await registrarBackup(base, new Date().toISOString());
      mostrar('Backup exportado');
    } catch (err) {
      console.error(err);
      mostrar('Não foi possível exportar o backup. Tente de novo.');
    }
  }

  async function desfazer() {
    try {
      if (await desfazerImportacao(base)) mostrar('Importação desfeita');
    } catch (err) {
      console.error(err);
      mostrar('Não foi possível desfazer a importação.');
    }
  }

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Backup e importação</h1>
      <section class="cartao">
        <h2>Exportar backup</h2>
        <p class="texto-suave">
          Gera um arquivo .json com tudo: despesas, parcelas, histórico, categorias, marcas e logos. No iPhone, salve em Arquivos ou no iCloud Drive.
        </p>
        <p>Último backup: {estado.config?.ultimoBackupEm ? formatarDataHora(estado.config.ultimoBackupEm) : 'nunca'}</p>
        <button type="button" class="botao botao-primario" onClick={() => void exportarJson()}>
          Exportar backup
        </button>
      </section>
      <section class="cartao">
        <h2>Importar backup</h2>
        <p class="texto-suave">Substitui os dados deste aparelho pelos do arquivo. Use para levar os dados do iPhone para o computador, ou o contrário.</p>
        <ImportarBackup estado={estado} />
        {podeDesfazer && (
          <button type="button" class="botao" onClick={() => void desfazer()}>
            Desfazer última importação
          </button>
        )}
      </section>
      <section class="cartao">
        <h2>Planilha</h2>
        <p class="texto-suave">
          A planilha CSV sai da tela <a href="#/lancamentos">Lançamentos</a>, com os filtros que você escolher.
        </p>
      </section>
    </>
  );
}
