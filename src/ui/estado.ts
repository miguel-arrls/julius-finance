import type { RegistroConfig } from '../dados/db';
import type { Cadastros } from '../dominio/resumo';
import type { Lancamento } from '../dominio/tipos';
import { usarConsulta } from './consulta';
import { usarBase } from './contexto';

export interface Estado extends Cadastros {
  lancamentos: Lancamento[];
  config?: RegistroConfig;
}

/** Todos os dados do app, vivos. O volume é pequeno (centenas de registros). */
export function usarEstado(): Estado | undefined {
  const base = usarBase();
  return usarConsulta(async () => {
    const [despesas, lancamentos, categorias, marcas, meios, config] = await Promise.all([
      base.despesas.toArray(),
      base.lancamentos.toArray(),
      base.categorias.orderBy('ordem').toArray(),
      base.marcas.toArray(),
      base.meios.toArray(),
      base.config.get('config'),
    ]);
    marcas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    meios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return { despesas, lancamentos, categorias, marcas, meios, config };
  }, [base]);
}
