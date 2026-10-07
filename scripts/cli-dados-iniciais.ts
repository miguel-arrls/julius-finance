import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { lerBackup } from '../src/dados/backup';
import { montarBackupInicial, type DefinicaoInicial } from '../src/dados/dadosIniciais';
import { hojeISO } from '../src/dominio/datas';

export const ENTRADA_PADRAO = 'dados-locais/definicao.json';
export const SAIDA_PADRAO = 'dados-locais/contas-iniciais.json';

/** Lê a definição, monta o backup, confere com o mesmo validador do app e grava. 0 = ok, 1 = erro. */
export function main(argv: string[], agora: Date = new Date()): number {
  const entrada = argv[0] ?? ENTRADA_PADRAO;
  const saida = argv[1] ?? SAIDA_PADRAO;
  if (!existsSync(entrada)) {
    console.error(`Arquivo não encontrado: ${entrada}`);
    return 1;
  }
  let def: DefinicaoInicial;
  try {
    def = JSON.parse(readFileSync(entrada, { encoding: 'utf-8' })) as DefinicaoInicial;
  } catch {
    console.error(`JSON inválido: ${entrada}`);
    return 1;
  }
  try {
    const arquivo = montarBackupInicial(def, hojeISO(agora), agora.toISOString());
    const texto = `${JSON.stringify(arquivo, null, 2)}\n`;
    const conferido = lerBackup(texto);
    if (!conferido.ok) {
      console.error(conferido.erro);
      return 1;
    }
    writeFileSync(saida, texto, { encoding: 'utf-8' });
    console.log(`Gerado ${saida}: ${arquivo.dados.despesas.length} despesas, ${arquivo.dados.lancamentos.length} lançamentos.`);
    return 0;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    return 1;
  }
}
