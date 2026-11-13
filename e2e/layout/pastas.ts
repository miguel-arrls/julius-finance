import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Prints da matriz de layout, fora do repositório: C:\VBCODE\julius-finance-prints por padrão
 * (ou JULIUS_PRINTS). Mesma regra em scripts/limpar-prints.py.
 *   referencia/<cenário>/<largura>-<tema>/<tela>.png  prints aprovados
 *   falhas/<execução>/...                             atual, esperado e diferença de cada reprovação
 */
export const PASTA_PRINTS = process.env.JULIUS_PRINTS ?? resolve(fileURLToPath(new URL('../../..', import.meta.url)), 'julius-finance-prints');
