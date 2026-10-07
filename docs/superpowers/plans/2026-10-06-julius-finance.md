# Julius Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA pessoal de controle de gastos (avulsas, parceladas, recorrentes), em pt-BR, com dados só no aparelho, publicada no GitHub Pages e instalável no iPhone.

**Architecture:** SPA estática (Vite + Preact + TypeScript). Lógica de negócio em funções puras (`src/dominio`), persistência no IndexedDB via Dexie (`src/dados`), interface Preact (`src/ui`). Regra de dependência: `ui` → `dados` → `dominio`; `dominio` não importa nada de fora de `dominio`. Rotas por hash.

**Tech Stack:** Node 22, Vite 8, Preact 10, TypeScript 7, Dexie 4, vite-plugin-pwa 2, Vitest 5 + jsdom + fake-indexeddb + Testing Library, Playwright (WebKit), simple-icons (CC0), @tabler/icons-preact.

**Spec:** `docs/superpowers/specs/2026-10-06-julius-finance-design.md` (leia antes de começar qualquer tarefa).

## Global Constraints

- Idioma: código (nomes), textos de interface, mensagens de erro e commits em **pt-BR**. Sentence case. Sem "por favor", sem "com sucesso", sem exclamação.
- Dinheiro: sempre **centavos inteiros** (`Centavos = number`). Nunca `float` para valor.
- Datas: sempre texto `AAAA-MM-DD` (`DataISO`); meses `AAAA-MM` (`MesISO`). **Nunca** `new Date('AAAA-MM-DD')` (é UTC e volta um dia no Brasil). Use as funções de `src/dominio/datas.ts`.
- Formato de moeda exibido: `R$\u00a01.234,56` (espaço não separável após `R$`). Datas exibidas `dd/mm/aaaa`.
- Versões fixadas: `preact@^10.29.8` (**não** usar Preact 11: `@tabler/icons-preact` exige `^10`), `vite@^8.3.3`, `@preact/preset-vite@^2.10.6`, `typescript@^7.0.2`, `dexie@^4.4.6`, `vite-plugin-pwa@^2.0.0`, `@vite-pwa/assets-generator@^2.0.0`, `vitest@^5.0.3`, `jsdom@^30.1.2`, `fake-indexeddb@^6.2.5`, `@testing-library/preact@^3.2.4`, `@testing-library/jest-dom@^7.0.1`, `@playwright/test@^1.63.0`, `simple-icons@^16.34.0`, `@tabler/icons-preact@^3.49.0`, `tsx@^4.23.15`, `@types/node@^22.20.5`.
- Nenhuma chamada de rede além da própria origem. CSP de produção: `connect-src 'self'`.
- `dados-locais/` contém dados pessoais e **nunca** é commitado (já está no `.gitignore`). Nenhum valor real do usuário entra em código, testes ou neste plano.
- Arquivos em UTF-8 com LF (`.gitattributes` já configurado). Scripts Node leem/gravam com `encoding: 'utf-8'`.
- Testes importam `describe/it/expect/vi` de `vitest` explicitamente (sem globals). Fuso dos testes: `America/Sao_Paulo`.
- Alvos de toque ≥ 44 px; todo campo tem rótulo visível; situação sempre escrita (não só cor).
- `base` do Vite: `/julius-finance/`.
- Toda mensagem de commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (após uma linha em branco).
- Rodar comandos a partir de `C:\PROJECT\JuliusFinance`. Shell: Git Bash ou PowerShell.

## Review Focus

1. **Fuso horário** — um vencimento `2026-10-07` precisa aparecer como `07/10/2026` no iPhone em UTC-3, e "hoje" às 22h30 de 06/10 (01h30 UTC de 07/10) é `2026-10-06`. Teste na Task 2 (`hojeISO` com instante UTC fixo; setup força `TZ=America/Sao_Paulo`).
2. **Valor digitado no teclado do iPhone** — `"1.234"`, `"12.5"`, `",5"`, `"R$ 1.000,00"` colado, `"1,2,3"`: o usuário espera R$ 1.234,00, R$ 12,50, R$ 0,50, R$ 1.000,00 e erro. Teste na Task 2 (`lerReais`).
3. **Importar backup antigo por cima de dados mais novos** — o usuário espera ver, antes de confirmar, quantas despesas tem o arquivo e quantas tem hoje, com as datas, e poder desfazer. Teste na Task 15 (painel de confirmação mostra as duas contagens; "Desfazer" restaura).
4. **Toque duplo em "Salvar despesa"** — espera uma despesa só e uma marca só (a marca é criada no salvamento). Teste na Task 12 (dois cliques → 1 despesa e 1 marca).
5. **Armazenamento indisponível** (janela privada, cota cheia) — espera uma mensagem explicando o que fazer, não tela branca. Teste na Task 10 (`base.open()` rejeitado → tela de erro).

## Estrutura de arquivos

```
.github/workflows/publicar.yml        CI: testes → build → verificação → Pages
index.html                            HTML com metas de PWA/iOS
vite.config.ts / vitest.config.ts / tsconfig.json / playwright.config.ts
public/favicon.svg (+ PNGs gerados)   ícones do app
scripts/
  gerar-catalogo-marcas.mjs           gera src/marcas/catalogo.gerado.ts
  cli-dados-iniciais.ts               main(argv) que monta contas-iniciais.json
  gerar-dados-iniciais.ts             executa a CLI
  verificar-build.mjs                 confere CSP, manifest e SW no dist/
src/
  main.tsx                            ponto de entrada
  dominio/                            puro, sem I/O
    tipos.ts  padroes.ts  dinheiro.ts  datas.ts  cartao.ts  situacao.ts
    parcelas.ts  recorrencias.ts  resumo.ts  filtros.ts
  dados/
    db.ts  repositorio.ts  backup.ts  csv.ts  dadosIniciais.ts
  marcas/
    tipos.ts  catalogo.gerado.ts  identificar.ts
  ui/
    estilos.css  App.tsx  Casca.tsx  Provedores.tsx  contexto.ts  rota.ts
    consulta.ts  estado.ts  arquivo.ts  imagem.ts  icones.tsx  textos.ts
    componentes/  Logo.tsx Navegacao.tsx Toast.tsx EstadoVazio.tsx Campo.tsx
                  PilulaSituacao.tsx SeletorMes.tsx LinhaLancamento.tsx ImportarBackup.tsx
    telas/        Inicio.tsx Lancamentos.tsx FormDespesa.tsx formDespesa.ts Despesas.tsx
                  DetalheDespesa.tsx Ajustes.tsx Categorias.tsx Marcas.tsx Meios.tsx
                  Backup.tsx OndeFicamDados.tsx BoasVindas.tsx
tests/                                espelha src/ (dominio/, dados/, marcas/, ui/, scripts/)
  setup.ts  fabricas.ts  ui/auxiliar.tsx
e2e/fluxo.spec.ts                     Playwright WebKit
README.md
```

---
### Task 1: Esqueleto do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `tests/setup.ts`
- Test: `tests/ambiente.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: scripts `npm test`, `npm run build`, `npm run dev`; ambiente de teste com jsdom, `fake-indexeddb/auto`, `@testing-library/jest-dom/vitest` e `TZ=America/Sao_Paulo`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "julius-finance",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "marcas": "node scripts/gerar-catalogo-marcas.mjs",
    "dados-iniciais": "tsx scripts/gerar-dados-iniciais.ts"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install preact@^10.29.8 dexie@^4.4.6 @tabler/icons-preact@^3.49.0
npm install -D vite@^8.3.3 @preact/preset-vite@^2.10.6 typescript@^7.0.2 vitest@^5.0.3 jsdom@^30.1.2 fake-indexeddb@^6.2.5 @testing-library/preact@^3.2.4 @testing-library/jest-dom@^7.0.1 @types/node@^22.20.5 tsx@^4.23.15 simple-icons@^16.34.0
```

Expected: `package-lock.json` criado, sem erro de peer dependency. Se o npm acusar conflito com `preact`, confira que a versão instalada é 10.x (`npm ls preact`).

- [ ] **Step 3: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "scripts", "e2e", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

Se o `tsc` 7 rejeitar alguma opção, troque para `typescript@^5.9` (`npm install -D typescript@^5.9`) e registre isso na mensagem de commit. Não remova `strict` nem `noUncheckedIndexedAccess`.

- [ ] **Step 4: Criar `vite.config.ts` e `vitest.config.ts`**

`vite.config.ts`:

```ts
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

export const CSP = [
  "default-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join('; ');

// A CSP entra só no build: no modo dev o Vite precisa de scripts próprios para o recarregamento.
function csp(): Plugin {
  return {
    name: 'julius-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  base: '/julius-finance/',
  plugins: [preact(), csp()],
});
```

`vitest.config.ts`:

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
    },
  }),
);
```

- [ ] **Step 5: Criar `index.html` e `src/main.tsx`**

`index.html`:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f6f5f2" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Julius" />
    <meta name="format-detection" content="telephone=no" />
    <title>Julius</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx` (provisório; a Task 10 substitui):

```tsx
import { render } from 'preact';

render(<p>Julius</p>, document.getElementById('app')!);
```

- [ ] **Step 6: Escrever o teste de ambiente**

`tests/ambiente.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('ambiente de teste', () => {
  it('usa o fuso de São Paulo', () => {
    // 01:30 UTC de 07/10 ainda é 22:30 de 06/10 em São Paulo.
    expect(new Date(Date.UTC(2026, 9, 7, 1, 30)).getDate()).toBe(6);
  });

  it('tem IndexedDB simulado', () => {
    expect(typeof indexedDB.open).toBe('function');
  });

  it('tem os matchers do jest-dom', () => {
    const p = document.createElement('p');
    p.textContent = 'oi';
    document.body.appendChild(p);
    expect(p).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npx vitest run tests/ambiente.test.ts`
Expected: FAIL — o arquivo de setup não existe (`tests/setup.ts`), então `indexedDB` é indefinido e `toBeInTheDocument` não existe. (O teste do fuso pode passar numa máquina já em UTC-3; no CI, que roda em UTC, ele falharia sem o setup.)

- [ ] **Step 8: Criar `tests/setup.ts`**

```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

process.env.TZ = 'America/Sao_Paulo';
```

- [ ] **Step 9: Rodar testes, tipos e build**

Run: `npx vitest run tests/ambiente.test.ts` → Expected: 3 passed.
Run: `npm run build` → Expected: `tsc` sem erros e `dist/index.html` gerado.
Run: `grep -c "Content-Security-Policy" dist/index.html` → Expected: `1`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/main.tsx tests/setup.ts tests/ambiente.test.ts
git commit -m "chore: esqueleto Vite + Preact + Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tipos, dinheiro e datas

**Files:**
- Create: `src/dominio/tipos.ts`, `src/dominio/dinheiro.ts`, `src/dominio/datas.ts`
- Test: `tests/dominio/dinheiro.test.ts`, `tests/dominio/datas.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (usados por todas as tarefas seguintes):
  - `tipos.ts`: todos os tipos do domínio (abaixo) e `class ErroDominio extends Error`.
  - `dinheiro.ts`: `formatarReais(c: Centavos): string`, `formatarNumero(c: Centavos): string`, `lerReais(texto: string): Centavos | null`, `dividirEmParcelas(total: Centavos, n: number): Centavos[]`.
  - `datas.ts`: `ultimoDiaDoMes(ano, mes): number`, `criarData(ano, mes, dia): DataISO`, `partes(d): {ano, mes, dia}`, `ehDataISO(v): v is DataISO`, `ehMesISO(v): v is MesISO`, `mesDe(d): MesISO`, `dataNoMes(m, dia): DataISO`, `somarMeses(d, n): DataISO`, `somarMesesAoMes(m, n): MesISO`, `somarDias(d, n): DataISO`, `diferencaEmDias(de, ate): number`, `ultimoDia(m): DataISO`, `hojeISO(agora?: Date): DataISO`, `formatarData(d)`, `formatarDataCurta(d)`, `formatarDataHora(instanteISO)`, `formatarMes(m)`, `formatarMesCurto(m)`, `formatarMesCsv(m)`.

- [ ] **Step 1: Criar `src/dominio/tipos.ts`** (só tipos; validado pelo `tsc`)

```ts
export type Centavos = number;
/** Data no formato 'AAAA-MM-DD', sem fuso. */
export type DataISO = string;
/** Mês no formato 'AAAA-MM'. */
export type MesISO = string;

export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDominio';
  }
}

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  ordem: number;
}

export interface Marca {
  id: string;
  nome: string;
  apelidos: string[];
  cor?: string;
  icone?: string;
  /** Chave do catálogo embutido (simple-icons). */
  logoSlug?: string;
  /** Imagem enviada pelo usuário, como data URL. */
  logoImagem?: string;
}

export type TipoMeio = 'credito' | 'debito' | 'pix' | 'boleto' | 'dinheiro' | 'outro';

export interface MeioPagamento {
  id: string;
  nome: string;
  tipo: TipoMeio;
  diaFechamento?: number;
  diaVencimento?: number;
}

export type TipoDespesa = 'avulsa' | 'parcelada' | 'recorrente';

export type CampoAConfirmar =
  | 'vencimento'
  | 'loja'
  | 'valor'
  | 'valorTotal'
  | 'categoria'
  | 'dataCompra'
  | 'meioPagamento';

interface DespesaBase {
  id: string;
  descricao: string;
  categoriaId: string;
  marcaId?: string;
  meioPagamentoId?: string;
  dataCompra?: DataISO;
  observacoes: string;
  aConfirmar: CampoAConfirmar[];
  criadaEm: string;
  atualizadaEm: string;
}

export interface DespesaAvulsa extends DespesaBase {
  tipo: 'avulsa';
  valor: Centavos;
  vencimento?: DataISO;
  /** Mês em que conta nos totais; igual ao mês do vencimento quando ele existe. */
  mes: MesISO;
}

export interface DespesaParcelada extends DespesaBase {
  tipo: 'parcelada';
  valorTotal: Centavos;
  numParcelas: number;
  valorParcela?: Centavos;
  /** Vencimento da parcela `comecaNaParcela`. */
  primeiroVencimento?: DataISO;
  /** Mês da parcela `comecaNaParcela` quando não há vencimento. */
  mesPrimeira: MesISO;
  comecaNaParcela: number;
}

export type Frequencia = 'mensal' | 'semanal' | 'anual';

export interface Pausa {
  de: DataISO;
  /** Data da retomada (exclusiva). Ausente = ainda pausada. */
  ate?: DataISO;
}

export interface DespesaRecorrente extends DespesaBase {
  tipo: 'recorrente';
  valor: Centavos;
  valorVariavel: boolean;
  frequencia: Frequencia;
  /** Data da primeira cobrança; o dia dela define o dia das seguintes. */
  inicio: DataISO;
  fim?: DataISO;
  pausas: Pausa[];
}

export type Despesa = DespesaAvulsa | DespesaParcelada | DespesaRecorrente;

export interface Lancamento {
  id: string;
  despesaId: string;
  numero?: number;
  chavePeriodo?: string;
  mes: MesISO;
  dataCobranca?: DataISO;
  vencimento?: DataISO;
  valor: Centavos;
  estimado: boolean;
  pagoEm?: DataISO;
  valorPago?: Centavos;
}

export type Situacao = 'paga' | 'pendente' | 'atrasada' | 'sem-vencimento';

export type AcaoHistorico =
  | 'criada'
  | 'editada'
  | 'paga'
  | 'pagamento desfeito'
  | 'pausada'
  | 'retomada'
  | 'encerrada'
  | 'importada';

export interface Mudanca {
  campo: string;
  de: unknown;
  para: unknown;
}

export interface RegistroHistorico {
  id: string;
  despesaId: string;
  lancamentoId?: string;
  quando: string;
  acao: AcaoHistorico;
  mudancas: Mudanca[];
}

export interface Configuracao {
  versaoEsquema: number;
  ultimoBackupEm?: string;
}

/** Resultado de regerar lançamentos: o que gravar e quais IDs apagar. */
export interface Mudancas {
  salvar: Lancamento[];
  remover: string[];
}
```

- [ ] **Step 2: Escrever os testes de dinheiro**

`tests/dominio/dinheiro.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dividirEmParcelas, formatarNumero, formatarReais, lerReais } from '../../src/dominio/dinheiro';

describe('formatarReais', () => {
  it.each([
    [123456, 'R$ 1.234,56'],
    [5, 'R$ 0,05'],
    [0, 'R$ 0,00'],
    [-500, '-R$ 5,00'],
    [100000000, 'R$ 1.000.000,00'],
  ])('%i → %s', (centavos, esperado) => {
    expect(formatarReais(centavos)).toBe(esperado);
  });
});

describe('formatarNumero', () => {
  it('formata sem símbolo, para campos de edição', () => {
    expect(formatarNumero(123456)).toBe('1.234,56');
    expect(formatarNumero(590)).toBe('5,90');
  });
});

describe('lerReais', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['R$ 12,3', 1230],
    ['12.5', 1250],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['1234', 123400],
    [',5', 50],
    ['0', 0],
    [' R$ 1.000,00 ', 100000],
  ])('"%s" → %i centavos', (texto, esperado) => {
    expect(lerReais(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '-5', '1,2,3', '12,345', '1.23.4', '12a'])('"%s" é inválido', (texto) => {
    expect(lerReais(texto)).toBeNull();
  });
});

describe('dividirEmParcelas', () => {
  it('põe os centavos restantes na 1ª parcela', () => {
    expect(dividirEmParcelas(100000, 3)).toEqual([33334, 33333, 33333]);
  });

  it('divide exato quando possível', () => {
    expect(dividirEmParcelas(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it('a soma das parcelas é sempre igual ao total', () => {
    for (let total = 1; total <= 500; total += 7) {
      for (let n = 1; n <= 12; n++) {
        const soma = dividirEmParcelas(total, n).reduce((a, b) => a + b, 0);
        expect(soma).toBe(total);
      }
    }
  });
});
```

- [ ] **Step 3: Escrever os testes de datas**

`tests/dominio/datas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  criarData,
  dataNoMes,
  diferencaEmDias,
  ehDataISO,
  ehMesISO,
  formatarData,
  formatarDataCurta,
  formatarDataHora,
  formatarMes,
  formatarMesCsv,
  formatarMesCurto,
  hojeISO,
  mesDe,
  somarDias,
  somarMeses,
  somarMesesAoMes,
  ultimoDia,
} from '../../src/dominio/datas';

describe('somarMeses', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-01-31', 2, '2026-03-31'],
    ['2026-12-15', 1, '2027-01-15'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2024-02-29', 12, '2025-02-28'],
  ])('%s + %i meses = %s', (data, n, esperado) => {
    expect(somarMeses(data, n)).toBe(esperado);
  });
});

describe('somarDias e diferencaEmDias', () => {
  it('atravessa a virada de ano', () => {
    expect(somarDias('2026-12-28', 7)).toBe('2027-01-04');
  });
  it('volta para fevereiro', () => {
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('conta dias entre datas', () => {
    expect(diferencaEmDias('2026-10-06', '2026-10-08')).toBe(2);
    expect(diferencaEmDias('2026-10-06', '2027-10-31')).toBe(390);
  });
});

describe('meses', () => {
  it('mesDe, somarMesesAoMes, ultimoDia e dataNoMes', () => {
    expect(mesDe('2026-10-07')).toBe('2026-10');
    expect(somarMesesAoMes('2026-12', 1)).toBe('2027-01');
    expect(somarMesesAoMes('2026-01', -1)).toBe('2025-12');
    expect(ultimoDia('2026-02')).toBe('2026-02-28');
    expect(dataNoMes('2026-04', 31)).toBe('2026-04-30');
  });
});

describe('validação', () => {
  it.each([
    ['2026-02-29', false],
    ['2028-02-29', true],
    ['2026-13-01', false],
    ['26-01-01', false],
    ['2026-1-01', false],
    [123, false],
  ])('ehDataISO(%s) = %s', (valor, esperado) => {
    expect(ehDataISO(valor)).toBe(esperado);
  });

  it('ehMesISO', () => {
    expect(ehMesISO('2026-10')).toBe(true);
    expect(ehMesISO('2026-00')).toBe(false);
    expect(ehMesISO('2026-10-01')).toBe(false);
  });

  it('criarData ajusta o dia ao fim do mês', () => {
    expect(criarData(2026, 2, 30)).toBe('2026-02-28');
  });
});

describe('hojeISO', () => {
  it('usa o dia local, não o dia UTC', () => {
    // 01:30 UTC de 07/10 = 22:30 de 06/10 em São Paulo.
    expect(hojeISO(new Date(Date.UTC(2026, 9, 7, 1, 30)))).toBe('2026-10-06');
  });
});

describe('formatação', () => {
  it('datas e meses em pt-BR', () => {
    expect(formatarData('2026-10-07')).toBe('07/10/2026');
    expect(formatarDataCurta('2026-10-07')).toBe('07/10');
    expect(formatarMes('2026-10')).toBe('outubro de 2026');
    expect(formatarMes('2026-03')).toBe('março de 2026');
    expect(formatarMesCurto('2026-03')).toBe('mar/2026');
    expect(formatarMesCsv('2026-03')).toBe('03/2026');
  });

  it('data e hora de um instante, no fuso local', () => {
    expect(formatarDataHora('2026-10-07T01:30:00.000Z')).toBe('06/10/2026 22:30');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/dominio`
Expected: FAIL — `Failed to resolve import "../../src/dominio/dinheiro"` e `.../datas`.

- [ ] **Step 5: Implementar `src/dominio/dinheiro.ts`**

```ts
import type { Centavos } from './tipos';

function separarMilhar(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** '1.234,56' — para campos de edição. */
export function formatarNumero(c: Centavos): string {
  const abs = Math.abs(c);
  const sinal = c < 0 ? '-' : '';
  return `${sinal}${separarMilhar(Math.floor(abs / 100))},${String(abs % 100).padStart(2, '0')}`;
}

/** 'R$ 1.234,56' com espaço não separável. */
export function formatarReais(c: Centavos): string {
  return `${c < 0 ? '-' : ''}R$ ${formatarNumero(Math.abs(c))}`;
}

/**
 * Lê um valor digitado em reais. Aceita '1.234,56', '1234,56', '12.5', '1.234' (milhar),
 * 'R$ 10,00'. Devolve null para texto inválido ou negativo.
 */
export function lerReais(texto: string): Centavos | null {
  const s = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '' || !/^[\d.,]+$/.test(s)) return null;

  let inteiro: string;
  let decimal = '';
  if (s.includes(',')) {
    const partes = s.split(',');
    if (partes.length !== 2) return null;
    inteiro = partes[0]!;
    decimal = partes[1]!;
    if (inteiro.includes('.')) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(inteiro)) return null;
      inteiro = inteiro.replace(/\./g, '');
    }
  } else if (s.includes('.')) {
    const partes = s.split('.');
    if (partes.length === 2 && partes[1]!.length <= 2) {
      inteiro = partes[0]!;
      decimal = partes[1]!;
    } else {
      if (!/^\d{1,3}(\.\d{3})+$/.test(s)) return null;
      inteiro = s.replace(/\./g, '');
    }
  } else {
    inteiro = s;
  }

  if (inteiro === '') inteiro = '0';
  if (!/^\d+$/.test(inteiro) || !/^\d{0,2}$/.test(decimal)) return null;
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
}

/** Divide um total em n parcelas; os centavos restantes vão para a 1ª. */
export function dividirEmParcelas(total: Centavos, n: number): Centavos[] {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base));
}
```

- [ ] **Step 6: Implementar `src/dominio/datas.ts`**

```ts
import type { DataISO, MesISO } from './tipos';

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

const p2 = (n: number): string => String(n).padStart(2, '0');

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Cria uma data; dia maior que o mês é ajustado para o último dia. */
export function criarData(ano: number, mes: number, dia: number): DataISO {
  const d = Math.min(dia, ultimoDiaDoMes(ano, mes));
  return `${String(ano).padStart(4, '0')}-${p2(mes)}-${p2(d)}`;
}

export function partes(data: DataISO): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split('-').map(Number);
  return { ano: ano!, mes: mes!, dia: dia! };
}

export function ehDataISO(valor: unknown): valor is DataISO {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const { ano, mes, dia } = partes(valor);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= ultimoDiaDoMes(ano, mes);
}

export function ehMesISO(valor: unknown): valor is MesISO {
  return typeof valor === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7);
}

export function dataNoMes(mes: MesISO, dia: number): DataISO {
  const [ano, m] = mes.split('-').map(Number);
  return criarData(ano!, m!, dia);
}

/** Soma meses mantendo o dia original, ajustado ao fim de meses curtos. */
export function somarMeses(data: DataISO, n: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const total = ano * 12 + (mes - 1) + n;
  return criarData(Math.floor(total / 12), (total % 12) + 1, dia);
}

export function somarMesesAoMes(mes: MesISO, n: number): MesISO {
  return mesDe(somarMeses(`${mes}-01`, n));
}

export function somarDias(data: DataISO, n: number): DataISO {
  const { ano, mes, dia } = partes(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return criarData(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function diferencaEmDias(de: DataISO, ate: DataISO): number {
  const a = partes(de);
  const b = partes(ate);
  return Math.round((Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / 86_400_000);
}

export function ultimoDia(mes: MesISO): DataISO {
  return dataNoMes(mes, 31);
}

/** Data de hoje no fuso do aparelho. */
export function hojeISO(agora: Date = new Date()): DataISO {
  return criarData(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

export function formatarData(data: DataISO): string {
  const { ano, mes, dia } = partes(data);
  return `${p2(dia)}/${p2(mes)}/${ano}`;
}

export function formatarDataCurta(data: DataISO): string {
  const { mes, dia } = partes(data);
  return `${p2(dia)}/${p2(mes)}`;
}

/** Instante ISO completo (com hora e fuso) → 'dd/mm/aaaa hh:mm' no fuso local. */
export function formatarDataHora(instante: string): string {
  const d = new Date(instante);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function formatarMes(mes: MesISO): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m! - 1]} de ${ano}`;
}

export function formatarMesCurto(mes: MesISO): string {
  const [ano, m] = mes.split('-').map(Number);
  return `${MESES[m! - 1]!.slice(0, 3)}/${ano}`;
}

export function formatarMesCsv(mes: MesISO): string {
  const [ano, m] = mes.split('-');
  return `${m}/${ano}`;
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/dominio` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/dominio tests/dominio
git commit -m "feat(dominio): tipos, dinheiro em centavos e datas sem fuso" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Padrões, regra do cartão e situação

**Files:**
- Create: `src/dominio/padroes.ts`, `src/dominio/cartao.ts`, `src/dominio/situacao.ts`, `tests/fabricas.ts`
- Test: `tests/dominio/cartao.test.ts`, `tests/dominio/situacao.test.ts`

**Interfaces:**
- Consumes: `tipos.ts`, `datas.ts` (Task 2).
- Produces:
  - `CATEGORIAS_PADRAO: Categoria[]` (IDs `cat-moradia`, `cat-alimentacao`, `cat-transporte`, `cat-saude`, `cat-compras`, `cat-lazer`, `cat-assinaturas`, `cat-telefone-internet`, `cat-outros`).
  - `vencimentoNoCartao(dataCobranca: DataISO, diaFechamento: number, diaVencimento: number): DataISO`.
  - `situacao(l: Lancamento, hoje: DataISO): Situacao`.
  - `tests/fabricas.ts`: `avulsa(o?)`, `parcelada(o?)`, `recorrente(o?)`, `CARTAO`, `PIX`, `lanc(o)`.

- [ ] **Step 1: Criar `src/dominio/padroes.ts`**

```ts
import type { Categoria } from './tipos';

/** Categorias iniciais; o usuário pode editar e remover. Ícones = chaves de src/ui/icones.tsx. */
export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: 'cat-moradia', nome: 'Moradia', cor: '#B45309', icone: 'home', ordem: 1 },
  { id: 'cat-alimentacao', nome: 'Alimentação', cor: '#C2410C', icone: 'tools-kitchen-2', ordem: 2 },
  { id: 'cat-transporte', nome: 'Transporte', cor: '#1D4ED8', icone: 'car', ordem: 3 },
  { id: 'cat-saude', nome: 'Saúde', cor: '#047857', icone: 'heartbeat', ordem: 4 },
  { id: 'cat-compras', nome: 'Compras', cor: '#BE185D', icone: 'shopping-bag', ordem: 5 },
  { id: 'cat-lazer', nome: 'Lazer', cor: '#7C3AED', icone: 'confetti', ordem: 6 },
  { id: 'cat-assinaturas', nome: 'Assinaturas', cor: '#4338CA', icone: 'repeat', ordem: 7 },
  { id: 'cat-telefone-internet', nome: 'Telefone/Internet', cor: '#0E7490', icone: 'device-mobile', ordem: 8 },
  { id: 'cat-outros', nome: 'Outros', cor: '#57534E', icone: 'dots', ordem: 9 },
];
```

- [ ] **Step 2: Criar `tests/fabricas.ts`** (dados sintéticos para todos os testes)

```ts
import type { DespesaAvulsa, DespesaParcelada, DespesaRecorrente, Lancamento, MeioPagamento } from '../src/dominio/tipos';

const BASE = {
  descricao: 'Despesa teste',
  categoriaId: 'cat-outros',
  observacoes: '',
  aConfirmar: [],
  criadaEm: '2026-10-01T12:00:00.000Z',
  atualizadaEm: '2026-10-01T12:00:00.000Z',
};

export function avulsa(o: Partial<DespesaAvulsa> = {}): DespesaAvulsa {
  return { id: 'av1', tipo: 'avulsa', ...BASE, valor: 10000, vencimento: '2026-10-10', mes: '2026-10', ...o };
}

export function parcelada(o: Partial<DespesaParcelada> = {}): DespesaParcelada {
  return {
    id: 'pa1',
    tipo: 'parcelada',
    ...BASE,
    valorTotal: 100000,
    numParcelas: 3,
    primeiroVencimento: '2026-11-10',
    mesPrimeira: '2026-11',
    comecaNaParcela: 1,
    ...o,
  };
}

export function recorrente(o: Partial<DespesaRecorrente> = {}): DespesaRecorrente {
  return {
    id: 're1',
    tipo: 'recorrente',
    ...BASE,
    valor: 3990,
    valorVariavel: false,
    frequencia: 'mensal',
    inicio: '2026-10-08',
    pausas: [],
    ...o,
  };
}

export const CARTAO: MeioPagamento = { id: 'mp-cartao', nome: 'Cartão Teste', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 };
export const PIX: MeioPagamento = { id: 'mp-pix', nome: 'Pix', tipo: 'pix' };

export function lanc(o: Partial<Lancamento> & { id: string; despesaId: string }): Lancamento {
  return { mes: '2026-10', valor: 1000, estimado: false, ...o };
}
```

- [ ] **Step 3: Escrever os testes**

`tests/dominio/cartao.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { vencimentoNoCartao } from '../../src/dominio/cartao';

describe('vencimentoNoCartao (fecha dia 2, vence dia 7)', () => {
  it.each([
    ['2026-10-01', '2026-10-07'], // antes do fechamento: fatura que fecha em 02/10
    ['2026-10-02', '2026-11-07'], // no dia do fechamento: fatura seguinte (regra confirmada)
    ['2026-10-08', '2026-11-07'],
    ['2026-11-01', '2026-11-07'],
    ['2026-12-15', '2027-01-07'], // virada de ano
  ])('cobrança em %s vence em %s', (cobranca, esperado) => {
    expect(vencimentoNoCartao(cobranca, 2, 7)).toBe(esperado);
  });
});

describe('vencimentoNoCartao com vencimento antes do fechamento no mês (fecha 25, vence 5)', () => {
  it('vence no mês seguinte ao fechamento', () => {
    expect(vencimentoNoCartao('2026-10-10', 25, 5)).toBe('2026-11-05');
    expect(vencimentoNoCartao('2026-10-26', 25, 5)).toBe('2026-12-05');
  });
});

describe('vencimentoNoCartao com fechamento no dia 31', () => {
  it('fevereiro fecha no dia 28', () => {
    expect(vencimentoNoCartao('2026-02-15', 31, 10)).toBe('2026-03-10');
  });
  it('cobrança no último dia de fevereiro é o dia do fechamento: vai para a seguinte', () => {
    expect(vencimentoNoCartao('2026-02-28', 31, 10)).toBe('2026-04-10');
  });
});
```

`tests/dominio/situacao.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { situacao } from '../../src/dominio/situacao';
import { lanc } from '../fabricas';

const HOJE = '2026-10-06';

describe('situacao', () => {
  it('paga quando tem data de pagamento, mesmo vencida', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-09-01', pagoEm: '2026-09-02' }), HOJE)).toBe('paga');
  });
  it('sem vencimento nunca é atrasada', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd' }), HOJE)).toBe('sem-vencimento');
  });
  it('atrasada quando o vencimento já passou', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-05' }), HOJE)).toBe('atrasada');
  });
  it('pendente quando vence hoje ou depois', () => {
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-06' }), HOJE)).toBe('pendente');
    expect(situacao(lanc({ id: 'a', despesaId: 'd', vencimento: '2026-10-07' }), HOJE)).toBe('pendente');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/dominio/cartao.test.ts tests/dominio/situacao.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/dominio/cartao"` e `.../situacao`.

- [ ] **Step 5: Implementar `src/dominio/cartao.ts`**

```ts
import { dataNoMes, mesDe, somarMesesAoMes } from './datas';
import type { DataISO } from './tipos';

/**
 * Vencimento da fatura em que cai uma cobrança.
 * Cobrança antes do fechamento do mês → fatura que fecha neste mês.
 * Cobrança no dia do fechamento ou depois → fatura que fecha no mês seguinte.
 * O vencimento é o primeiro dia `diaVencimento` depois do fechamento.
 */
export function vencimentoNoCartao(dataCobranca: DataISO, diaFechamento: number, diaVencimento: number): DataISO {
  const mesCobranca = mesDe(dataCobranca);
  let fechamento = dataNoMes(mesCobranca, diaFechamento);
  if (dataCobranca >= fechamento) {
    fechamento = dataNoMes(somarMesesAoMes(mesCobranca, 1), diaFechamento);
  }
  const mesFechamento = mesDe(fechamento);
  let vencimento = dataNoMes(mesFechamento, diaVencimento);
  if (vencimento <= fechamento) {
    vencimento = dataNoMes(somarMesesAoMes(mesFechamento, 1), diaVencimento);
  }
  return vencimento;
}
```

- [ ] **Step 6: Implementar `src/dominio/situacao.ts`**

```ts
import type { DataISO, Lancamento, Situacao } from './tipos';

/** Situação calculada; nunca é gravada. */
export function situacao(l: Lancamento, hoje: DataISO): Situacao {
  if (l.pagoEm) return 'paga';
  if (!l.vencimento) return 'sem-vencimento';
  return l.vencimento < hoje ? 'atrasada' : 'pendente';
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/dominio` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/dominio tests/dominio tests/fabricas.ts
git commit -m "feat(dominio): categorias padrão, vencimento no cartão e situação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Parcelas e despesa avulsa

**Files:**
- Create: `src/dominio/parcelas.ts`
- Modify: `tests/fabricas.ts` (adicionar `aplicar` e `esperarErroDominio`)
- Test: `tests/dominio/parcelas.test.ts`

**Interfaces:**
- Consumes: `dividirEmParcelas` (Task 2), `mesDe`, `somarMeses`, `somarMesesAoMes` (Task 2), tipos.
- Produces:
  - `MAX_PARCELAS = 120`
  - `idParcela(despesaId: string, numero: number): string` → `"{despesaId}#{numero}"`
  - `valoresDasParcelas(d: DespesaParcelada): Centavos[]` (índice 0 = parcela 1)
  - `diferencaParcelas(d: DespesaParcelada): Centavos`
  - `gerarParcelas(d: DespesaParcelada): Lancamento[]`
  - `regerarParcelas(d: DespesaParcelada, existentes: Lancamento[]): Mudancas` (lança `ErroDominio`)
  - `gerarAvulsa(d: DespesaAvulsa): Lancamento` (ID `"{id}#1"`)
  - `regerarAvulsa(d: DespesaAvulsa, existentes: Lancamento[]): Mudancas`

- [ ] **Step 1: Adicionar auxiliares ao fim de `tests/fabricas.ts`**

```ts
import { expect } from 'vitest';
import { ErroDominio, type Mudancas } from '../src/dominio/tipos';

/** Aplica Mudancas a uma lista, como o repositório faz (remove, depois grava). */
export function aplicar(atual: Lancamento[], m: Mudancas): Lancamento[] {
  const mapa = new Map(atual.map((l) => [l.id, l]));
  m.remover.forEach((id) => mapa.delete(id));
  m.salvar.forEach((l) => mapa.set(l.id, l));
  return [...mapa.values()].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.id.localeCompare(b.id));
}

/** Garante que fn lança ErroDominio com exatamente esta mensagem. */
export function esperarErroDominio(fn: () => unknown, mensagem: string): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe(mensagem);
    return;
  }
  throw new Error(`Era esperado ErroDominio: ${mensagem}`);
}
```

Junte os imports novos aos já existentes no topo do arquivo (um único `import type { ... }` de `../src/dominio/tipos` mais o `import { ErroDominio }`).

- [ ] **Step 2: Escrever os testes**

`tests/dominio/parcelas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { diferencaParcelas, gerarAvulsa, gerarParcelas, regerarAvulsa, regerarParcelas } from '../../src/dominio/parcelas';
import type { Lancamento } from '../../src/dominio/tipos';
import { aplicar, avulsa, esperarErroDominio, parcelada } from '../fabricas';

const pagar = (l: Lancamento, pagoEm = '2026-11-09'): Lancamento => ({ ...l, pagoEm, valorPago: l.valor });

describe('gerarParcelas', () => {
  it('gera parcelas com IDs fixos, centavos na 1ª e vencimentos mensais', () => {
    expect(gerarParcelas(parcelada()).map((l) => [l.id, l.numero, l.valor, l.vencimento, l.mes])).toEqual([
      ['pa1#1', 1, 33334, '2026-11-10', '2026-11'],
      ['pa1#2', 2, 33333, '2026-12-10', '2026-12'],
      ['pa1#3', 3, 33333, '2027-01-10', '2027-01'],
    ]);
  });

  it('usa o valor da parcela quando informado e calcula a diferença', () => {
    const d = parcelada({ valorParcela: 35000 });
    expect(gerarParcelas(d).map((l) => l.valor)).toEqual([35000, 35000, 35000]);
    expect(diferencaParcelas(d)).toBe(5000);
    expect(diferencaParcelas(parcelada())).toBe(0);
  });

  it('compra em andamento: gera só a partir da parcela informada, sem inventar vencimento', () => {
    const d = parcelada({
      numParcelas: 12,
      comecaNaParcela: 11,
      valorParcela: 45000,
      valorTotal: 540000,
      primeiroVencimento: undefined,
      mesPrimeira: '2026-10',
    });
    expect(gerarParcelas(d).map((l) => [l.id, l.mes, l.vencimento, l.valor])).toEqual([
      ['pa1#11', '2026-10', undefined, 45000],
      ['pa1#12', '2026-11', undefined, 45000],
    ]);
  });

  it('vencimento no dia 31 acompanha o fim de cada mês', () => {
    expect(gerarParcelas(parcelada({ primeiroVencimento: '2026-01-31' })).map((l) => l.vencimento)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it.each([
    [{ numParcelas: 0 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ numParcelas: 2.5 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ numParcelas: 121 }, 'O número de parcelas deve estar entre 1 e 120.'],
    [{ comecaNaParcela: 4 }, 'A parcela inicial deve estar entre 1 e 3.'],
    [{ valorTotal: 0 }, 'Informe um valor maior que zero.'],
  ])('rejeita %o', (o, mensagem) => {
    esperarErroDominio(() => gerarParcelas(parcelada(o)), mensagem);
  });
});

describe('regerarParcelas', () => {
  it('editar o total recalcula só as parcelas não pagas', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    const m = regerarParcelas(parcelada({ valorTotal: 120000 }), atual);
    expect(m.salvar.map((l) => [l.id, l.valor])).toEqual([
      ['pa1#2', 40000],
      ['pa1#3', 40000],
    ]);
    expect(m.remover).toEqual([]);
    const final = aplicar(atual, m);
    expect(final[0]).toEqual(atual[0]);
    expect(final).toHaveLength(3);
  });

  it('reduzir parcelas remove só as não pagas excedentes', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    const m = regerarParcelas(parcelada({ numParcelas: 2 }), atual);
    expect(m.remover).toEqual(['pa1#3']);
    expect(m.salvar.map((l) => [l.id, l.valor])).toEqual([['pa1#2', 50000]]);
  });

  it('aumentar parcelas cria as novas', () => {
    const atual = gerarParcelas(parcelada());
    const final = aplicar(atual, regerarParcelas(parcelada({ numParcelas: 5 }), atual));
    expect(final.map((l) => l.id)).toEqual(['pa1#1', 'pa1#2', 'pa1#3', 'pa1#4', 'pa1#5']);
  });

  it('bloqueia reduzir abaixo de uma parcela paga', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [...inicial.slice(0, 2), pagar(inicial[2]!)];
    esperarErroDominio(
      () => regerarParcelas(parcelada({ numParcelas: 2 }), atual),
      'Já existe pagamento na parcela 3. O número de parcelas não pode ser menor que 3.',
    );
  });

  it('bloqueia começar depois de uma parcela paga', () => {
    const inicial = gerarParcelas(parcelada());
    const atual = [pagar(inicial[0]!), ...inicial.slice(1)];
    esperarErroDominio(
      () => regerarParcelas(parcelada({ comecaNaParcela: 2 }), atual),
      'A parcela 1 já foi paga. "Começa na parcela" não pode ser maior que 1.',
    );
  });

  it('regerar duas vezes não duplica nem muda nada', () => {
    const primeira = aplicar([], regerarParcelas(parcelada(), []));
    const segunda = aplicar(primeira, regerarParcelas(parcelada(), primeira));
    expect(segunda).toEqual(primeira);
    expect(segunda).toHaveLength(3);
  });
});

describe('despesa avulsa', () => {
  it('gera um lançamento no mês do vencimento', () => {
    expect(gerarAvulsa(avulsa())).toEqual({
      id: 'av1#1',
      despesaId: 'av1',
      mes: '2026-10',
      vencimento: '2026-10-10',
      valor: 10000,
      estimado: false,
    });
  });

  it('sem vencimento usa o mês informado', () => {
    expect(gerarAvulsa(avulsa({ vencimento: undefined, mes: '2026-12' })).mes).toBe('2026-12');
  });

  it('editar mantém o pagamento', () => {
    const paga = { ...gerarAvulsa(avulsa()), pagoEm: '2026-10-09', valorPago: 10000 };
    const m = regerarAvulsa(avulsa({ valor: 12000 }), [paga]);
    expect(m.salvar).toEqual([{ ...paga, valor: 12000 }]);
    expect(m.remover).toEqual([]);
  });

  it('rejeita valor zero', () => {
    esperarErroDominio(() => gerarAvulsa(avulsa({ valor: 0 })), 'Informe um valor maior que zero.');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/dominio/parcelas.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/dominio/parcelas"`.

- [ ] **Step 4: Implementar `src/dominio/parcelas.ts`**

```ts
import { mesDe, somarMeses, somarMesesAoMes } from './datas';
import { dividirEmParcelas } from './dinheiro';
import {
  ErroDominio,
  type Centavos,
  type DespesaAvulsa,
  type DespesaParcelada,
  type Lancamento,
  type Mudancas,
} from './tipos';

export const MAX_PARCELAS = 120;

export function idParcela(despesaId: string, numero: number): string {
  return `${despesaId}#${numero}`;
}

function validarParcelada(d: DespesaParcelada): void {
  if (!Number.isInteger(d.numParcelas) || d.numParcelas < 1 || d.numParcelas > MAX_PARCELAS) {
    throw new ErroDominio(`O número de parcelas deve estar entre 1 e ${MAX_PARCELAS}.`);
  }
  if (!Number.isInteger(d.comecaNaParcela) || d.comecaNaParcela < 1 || d.comecaNaParcela > d.numParcelas) {
    throw new ErroDominio(`A parcela inicial deve estar entre 1 e ${d.numParcelas}.`);
  }
  const valor = d.valorParcela ?? d.valorTotal;
  if (!Number.isInteger(valor) || valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
}

export function valoresDasParcelas(d: DespesaParcelada): Centavos[] {
  if (d.valorParcela !== undefined) return Array.from({ length: d.numParcelas }, () => d.valorParcela!);
  return dividirEmParcelas(d.valorTotal, d.numParcelas);
}

/** Quanto a soma das parcelas informadas passa do total (juros, por exemplo). */
export function diferencaParcelas(d: DespesaParcelada): Centavos {
  return d.valorParcela === undefined ? 0 : d.valorParcela * d.numParcelas - d.valorTotal;
}

export function gerarParcelas(d: DespesaParcelada): Lancamento[] {
  validarParcelada(d);
  const valores = valoresDasParcelas(d);
  const parcelas: Lancamento[] = [];
  for (let numero = d.comecaNaParcela; numero <= d.numParcelas; numero++) {
    const deslocamento = numero - d.comecaNaParcela;
    const vencimento = d.primeiroVencimento ? somarMeses(d.primeiroVencimento, deslocamento) : undefined;
    parcelas.push({
      id: idParcela(d.id, numero),
      despesaId: d.id,
      numero,
      mes: vencimento ? mesDe(vencimento) : somarMesesAoMes(d.mesPrimeira, deslocamento),
      vencimento,
      valor: valores[numero - 1]!,
      estimado: false,
    });
  }
  return parcelas;
}

/** Recalcula as parcelas após uma edição sem tocar nas pagas e sem duplicar. */
export function regerarParcelas(d: DespesaParcelada, existentes: Lancamento[]): Mudancas {
  validarParcelada(d);
  const pagas = existentes.filter((l) => l.pagoEm);
  if (pagas.length > 0) {
    const numeros = pagas.map((l) => l.numero ?? 0);
    const maior = Math.max(...numeros);
    if (maior > d.numParcelas) {
      throw new ErroDominio(`Já existe pagamento na parcela ${maior}. O número de parcelas não pode ser menor que ${maior}.`);
    }
    const menor = Math.min(...numeros);
    if (menor < d.comecaNaParcela) {
      throw new ErroDominio(`A parcela ${menor} já foi paga. "Começa na parcela" não pode ser maior que ${menor}.`);
    }
  }
  const idsPagos = new Set(pagas.map((l) => l.id));
  const novas = gerarParcelas(d);
  const idsNovos = new Set(novas.map((l) => l.id));
  return {
    salvar: novas.filter((l) => !idsPagos.has(l.id)),
    remover: existentes.filter((l) => !l.pagoEm && !idsNovos.has(l.id)).map((l) => l.id),
  };
}

export function gerarAvulsa(d: DespesaAvulsa): Lancamento {
  if (!Number.isInteger(d.valor) || d.valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
  return {
    id: `${d.id}#1`,
    despesaId: d.id,
    mes: d.vencimento ? mesDe(d.vencimento) : d.mes,
    vencimento: d.vencimento,
    valor: d.valor,
    estimado: false,
  };
}

export function regerarAvulsa(d: DespesaAvulsa, existentes: Lancamento[]): Mudancas {
  const nova = gerarAvulsa(d);
  const anterior = existentes.find((l) => l.id === nova.id);
  const salvar = anterior?.pagoEm ? { ...nova, pagoEm: anterior.pagoEm, valorPago: anterior.valorPago } : nova;
  return { salvar: [salvar], remover: existentes.filter((l) => l.id !== nova.id).map((l) => l.id) };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/dominio` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 6: Confirmar que o teste de "não duplica" pega o erro**

Em `gerarParcelas`, troque temporariamente `id: idParcela(d.id, numero)` por `id: crypto.randomUUID()`. Run: `npx vitest run tests/dominio/parcelas.test.ts` → Expected: FAIL em "regerar duas vezes não duplica" (6 itens em vez de 3). Desfaça a troca e rode de novo → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/dominio/parcelas.ts tests/dominio/parcelas.test.ts tests/fabricas.ts
git commit -m "feat(dominio): parcelas e avulsas com IDs fixos e edição que preserva pagas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Recorrências

**Files:**
- Create: `src/dominio/recorrencias.ts`
- Test: `tests/dominio/recorrencias.test.ts`

**Interfaces:**
- Consumes: `vencimentoNoCartao` (Task 3), funções de `datas.ts` (Task 2), `aplicar`/`esperarErroDominio`/fábricas (Task 4).
- Produces:
  - `horizonte(hoje: DataISO): DataISO` — último dia do mês atual + 12.
  - `chavePeriodo(frequencia: Frequencia, data: DataISO): string`
  - `idOcorrencia(despesaId: string, chave: string): string` → `"{despesaId}@{chave}"`
  - `estaPausada(r: DespesaRecorrente, data: DataISO): boolean`
  - `datasDeCobranca(r: DespesaRecorrente, ate: DataISO): DataISO[]`
  - `vencimentoDaCobranca(data: DataISO, meio?: MeioPagamento): DataISO`
  - `gerarOcorrencias(r: DespesaRecorrente, meio: MeioPagamento | undefined, hoje: DataISO): Lancamento[]`
  - `sincronizarRecorrencia(r, meio, existentes: Lancamento[], hoje: DataISO, aPartirDe?: MesISO): Mudancas`
  - `pausar(r, data): DespesaRecorrente`, `retomar(r, data): DespesaRecorrente`, `encerrar(r, fim): DespesaRecorrente`
  - `type EstadoRecorrencia = 'ativa' | 'pausada' | 'encerrada'`; `estadoRecorrencia(r, hoje): EstadoRecorrencia`

Regras (spec 5.4): `sincronizarRecorrencia` **só cria o que falta** — nunca sobrescreve uma ocorrência existente, exceto quando `aPartirDe` é informado; nesse caso remove e recria as **não pagas** com `mes >= aPartirDe`. Ocorrências não pagas que deixaram de ser válidas (pausa, fim) são removidas. Pagas nunca são tocadas.

- [ ] **Step 1: Escrever os testes**

`tests/dominio/recorrencias.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  encerrar,
  estadoRecorrencia,
  gerarOcorrencias,
  horizonte,
  pausar,
  retomar,
  sincronizarRecorrencia,
} from '../../src/dominio/recorrencias';
import { aplicar, CARTAO, esperarErroDominio, recorrente } from '../fabricas';

const HOJE = '2026-10-06';

describe('horizonte', () => {
  it('vai até o fim do mês atual + 12', () => {
    expect(horizonte(HOJE)).toBe('2027-10-31');
  });
});

describe('gerarOcorrencias', () => {
  it('mensal: do início até o horizonte, com ID por mês', () => {
    const r = gerarOcorrencias(recorrente(), undefined, HOJE);
    expect(r).toHaveLength(13);
    expect(r[0]).toEqual({
      id: 're1@2026-10',
      despesaId: 're1',
      chavePeriodo: '2026-10',
      dataCobranca: '2026-10-08',
      vencimento: '2026-10-08',
      mes: '2026-10',
      valor: 3990,
      estimado: false,
    });
    expect(r.at(-1)!.id).toBe('re1@2027-10');
  });

  it('no cartão, o vencimento segue a fatura e o mês é o do vencimento', () => {
    const r = gerarOcorrencias(recorrente(), CARTAO, HOJE);
    expect(r[0]).toMatchObject({ dataCobranca: '2026-10-08', vencimento: '2026-11-07', mes: '2026-11' });
    expect(r.at(-1)).toMatchObject({ dataCobranca: '2027-10-08', vencimento: '2027-11-07', mes: '2027-11' });
  });

  it('dia 31 acompanha o fim de cada mês', () => {
    const r = gerarOcorrencias(recorrente({ inicio: '2026-01-31' }), undefined, HOJE);
    expect(r.slice(0, 3).map((l) => l.dataCobranca)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('semanal: a cada 7 dias, chave pela data', () => {
    const r = gerarOcorrencias(recorrente({ frequencia: 'semanal', inicio: '2026-10-06' }), undefined, HOJE);
    expect(r).toHaveLength(56);
    expect(r.slice(0, 2).map((l) => l.id)).toEqual(['re1@2026-10-06', 're1@2026-10-13']);
  });

  it('anual: 29/02 vira 28/02 nos anos não bissextos', () => {
    const r = gerarOcorrencias(recorrente({ frequencia: 'anual', inicio: '2024-02-29' }), undefined, HOJE);
    expect(r.map((l) => [l.id, l.dataCobranca])).toEqual([
      ['re1@2024', '2024-02-29'],
      ['re1@2025', '2025-02-28'],
      ['re1@2026', '2026-02-28'],
      ['re1@2027', '2027-02-28'],
    ]);
  });

  it('respeita o fim', () => {
    expect(gerarOcorrencias(recorrente({ fim: '2026-12-31' }), undefined, HOJE).map((l) => l.id)).toEqual([
      're1@2026-10',
      're1@2026-11',
      're1@2026-12',
    ]);
  });

  it('valor variável gera estimativas', () => {
    expect(gerarOcorrencias(recorrente({ valorVariavel: true }), undefined, HOJE).every((l) => l.estimado)).toBe(true);
  });

  it('pula o período pausado', () => {
    const r = gerarOcorrencias(recorrente({ pausas: [{ de: '2026-12-01', ate: '2027-03-01' }] }), undefined, HOJE);
    expect(r.map((l) => l.chavePeriodo)).toEqual([
      '2026-10', '2026-11', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
    ]);
  });

  it.each([
    [{ valor: 0 }, 'Informe um valor maior que zero.'],
    [{ inicio: '2026-02-30' }, 'Informe a data da primeira cobrança.'],
    [{ fim: '2026-01-01' }, 'O fim não pode ser antes do início.'],
  ])('rejeita %o', (o, mensagem) => {
    esperarErroDominio(() => gerarOcorrencias(recorrente(o), undefined, HOJE), mensagem);
  });
});

describe('sincronizarRecorrencia', () => {
  it('é idempotente', () => {
    const primeira = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    expect(sincronizarRecorrencia(recorrente(), undefined, primeira, HOJE)).toEqual({ salvar: [], remover: [] });
  });

  it('pausar remove só as ocorrências não pagas a partir da pausa', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-12' ? { ...l, pagoEm: '2026-12-08', valorPago: l.valor } : l));
    const m = sincronizarRecorrencia(pausar(recorrente(), '2026-12-01'), undefined, atual, HOJE);
    expect(m.salvar).toEqual([]);
    expect(m.remover).toHaveLength(10);
    expect(m.remover).not.toContain('re1@2026-12');
    expect(m.remover).not.toContain('re1@2026-11');
  });

  it('editar a partir de um mês troca o valor só dali em diante', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2026-10' ? { ...l, pagoEm: '2026-10-08', valorPago: 3990 } : l));
    const final = aplicar(atual, sincronizarRecorrencia(recorrente({ valor: 4990 }), undefined, atual, HOJE, '2027-01'));
    const valores = Object.fromEntries(final.map((l) => [l.chavePeriodo, l.valor]));
    expect(valores['2026-10']).toBe(3990);
    expect(valores['2026-11']).toBe(3990);
    expect(valores['2026-12']).toBe(3990);
    expect(valores['2027-01']).toBe(4990);
    expect(valores['2027-10']).toBe(4990);
    expect(final).toHaveLength(13);
  });

  it('editar sem "a partir de" não altera lançamentos existentes', () => {
    const atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    expect(sincronizarRecorrencia(recorrente({ valor: 4990 }), undefined, atual, HOJE)).toEqual({ salvar: [], remover: [] });
  });

  it('encerrar mantém ocorrência paga depois do fim', () => {
    let atual = aplicar([], sincronizarRecorrencia(recorrente(), undefined, [], HOJE));
    atual = atual.map((l) => (l.id === 're1@2027-01' ? { ...l, pagoEm: '2027-01-08' } : l));
    const m = sincronizarRecorrencia(encerrar(recorrente(), '2026-11-30'), undefined, atual, HOJE);
    expect(m.remover).not.toContain('re1@2027-01');
    expect(m.remover).toContain('re1@2026-12');
  });
});

describe('pausar, retomar, encerrar e estado', () => {
  it('pausar e retomar registram o intervalo', () => {
    const p = pausar(recorrente(), '2026-12-01');
    expect(p.pausas).toEqual([{ de: '2026-12-01' }]);
    expect(retomar(p, '2027-03-01').pausas).toEqual([{ de: '2026-12-01', ate: '2027-03-01' }]);
  });

  it('rejeita operações inválidas', () => {
    esperarErroDominio(() => pausar(pausar(recorrente(), '2026-12-01'), '2026-12-05'), 'Esta recorrência já está pausada.');
    esperarErroDominio(() => retomar(recorrente(), '2026-12-01'), 'Esta recorrência não está pausada.');
    esperarErroDominio(
      () => retomar(pausar(recorrente(), '2026-12-01'), '2026-11-01'),
      'A retomada não pode ser antes do início da pausa.',
    );
    esperarErroDominio(() => encerrar(recorrente(), '2026-01-01'), 'O fim não pode ser antes do início.');
  });

  it('estadoRecorrencia', () => {
    expect(estadoRecorrencia(recorrente(), HOJE)).toBe('ativa');
    expect(estadoRecorrencia(pausar(recorrente(), '2026-10-01'), HOJE)).toBe('pausada');
    expect(estadoRecorrencia(pausar(recorrente(), '2026-11-01'), HOJE)).toBe('ativa');
    expect(estadoRecorrencia(recorrente({ inicio: '2026-01-08', fim: '2026-10-01' }), HOJE)).toBe('encerrada');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/dominio/recorrencias.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/dominio/recorrencias"`.

- [ ] **Step 3: Implementar `src/dominio/recorrencias.ts`**

```ts
import { vencimentoNoCartao } from './cartao';
import { ehDataISO, mesDe, somarDias, somarMeses, somarMesesAoMes, ultimoDia } from './datas';
import {
  ErroDominio,
  type DataISO,
  type DespesaRecorrente,
  type Frequencia,
  type Lancamento,
  type MeioPagamento,
  type MesISO,
  type Mudancas,
} from './tipos';

const LIMITE_OCORRENCIAS = 5000;

export type EstadoRecorrencia = 'ativa' | 'pausada' | 'encerrada';

/** Gera ocorrências até o fim do mês atual + 12 meses. */
export function horizonte(hoje: DataISO): DataISO {
  return ultimoDia(somarMesesAoMes(mesDe(hoje), 12));
}

export function chavePeriodo(frequencia: Frequencia, data: DataISO): string {
  if (frequencia === 'mensal') return mesDe(data);
  if (frequencia === 'anual') return data.slice(0, 4);
  return data;
}

export function idOcorrencia(despesaId: string, chave: string): string {
  return `${despesaId}@${chave}`;
}

export function estaPausada(r: DespesaRecorrente, data: DataISO): boolean {
  return r.pausas.some((p) => data >= p.de && (p.ate === undefined || data < p.ate));
}

function validarRecorrente(r: DespesaRecorrente): void {
  if (!Number.isInteger(r.valor) || r.valor <= 0) throw new ErroDominio('Informe um valor maior que zero.');
  if (!ehDataISO(r.inicio)) throw new ErroDominio('Informe a data da primeira cobrança.');
  if (r.fim !== undefined && (!ehDataISO(r.fim) || r.fim < r.inicio)) {
    throw new ErroDominio('O fim não pode ser antes do início.');
  }
}

export function datasDeCobranca(r: DespesaRecorrente, ate: DataISO): DataISO[] {
  const limite = r.fim && r.fim < ate ? r.fim : ate;
  const datas: DataISO[] = [];
  for (let k = 0; k < LIMITE_OCORRENCIAS; k++) {
    const data =
      r.frequencia === 'mensal'
        ? somarMeses(r.inicio, k)
        : r.frequencia === 'semanal'
          ? somarDias(r.inicio, 7 * k)
          : somarMeses(r.inicio, 12 * k);
    if (data > limite) break;
    if (!estaPausada(r, data)) datas.push(data);
  }
  return datas;
}

export function vencimentoDaCobranca(data: DataISO, meio?: MeioPagamento): DataISO {
  if (meio?.tipo === 'credito' && meio.diaFechamento && meio.diaVencimento) {
    return vencimentoNoCartao(data, meio.diaFechamento, meio.diaVencimento);
  }
  return data;
}

export function gerarOcorrencias(r: DespesaRecorrente, meio: MeioPagamento | undefined, hoje: DataISO): Lancamento[] {
  validarRecorrente(r);
  return datasDeCobranca(r, horizonte(hoje)).map((data) => {
    const chave = chavePeriodo(r.frequencia, data);
    const vencimento = vencimentoDaCobranca(data, meio);
    return {
      id: idOcorrencia(r.id, chave),
      despesaId: r.id,
      chavePeriodo: chave,
      dataCobranca: data,
      vencimento,
      mes: mesDe(vencimento),
      valor: r.valor,
      estimado: r.valorVariavel,
    };
  });
}

/**
 * Cria as ocorrências que faltam e remove as não pagas que deixaram de valer.
 * Com `aPartirDe`, também recria as não pagas desse mês em diante (edição de valor/data).
 */
export function sincronizarRecorrencia(
  r: DespesaRecorrente,
  meio: MeioPagamento | undefined,
  existentes: Lancamento[],
  hoje: DataISO,
  aPartirDe?: MesISO,
): Mudancas {
  const geradas = gerarOcorrencias(r, meio, hoje);
  const validas = new Set(geradas.map((l) => l.id));
  const remover = existentes
    .filter((l) => !l.pagoEm && (!validas.has(l.id) || (aPartirDe !== undefined && l.mes >= aPartirDe)))
    .map((l) => l.id);
  const removidos = new Set(remover);
  const mantidos = new Set(existentes.filter((l) => !removidos.has(l.id)).map((l) => l.id));
  return { salvar: geradas.filter((l) => !mantidos.has(l.id)), remover };
}

export function pausar(r: DespesaRecorrente, data: DataISO): DespesaRecorrente {
  if (r.pausas.some((p) => p.ate === undefined)) throw new ErroDominio('Esta recorrência já está pausada.');
  return { ...r, pausas: [...r.pausas, { de: data }] };
}

export function retomar(r: DespesaRecorrente, data: DataISO): DespesaRecorrente {
  const i = r.pausas.findIndex((p) => p.ate === undefined);
  if (i === -1) throw new ErroDominio('Esta recorrência não está pausada.');
  const aberta = r.pausas[i]!;
  if (data < aberta.de) throw new ErroDominio('A retomada não pode ser antes do início da pausa.');
  return { ...r, pausas: r.pausas.map((p, j) => (j === i ? { de: p.de, ate: data } : p)) };
}

export function encerrar(r: DespesaRecorrente, fim: DataISO): DespesaRecorrente {
  if (fim < r.inicio) throw new ErroDominio('O fim não pode ser antes do início.');
  return { ...r, fim };
}

export function estadoRecorrencia(r: DespesaRecorrente, hoje: DataISO): EstadoRecorrencia {
  if (r.fim && r.fim < hoje) return 'encerrada';
  if (r.pausas.some((p) => p.ate === undefined && p.de <= hoje)) return 'pausada';
  return 'ativa';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/dominio` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 5: Confirmar que a idempotência é testada de verdade**

Troque temporariamente em `sincronizarRecorrencia` o retorno para `{ salvar: geradas, remover }`. Run: `npx vitest run tests/dominio/recorrencias.test.ts` → Expected: FAIL em "é idempotente" e em "editar sem 'a partir de'". Desfaça → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/dominio/recorrencias.ts tests/dominio/recorrencias.test.ts
git commit -m "feat(dominio): recorrências idempotentes com pausa, fim e edição a partir de um mês" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Resumo do mês e filtros

**Files:**
- Create: `src/dominio/resumo.ts`, `src/dominio/filtros.ts`
- Test: `tests/dominio/resumo.test.ts`, `tests/dominio/filtros.test.ts`

**Interfaces:**
- Consumes: `situacao` (Task 3), `datas.ts`, tipos, fábricas.
- Produces:
  - `interface Cadastros { despesas: Despesa[]; categorias: Categoria[]; marcas: Marca[]; meios: MeioPagamento[] }`
  - `interface ItemLista { lancamento: Lancamento; despesa: Despesa; situacao: Situacao; categoria?: Categoria; marca?: Marca; meio?: MeioPagamento }`
  - `detalhar(lancamentos: Lancamento[], cad: Cadastros, hoje: DataISO): ItemLista[]` (ignora lançamento sem despesa)
  - `valorEfetivo(l: Lancamento): Centavos` (pago → `valorPago ?? valor`)
  - `interface ResumoMes { total; pago; pendente; atrasado; qtdAtrasadas: number; porCategoria: { categoriaId: string; total: Centavos }[] }`
  - `resumoDoMes(itens: ItemLista[], mes: MesISO): ResumoMes`
  - `proximosVencimentos(itens: ItemLista[], limite?: number): ItemLista[]` (atrasadas primeiro)
  - `interface Fatura { meioId: string; vencimento: DataISO; total: Centavos; pago: boolean; ids: string[]; idsAbertos: string[] }`
  - `faturasDoMes(itens: ItemLista[], mes: MesISO): Fatura[]`
  - `totaisProximosMeses(itens, mesAtual: MesISO, n?: number): { mes: MesISO; total: Centavos; temEstimado: boolean }[]`
  - `contarAConfirmar(despesas: Despesa[]): number`
  - `backupAtrasado(ultimoBackupEm: string | undefined, hoje: DataISO, dias?: number): boolean`
  - `filtros.ts`: `normalizar(texto): string`, `interface Filtros { texto?; mes?; categoriaId?; situacao?; tipo?; meioPagamentoId? }`, `filtrar(itens, f): ItemLista[]`, `ordenarItens(a, b): number`

- [ ] **Step 1: Escrever os testes de resumo**

`tests/dominio/resumo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import {
  backupAtrasado,
  contarAConfirmar,
  detalhar,
  faturasDoMes,
  proximosVencimentos,
  resumoDoMes,
  totaisProximosMeses,
  type Cadastros,
} from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, parcelada, PIX, recorrente } from '../fabricas';

const cad: Cadastros = {
  despesas: [
    avulsa({ id: 'av1', descricao: 'Consulta', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix' }),
    recorrente({ id: 're1', descricao: 'Streaming', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
    recorrente({ id: 're2', descricao: 'Nuvem', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
    parcelada({ id: 'pa1', descricao: 'Celular', categoriaId: 'cat-compras', meioPagamentoId: 'mp-pix', numParcelas: 12 }),
  ],
  categorias: CATEGORIAS_PADRAO,
  marcas: [],
  meios: [CARTAO, PIX],
};

const lancamentos = [
  lanc({ id: 'L1', despesaId: 'av1', mes: '2026-10', vencimento: '2026-10-05', valor: 10000 }),
  lanc({ id: 'L2', despesaId: 're1', mes: '2026-10', vencimento: '2026-10-07', valor: 3990 }),
  lanc({ id: 'L3', despesaId: 're2', mes: '2026-10', vencimento: '2026-10-07', valor: 2000, pagoEm: '2026-10-06', valorPago: 2100 }),
  lanc({ id: 'L4', despesaId: 'pa1', numero: 11, mes: '2026-10', valor: 45000 }),
  lanc({ id: 'L5', despesaId: 're1', mes: '2026-11', vencimento: '2026-11-07', valor: 3990, estimado: true }),
  lanc({ id: 'L6', despesaId: 'pa1', numero: 12, mes: '2026-12', vencimento: '2026-12-10', valor: 45000 }),
  lanc({ id: 'L7', despesaId: 'apagada', mes: '2026-10', valor: 999 }),
];

const itens = detalhar(lancamentos, cad, '2026-10-06');

describe('detalhar', () => {
  it('liga despesa, categoria e meio, e ignora lançamento órfão', () => {
    expect(itens).toHaveLength(6);
    const l1 = itens.find((i) => i.lancamento.id === 'L1')!;
    expect(l1.situacao).toBe('atrasada');
    expect(l1.categoria?.nome).toBe('Saúde');
    expect(l1.meio?.id).toBe('mp-pix');
  });
});

describe('resumoDoMes', () => {
  it('soma total, pago (pelo valor pago), pendente, atrasado e por categoria', () => {
    expect(resumoDoMes(itens, '2026-10')).toEqual({
      total: 61090,
      pago: 2100,
      pendente: 58990,
      atrasado: 10000,
      qtdAtrasadas: 1,
      porCategoria: [
        { categoriaId: 'cat-compras', total: 45000 },
        { categoriaId: 'cat-saude', total: 10000 },
        { categoriaId: 'cat-assinaturas', total: 6090 },
      ],
    });
  });

  it('mês sem lançamentos dá zero', () => {
    expect(resumoDoMes(itens, '2027-05')).toEqual({ total: 0, pago: 0, pendente: 0, atrasado: 0, qtdAtrasadas: 0, porCategoria: [] });
  });
});

describe('proximosVencimentos', () => {
  it('atrasadas primeiro, depois por data; ignora pagas e sem vencimento', () => {
    expect(proximosVencimentos(itens).map((i) => i.lancamento.id)).toEqual(['L1', 'L2', 'L5', 'L6']);
    expect(proximosVencimentos(itens, 2).map((i) => i.lancamento.id)).toEqual(['L1', 'L2']);
  });
});

describe('faturasDoMes', () => {
  it('agrupa lançamentos do cartão pelo vencimento', () => {
    expect(faturasDoMes(itens, '2026-10')).toEqual([
      { meioId: 'mp-cartao', vencimento: '2026-10-07', total: 6090, pago: false, ids: ['L2', 'L3'], idsAbertos: ['L2'] },
    ]);
  });
});

describe('totaisProximosMeses', () => {
  it('soma os 3 meses seguintes e marca estimativas', () => {
    expect(totaisProximosMeses(itens, '2026-10')).toEqual([
      { mes: '2026-11', total: 3990, temEstimado: true },
      { mes: '2026-12', total: 45000, temEstimado: false },
      { mes: '2027-01', total: 0, temEstimado: false },
    ]);
  });
});

describe('contarAConfirmar e backupAtrasado', () => {
  it('conta despesas com pendências', () => {
    expect(contarAConfirmar([avulsa({ aConfirmar: ['vencimento'] }), avulsa()])).toBe(1);
  });

  it('backup atrasado depois de 30 dias ou se nunca feito', () => {
    expect(backupAtrasado(undefined, '2026-10-06')).toBe(true);
    expect(backupAtrasado('2026-09-06T15:00:00.000Z', '2026-10-06')).toBe(false);
    expect(backupAtrasado('2026-09-05T15:00:00.000Z', '2026-10-06')).toBe(true);
  });
});
```

- [ ] **Step 2: Escrever os testes de filtros**

`tests/dominio/filtros.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { filtrar, normalizar } from '../../src/dominio/filtros';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import { detalhar } from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, PIX, recorrente } from '../fabricas';

const itens = detalhar(
  [
    lanc({ id: 'la', despesaId: 'a', mes: '2026-10', vencimento: '2026-10-05' }),
    lanc({ id: 'lr1', despesaId: 'r', mes: '2026-10', vencimento: '2026-10-20' }),
    lanc({ id: 'lr2', despesaId: 'r', mes: '2026-11', vencimento: '2026-11-20' }),
  ],
  {
    despesas: [
      avulsa({ id: 'a', descricao: 'Açaí da esquina', marcaId: 'm1', categoriaId: 'cat-alimentacao', meioPagamentoId: 'mp-pix' }),
      recorrente({ id: 'r', descricao: 'Academia', categoriaId: 'cat-saude', meioPagamentoId: 'mp-cartao' }),
    ],
    categorias: CATEGORIAS_PADRAO,
    marcas: [{ id: 'm1', nome: 'Sorveteria Polo', apelidos: ['Polo Norte'] }],
    meios: [CARTAO, PIX],
  },
  '2026-10-06',
);

const ids = (f: Parameters<typeof filtrar>[1]) => filtrar(itens, f).map((i) => i.lancamento.id);

describe('normalizar', () => {
  it('tira acentos, caixa e espaços das pontas', () => {
    expect(normalizar('  Saúde ÁÇÃO ')).toBe('saude acao');
  });
});

describe('filtrar', () => {
  it('busca sem acento pela descrição, marca e apelido', () => {
    expect(ids({ texto: 'acai' })).toEqual(['la']);
    expect(ids({ texto: 'polo norte' })).toEqual(['la']);
    expect(ids({ texto: 'sorveteria' })).toEqual(['la']);
    expect(ids({ texto: 'ACADEMIA' })).toEqual(['lr1', 'lr2']);
  });

  it('filtra por mês, categoria, situação, tipo e meio', () => {
    expect(ids({ mes: '2026-11' })).toEqual(['lr2']);
    expect(ids({ categoriaId: 'cat-saude' })).toEqual(['lr1', 'lr2']);
    expect(ids({ situacao: 'atrasada' })).toEqual(['la']);
    expect(ids({ tipo: 'recorrente' })).toEqual(['lr1', 'lr2']);
    expect(ids({ meioPagamentoId: 'mp-pix' })).toEqual(['la']);
    expect(ids({ texto: 'academia', mes: '2026-10' })).toEqual(['lr1']);
  });

  it('sem filtros devolve tudo ordenado por mês e vencimento', () => {
    expect(ids({})).toEqual(['la', 'lr1', 'lr2']);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/dominio/resumo.test.ts tests/dominio/filtros.test.ts`
Expected: FAIL — imports não resolvidos.

- [ ] **Step 4: Implementar `src/dominio/resumo.ts`**

```ts
import { diferencaEmDias, hojeISO, somarMesesAoMes } from './datas';
import { situacao } from './situacao';
import type {
  Categoria,
  Centavos,
  DataISO,
  Despesa,
  Lancamento,
  Marca,
  MeioPagamento,
  MesISO,
  Situacao,
} from './tipos';

export interface Cadastros {
  despesas: Despesa[];
  categorias: Categoria[];
  marcas: Marca[];
  meios: MeioPagamento[];
}

export interface ItemLista {
  lancamento: Lancamento;
  despesa: Despesa;
  situacao: Situacao;
  categoria?: Categoria;
  marca?: Marca;
  meio?: MeioPagamento;
}

export interface ResumoMes {
  total: Centavos;
  pago: Centavos;
  pendente: Centavos;
  atrasado: Centavos;
  qtdAtrasadas: number;
  porCategoria: { categoriaId: string; total: Centavos }[];
}

export interface Fatura {
  meioId: string;
  vencimento: DataISO;
  total: Centavos;
  pago: boolean;
  ids: string[];
  idsAbertos: string[];
}

export function detalhar(lancamentos: Lancamento[], cad: Cadastros, hoje: DataISO): ItemLista[] {
  const despesas = new Map(cad.despesas.map((d) => [d.id, d]));
  const categorias = new Map(cad.categorias.map((c) => [c.id, c]));
  const marcas = new Map(cad.marcas.map((m) => [m.id, m]));
  const meios = new Map(cad.meios.map((m) => [m.id, m]));
  const itens: ItemLista[] = [];
  for (const l of lancamentos) {
    const d = despesas.get(l.despesaId);
    if (!d) continue;
    itens.push({
      lancamento: l,
      despesa: d,
      situacao: situacao(l, hoje),
      categoria: categorias.get(d.categoriaId),
      marca: d.marcaId ? marcas.get(d.marcaId) : undefined,
      meio: d.meioPagamentoId ? meios.get(d.meioPagamentoId) : undefined,
    });
  }
  return itens;
}

export function valorEfetivo(l: Lancamento): Centavos {
  return l.pagoEm ? (l.valorPago ?? l.valor) : l.valor;
}

export function resumoDoMes(itens: ItemLista[], mes: MesISO): ResumoMes {
  let total = 0;
  let pago = 0;
  let atrasado = 0;
  let qtdAtrasadas = 0;
  const porCategoria = new Map<string, Centavos>();
  for (const i of itens) {
    if (i.lancamento.mes !== mes) continue;
    const v = valorEfetivo(i.lancamento);
    total += v;
    if (i.situacao === 'paga') pago += v;
    if (i.situacao === 'atrasada') {
      atrasado += v;
      qtdAtrasadas++;
    }
    porCategoria.set(i.despesa.categoriaId, (porCategoria.get(i.despesa.categoriaId) ?? 0) + v);
  }
  return {
    total,
    pago,
    pendente: total - pago,
    atrasado,
    qtdAtrasadas,
    porCategoria: [...porCategoria]
      .map(([categoriaId, t]) => ({ categoriaId, total: t }))
      .sort((a, b) => b.total - a.total || a.categoriaId.localeCompare(b.categoriaId)),
  };
}

/** Não pagas com vencimento: atrasadas primeiro, depois pela data. */
export function proximosVencimentos(itens: ItemLista[], limite = 5): ItemLista[] {
  const peso = (i: ItemLista) => (i.situacao === 'atrasada' ? 0 : 1);
  return itens
    .filter((i) => i.situacao === 'atrasada' || i.situacao === 'pendente')
    .sort(
      (a, b) =>
        peso(a) - peso(b) ||
        a.lancamento.vencimento!.localeCompare(b.lancamento.vencimento!) ||
        a.despesa.descricao.localeCompare(b.despesa.descricao, 'pt-BR'),
    )
    .slice(0, limite);
}

export function faturasDoMes(itens: ItemLista[], mes: MesISO): Fatura[] {
  const grupos = new Map<string, Fatura>();
  for (const i of itens) {
    const l = i.lancamento;
    if (l.mes !== mes || i.meio?.tipo !== 'credito' || !l.vencimento) continue;
    const chave = `${i.meio.id}|${l.vencimento}`;
    const f = grupos.get(chave) ?? { meioId: i.meio.id, vencimento: l.vencimento, total: 0, pago: true, ids: [], idsAbertos: [] };
    f.total += valorEfetivo(l);
    f.ids.push(l.id);
    if (!l.pagoEm) {
      f.pago = false;
      f.idsAbertos.push(l.id);
    }
    grupos.set(chave, f);
  }
  return [...grupos.values()].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export function totaisProximosMeses(
  itens: ItemLista[],
  mesAtual: MesISO,
  n = 3,
): { mes: MesISO; total: Centavos; temEstimado: boolean }[] {
  return Array.from({ length: n }, (_, k) => {
    const mes = somarMesesAoMes(mesAtual, k + 1);
    const doMes = itens.filter((i) => i.lancamento.mes === mes);
    return {
      mes,
      total: doMes.reduce((s, i) => s + valorEfetivo(i.lancamento), 0),
      temEstimado: doMes.some((i) => i.lancamento.estimado && !i.lancamento.pagoEm),
    };
  });
}

export function contarAConfirmar(despesas: Despesa[]): number {
  return despesas.filter((d) => d.aConfirmar.length > 0).length;
}

/** `ultimoBackupEm` é um instante ISO completo; compara pelo dia local. */
export function backupAtrasado(ultimoBackupEm: string | undefined, hoje: DataISO, dias = 30): boolean {
  if (!ultimoBackupEm) return true;
  return diferencaEmDias(hojeISO(new Date(ultimoBackupEm)), hoje) > dias;
}
```

- [ ] **Step 5: Implementar `src/dominio/filtros.ts`**

```ts
import type { ItemLista } from './resumo';
import type { MesISO, Situacao, TipoDespesa } from './tipos';

export interface Filtros {
  texto?: string;
  mes?: MesISO;
  categoriaId?: string;
  situacao?: Situacao;
  tipo?: TipoDespesa;
  meioPagamentoId?: string;
}

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export function ordenarItens(a: ItemLista, b: ItemLista): number {
  return (
    a.lancamento.mes.localeCompare(b.lancamento.mes) ||
    (a.lancamento.vencimento ?? '9999').localeCompare(b.lancamento.vencimento ?? '9999') ||
    a.despesa.descricao.localeCompare(b.despesa.descricao, 'pt-BR') ||
    (a.lancamento.numero ?? 0) - (b.lancamento.numero ?? 0)
  );
}

export function filtrar(itens: ItemLista[], f: Filtros): ItemLista[] {
  const termo = normalizar(f.texto ?? '');
  return itens
    .filter((i) => {
      if (f.mes && i.lancamento.mes !== f.mes) return false;
      if (f.categoriaId && i.despesa.categoriaId !== f.categoriaId) return false;
      if (f.situacao && i.situacao !== f.situacao) return false;
      if (f.tipo && i.despesa.tipo !== f.tipo) return false;
      if (f.meioPagamentoId && i.despesa.meioPagamentoId !== f.meioPagamentoId) return false;
      if (termo) {
        const alvos = [i.despesa.descricao, i.marca?.nome ?? '', ...(i.marca?.apelidos ?? [])];
        if (!alvos.some((a) => normalizar(a).includes(termo))) return false;
      }
      return true;
    })
    .sort(ordenarItens);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/dominio` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/dominio/resumo.ts src/dominio/filtros.ts tests/dominio/resumo.test.ts tests/dominio/filtros.test.ts
git commit -m "feat(dominio): resumo do mês, faturas, próximos vencimentos e filtros" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Banco (Dexie) e repositório com histórico

**Files:**
- Create: `src/dados/db.ts`, `src/dados/repositorio.ts`
- Test: `tests/dados/repositorio.test.ts`

**Interfaces:**
- Consumes: todo o `src/dominio` (Tasks 2–6), fábricas.
- Produces:
  - `db.ts`: `class JuliusDB extends Dexie` (tabelas `categorias`, `marcas`, `meios`, `despesas`, `lancamentos`, `historico`, `config`, `snapshots`), `const db: JuliusDB`, `VERSAO_ESQUEMA = 1`, tipos `RegistroConfig`, `Snapshot`, `DadosBackup`, `ArquivoBackup`.
  - `repositorio.ts` (todas recebem `base: JuliusDB` primeiro):
    - `diffCampos(anterior: object | undefined, novo: object): Mudanca[]`
    - `interface OpcoesSalvar { hoje: DataISO; aPartirDe?: MesISO; acao?: AcaoHistorico }`
    - `salvarDespesa(base, despesa: Despesa, op: OpcoesSalvar): Promise<void>`
    - `alterarRecorrencia(base, id, alterar: (r: DespesaRecorrente) => DespesaRecorrente, acao: AcaoHistorico, hoje): Promise<void>`
    - `marcarPaga(base, id, pagoEm, valorPago?)`, `marcarVariosPagos(base, ids, pagoEm, valorPago?)`
    - `desfazerPagamento(base, id)`, `desfazerVariosPagamentos(base, ids)`
    - `editarLancamento(base, id, campos: { valor?: Centavos; vencimento?: DataISO | null })`
    - `contarLancamentos(base, despesaId): Promise<{ total: number; pagos: number }>`
    - `excluirDespesa(base, id)`
    - `materializarTodas(base, hoje)`
    - `salvarCategoria(base, c)`, `excluirCategoria(base, id, substitutaId?)`
    - `salvarMarca(base, m)`, `excluirMarca(base, id)`
    - `salvarMeio(base, m, hoje)`, `excluirMeio(base, id)`
    - `inicializarPadrao(base)`, `obterConfig(base): Promise<RegistroConfig>`, `registrarBackup(base, quando: string)`

- [ ] **Step 1: Criar `src/dados/db.ts`**

```ts
import Dexie, { type Table } from 'dexie';
import type {
  Categoria,
  Configuracao,
  Despesa,
  Lancamento,
  Marca,
  MeioPagamento,
  RegistroHistorico,
} from '../dominio/tipos';

export const VERSAO_ESQUEMA = 1;

export interface RegistroConfig extends Configuracao {
  id: 'config';
}

export interface DadosBackup {
  categorias: Categoria[];
  marcas: Marca[];
  meiosPagamento: MeioPagamento[];
  despesas: Despesa[];
  lancamentos: Lancamento[];
  historico: RegistroHistorico[];
  configuracao: Configuracao;
}

export interface ArquivoBackup {
  app: 'julius-finance';
  versao: number;
  exportadoEm: string;
  dados: DadosBackup;
}

/** Cópia dos dados guardada antes de cada importação, para "Desfazer importação". */
export interface Snapshot {
  id: string;
  seq: number;
  criadoEm: string;
  arquivo: ArquivoBackup;
}

export class JuliusDB extends Dexie {
  declare categorias: Table<Categoria, string>;
  declare marcas: Table<Marca, string>;
  declare meios: Table<MeioPagamento, string>;
  declare despesas: Table<Despesa, string>;
  declare lancamentos: Table<Lancamento, string>;
  declare historico: Table<RegistroHistorico, string>;
  declare config: Table<RegistroConfig, string>;
  declare snapshots: Table<Snapshot, string>;

  constructor(nome = 'julius') {
    super(nome);
    this.version(1).stores({
      categorias: 'id, ordem',
      marcas: 'id',
      meios: 'id',
      despesas: 'id, tipo',
      lancamentos: 'id, despesaId, mes',
      historico: 'id, despesaId, quando',
      config: 'id',
      snapshots: 'id, seq',
    });
  }
}

export const db = new JuliusDB();
```

- [ ] **Step 2: Escrever os testes do repositório**

`tests/dados/repositorio.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { pausar } from '../../src/dominio/recorrencias';
import { ErroDominio } from '../../src/dominio/tipos';
import { avulsa, CARTAO, parcelada, recorrente } from '../fabricas';

const HOJE = '2026-10-06';
let base: JuliusDB;

beforeEach(async () => {
  base = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await base.open();
});

const lancs = (despesaId: string) => base.lancamentos.where('despesaId').equals(despesaId).sortBy('id');
const acoes = async (despesaId: string) =>
  (await base.historico.where('despesaId').equals(despesaId).toArray()).map((h) => h.acao).sort();

describe('salvarDespesa', () => {
  it('cria parcelada com parcelas e histórico "criada"', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    expect((await lancs('pa1')).map((l) => l.id)).toEqual(['pa1#1', 'pa1#2', 'pa1#3']);
    expect(await acoes('pa1')).toEqual(['criada']);
    expect((await base.despesas.get('pa1'))!.criadaEm).not.toBe('');
  });

  it('editar preserva a parcela paga, não duplica e registra o que mudou', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#1', '2026-11-09');
    await repo.salvarDespesa(base, parcelada({ valorTotal: 120000 }), { hoje: HOJE });
    const ls = await lancs('pa1');
    expect(ls.map((l) => [l.id, l.valor, l.pagoEm])).toEqual([
      ['pa1#1', 33334, '2026-11-09'],
      ['pa1#2', 40000, undefined],
      ['pa1#3', 40000, undefined],
    ]);
    const editada = (await base.historico.where('despesaId').equals('pa1').toArray()).find((h) => h.acao === 'editada')!;
    expect(editada.mudancas).toEqual([{ campo: 'valorTotal', de: 100000, para: 120000 }]);
  });

  it('edição inválida é rejeitada e o banco fica intacto', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    await repo.marcarPaga(base, 'pa1#3', '2026-11-09');
    const tentativa = repo.salvarDespesa(base, parcelada({ numParcelas: 2 }), { hoje: HOJE });
    await expect(tentativa).rejects.toBeInstanceOf(ErroDominio);
    await expect(tentativa).rejects.toThrow('Já existe pagamento na parcela 3. O número de parcelas não pode ser menor que 3.');
    expect((await base.despesas.get('pa1'))!).toMatchObject({ numParcelas: 3 });
    expect(await lancs('pa1')).toHaveLength(3);
    expect(await acoes('pa1')).toEqual(['criada', 'paga']);
  });

  it('não permite mudar o tipo', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'x' }), { hoje: HOJE });
    await expect(repo.salvarDespesa(base, recorrente({ id: 'x' }), { hoje: HOJE })).rejects.toThrow(
      'Não é possível mudar o tipo de uma despesa já cadastrada.',
    );
  });

  it('rejeita descrição vazia', async () => {
    await expect(repo.salvarDespesa(base, avulsa({ descricao: '   ' }), { hoje: HOJE })).rejects.toThrow('Informe a descrição.');
    expect(await base.despesas.count()).toBe(0);
  });

  it('acentos e caracteres especiais sobrevivem à gravação', async () => {
    const d = avulsa({ descricao: 'Açaí & Cia — ção ⟦⟧', observacoes: 'Pão de queijo "artesanal"\nsegunda linha' });
    await repo.salvarDespesa(base, d, { hoje: HOJE });
    const lida = (await base.despesas.get('av1'))!;
    expect(lida.descricao).toBe('Açaí & Cia — ção ⟦⟧');
    expect(lida.observacoes).toBe('Pão de queijo "artesanal"\nsegunda linha');
  });
});

describe('recorrências no banco', () => {
  it('materializarTodas é idempotente e avança com o tempo', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    expect(await base.lancamentos.count()).toBe(13);
    await repo.materializarTodas(base, HOJE);
    await repo.materializarTodas(base, HOJE);
    expect(await base.lancamentos.count()).toBe(13);
    await repo.materializarTodas(base, '2026-12-06');
    expect(await base.lancamentos.count()).toBe(15);
  });

  it('editar o valor de um mês estimado confirma o valor e não volta atrás', async () => {
    await repo.salvarDespesa(base, recorrente({ valorVariavel: true }), { hoje: HOJE });
    await repo.editarLancamento(base, 're1@2026-11', { valor: 4512 });
    await repo.materializarTodas(base, HOJE);
    expect(await base.lancamentos.get('re1@2026-11')).toMatchObject({ valor: 4512, estimado: false });
    expect(await base.lancamentos.get('re1@2026-12')).toMatchObject({ valor: 3990, estimado: true });
  });

  it('editarLancamento rejeita valor zero', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    await expect(repo.editarLancamento(base, 're1@2026-11', { valor: 0 })).rejects.toThrow('Informe um valor maior que zero.');
  });

  it('pausar remove as futuras não pagas e registra no histórico', async () => {
    await repo.salvarDespesa(base, recorrente(), { hoje: HOJE });
    await repo.alterarRecorrencia(base, 're1', (r) => pausar(r, '2026-12-01'), 'pausada', HOJE);
    expect((await lancs('re1')).map((l) => l.id)).toEqual(['re1@2026-10', 're1@2026-11']);
    expect(await acoes('re1')).toEqual(['criada', 'pausada']);
  });
});

describe('pagamentos', () => {
  it('marcar e desfazer gravam histórico', async () => {
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    await repo.marcarPaga(base, 'av1#1', HOJE);
    expect(await base.lancamentos.get('av1#1')).toMatchObject({ pagoEm: HOJE, valorPago: 10000 });
    await repo.desfazerPagamento(base, 'av1#1');
    const l = (await base.lancamentos.get('av1#1'))!;
    expect(l.pagoEm).toBeUndefined();
    expect(l.valorPago).toBeUndefined();
    expect(await acoes('av1')).toEqual(['criada', 'paga', 'pagamento desfeito']);
  });

  it('marcarVariosPagos marca a fatura inteira', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, recorrente({ id: 'r1', meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.salvarDespesa(base, recorrente({ id: 'r2', meioPagamentoId: CARTAO.id, valor: 1500 }), { hoje: HOJE });
    await repo.marcarVariosPagos(base, ['r1@2026-10', 'r2@2026-10'], '2026-11-07');
    expect((await base.lancamentos.bulkGet(['r1@2026-10', 'r2@2026-10'])).map((l) => l!.pagoEm)).toEqual([
      '2026-11-07',
      '2026-11-07',
    ]);
  });
});

describe('excluirDespesa', () => {
  it('apaga só a despesa escolhida, com lançamentos e histórico', async () => {
    await repo.salvarDespesa(base, avulsa({ id: 'a1' }), { hoje: HOJE });
    await repo.salvarDespesa(base, avulsa({ id: 'a2' }), { hoje: HOJE });
    await repo.marcarPaga(base, 'a1#1', HOJE);
    expect(await repo.contarLancamentos(base, 'a1')).toEqual({ total: 1, pagos: 1 });
    await repo.excluirDespesa(base, 'a1');
    expect(await base.despesas.get('a1')).toBeUndefined();
    expect(await lancs('a1')).toEqual([]);
    expect(await acoes('a1')).toEqual([]);
    expect(await base.despesas.get('a2')).toBeDefined();
    expect(await lancs('a2')).toHaveLength(1);
    expect(await acoes('a2')).toEqual(['criada']);
  });
});

describe('cadastros', () => {
  it('inicializarPadrao cria as categorias uma vez só', async () => {
    await repo.inicializarPadrao(base);
    await repo.inicializarPadrao(base);
    expect(await base.categorias.count()).toBe(9);
    expect((await repo.obterConfig(base)).versaoEsquema).toBe(1);
  });

  it('salvarCategoria rejeita nome vazio e repetido (sem acento/caixa)', async () => {
    await repo.inicializarPadrao(base);
    await expect(repo.salvarCategoria(base, { id: 'n', nome: ' ', cor: '#000000', icone: 'dots', ordem: 10 })).rejects.toThrow(
      'Informe o nome.',
    );
    await expect(repo.salvarCategoria(base, { id: 'n', nome: 'SAUDE', cor: '#000000', icone: 'dots', ordem: 10 })).rejects.toThrow(
      'Já existe uma categoria com esse nome.',
    );
  });

  it('excluirCategoria em uso exige substituta e move as despesas', async () => {
    await repo.inicializarPadrao(base);
    await repo.salvarDespesa(base, avulsa({ categoriaId: 'cat-saude' }), { hoje: HOJE });
    await expect(repo.excluirCategoria(base, 'cat-saude')).rejects.toThrow('Escolha outra categoria para as despesas que usam esta.');
    await repo.excluirCategoria(base, 'cat-saude', 'cat-outros');
    expect((await base.despesas.get('av1'))!.categoriaId).toBe('cat-outros');
    expect(await base.categorias.get('cat-saude')).toBeUndefined();
  });

  it('excluirMarca tira a marca das despesas', async () => {
    await repo.salvarMarca(base, { id: 'm1', nome: 'Loja', apelidos: [' Lojinha ', ''] });
    expect((await base.marcas.get('m1'))!.apelidos).toEqual(['Lojinha']);
    await repo.salvarDespesa(base, avulsa({ marcaId: 'm1' }), { hoje: HOJE });
    await repo.excluirMarca(base, 'm1');
    expect((await base.despesas.get('av1'))!.marcaId).toBeUndefined();
  });

  it('salvarMeio valida os dias e recalcula vencimentos futuros não pagos', async () => {
    await expect(repo.salvarMeio(base, { ...CARTAO, diaFechamento: 32 }, HOJE)).rejects.toThrow('Informe um dia entre 1 e 31.');
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, recorrente({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    expect((await base.lancamentos.get('re1@2026-10'))!.vencimento).toBe('2026-11-07');
    await repo.salvarMeio(base, { ...CARTAO, diaVencimento: 10 }, HOJE);
    expect((await base.lancamentos.get('re1@2026-10'))!.vencimento).toBe('2026-11-10');
  });

  it('excluirMeio tira o meio das despesas', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await repo.salvarDespesa(base, avulsa({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
    await repo.excluirMeio(base, CARTAO.id);
    expect((await base.despesas.get('av1'))!.meioPagamentoId).toBeUndefined();
  });

  it('registrarBackup grava a data', async () => {
    await repo.registrarBackup(base, '2026-10-06T12:00:00.000Z');
    expect((await repo.obterConfig(base)).ultimoBackupEm).toBe('2026-10-06T12:00:00.000Z');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/dados/repositorio.test.ts`
Expected: FAIL — `Failed to resolve import "../../src/dados/repositorio"`.

- [ ] **Step 4: Implementar `src/dados/repositorio.ts`**

```ts
import { mesDe } from '../dominio/datas';
import { normalizar } from '../dominio/filtros';
import { CATEGORIAS_PADRAO } from '../dominio/padroes';
import { regerarAvulsa, regerarParcelas } from '../dominio/parcelas';
import { sincronizarRecorrencia } from '../dominio/recorrencias';
import {
  ErroDominio,
  type AcaoHistorico,
  type Categoria,
  type Centavos,
  type DataISO,
  type Despesa,
  type DespesaRecorrente,
  type Lancamento,
  type Marca,
  type MeioPagamento,
  type MesISO,
  type Mudanca,
  type Mudancas,
} from '../dominio/tipos';
import { VERSAO_ESQUEMA, type JuliusDB, type RegistroConfig } from './db';

const agora = (): string => new Date().toISOString();
const novoId = (): string => crypto.randomUUID();
const CAMPOS_IGNORADOS = new Set(['criadaEm', 'atualizadaEm']);

export interface OpcoesSalvar {
  hoje: DataISO;
  /** Recria as ocorrências não pagas deste mês em diante (edição de valor/data de recorrente). */
  aPartirDe?: MesISO;
  /** Força uma ação no histórico (pausada, retomada, encerrada). */
  acao?: AcaoHistorico;
}

/** Campos que mudaram entre duas versões de um registro. */
export function diffCampos(anterior: object | undefined, novo: object): Mudanca[] {
  if (!anterior) return [];
  const a = anterior as Record<string, unknown>;
  const n = novo as Record<string, unknown>;
  const campos = [...new Set([...Object.keys(a), ...Object.keys(n)])].filter((c) => !CAMPOS_IGNORADOS.has(c)).sort();
  const mudancas: Mudanca[] = [];
  for (const campo of campos) {
    if (JSON.stringify(a[campo]) !== JSON.stringify(n[campo])) {
      mudancas.push({ campo, de: a[campo] ?? null, para: n[campo] ?? null });
    }
  }
  return mudancas;
}

async function mudancasDaDespesa(
  base: JuliusDB,
  d: Despesa,
  existentes: Lancamento[],
  hoje: DataISO,
  aPartirDe?: MesISO,
): Promise<Mudancas> {
  if (d.tipo === 'avulsa') return regerarAvulsa(d, existentes);
  if (d.tipo === 'parcelada') return regerarParcelas(d, existentes);
  const meio = d.meioPagamentoId ? await base.meios.get(d.meioPagamentoId) : undefined;
  return sincronizarRecorrencia(d, meio, existentes, hoje, aPartirDe);
}

async function aplicarMudancas(base: JuliusDB, m: Mudancas): Promise<void> {
  if (m.remover.length > 0) await base.lancamentos.bulkDelete(m.remover);
  if (m.salvar.length > 0) await base.lancamentos.bulkPut(m.salvar);
}

export async function salvarDespesa(base: JuliusDB, despesa: Despesa, op: OpcoesSalvar): Promise<void> {
  if (!despesa.descricao.trim()) throw new ErroDominio('Informe a descrição.');
  await base.transaction('rw', [base.despesas, base.lancamentos, base.historico, base.meios], async () => {
    const anterior = await base.despesas.get(despesa.id);
    if (anterior && anterior.tipo !== despesa.tipo) {
      throw new ErroDominio('Não é possível mudar o tipo de uma despesa já cadastrada.');
    }
    const existentes = await base.lancamentos.where('despesaId').equals(despesa.id).toArray();
    const m = await mudancasDaDespesa(base, despesa, existentes, op.hoje, op.aPartirDe);
    const momento = agora();
    const gravar: Despesa = { ...despesa, criadaEm: anterior?.criadaEm ?? momento, atualizadaEm: momento };
    await base.despesas.put(gravar);
    await aplicarMudancas(base, m);
    const mudancas = diffCampos(anterior, gravar);
    if (!anterior || mudancas.length > 0 || op.acao) {
      await base.historico.add({
        id: novoId(),
        despesaId: despesa.id,
        quando: momento,
        acao: op.acao ?? (anterior ? 'editada' : 'criada'),
        mudancas,
      });
    }
  });
}

export async function alterarRecorrencia(
  base: JuliusDB,
  id: string,
  alterar: (r: DespesaRecorrente) => DespesaRecorrente,
  acao: AcaoHistorico,
  hoje: DataISO,
): Promise<void> {
  const d = await base.despesas.get(id);
  if (!d || d.tipo !== 'recorrente') throw new ErroDominio('Recorrência não encontrada.');
  await salvarDespesa(base, alterar(d), { hoje, acao });
}

export async function marcarVariosPagos(base: JuliusDB, ids: string[], pagoEm: DataISO, valorPago?: Centavos): Promise<void> {
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const momento = agora();
    for (const id of ids) {
      const l = await base.lancamentos.get(id);
      if (!l) throw new ErroDominio('Lançamento não encontrado.');
      if (l.pagoEm) continue;
      const pago = valorPago ?? l.valor;
      await base.lancamentos.put({ ...l, pagoEm, valorPago: pago });
      await base.historico.add({
        id: novoId(),
        despesaId: l.despesaId,
        lancamentoId: id,
        quando: momento,
        acao: 'paga',
        mudancas: [
          { campo: 'pagoEm', de: null, para: pagoEm },
          { campo: 'valorPago', de: null, para: pago },
        ],
      });
    }
  });
}

export async function marcarPaga(base: JuliusDB, id: string, pagoEm: DataISO, valorPago?: Centavos): Promise<void> {
  await marcarVariosPagos(base, [id], pagoEm, valorPago);
}

export async function desfazerVariosPagamentos(base: JuliusDB, ids: string[]): Promise<void> {
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const momento = agora();
    for (const id of ids) {
      const l = await base.lancamentos.get(id);
      if (!l?.pagoEm) continue;
      const { pagoEm, valorPago: _valorPago, ...resto } = l;
      await base.lancamentos.put(resto);
      await base.historico.add({
        id: novoId(),
        despesaId: l.despesaId,
        lancamentoId: id,
        quando: momento,
        acao: 'pagamento desfeito',
        mudancas: [{ campo: 'pagoEm', de: pagoEm, para: null }],
      });
    }
  });
}

export async function desfazerPagamento(base: JuliusDB, id: string): Promise<void> {
  await desfazerVariosPagamentos(base, [id]);
}

/** Corrige valor e/ou vencimento de um lançamento. Valor informado deixa de ser estimativa. */
export async function editarLancamento(
  base: JuliusDB,
  id: string,
  campos: { valor?: Centavos; vencimento?: DataISO | null },
): Promise<void> {
  if (campos.valor !== undefined && (!Number.isInteger(campos.valor) || campos.valor <= 0)) {
    throw new ErroDominio('Informe um valor maior que zero.');
  }
  await base.transaction('rw', base.lancamentos, base.historico, async () => {
    const l = await base.lancamentos.get(id);
    if (!l) throw new ErroDominio('Lançamento não encontrado.');
    const novo: Lancamento = { ...l };
    if (campos.valor !== undefined) {
      novo.valor = campos.valor;
      novo.estimado = false;
    }
    if (campos.vencimento === null) {
      delete novo.vencimento;
    } else if (campos.vencimento !== undefined) {
      novo.vencimento = campos.vencimento;
      novo.mes = mesDe(campos.vencimento);
    }
    const mudancas = diffCampos(l, novo);
    if (mudancas.length === 0) return;
    await base.lancamentos.put(novo);
    await base.historico.add({ id: novoId(), despesaId: l.despesaId, lancamentoId: id, quando: agora(), acao: 'editada', mudancas });
  });
}

export async function contarLancamentos(base: JuliusDB, despesaId: string): Promise<{ total: number; pagos: number }> {
  const ls = await base.lancamentos.where('despesaId').equals(despesaId).toArray();
  return { total: ls.length, pagos: ls.filter((l) => l.pagoEm).length };
}

export async function excluirDespesa(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.despesas, base.lancamentos, base.historico, async () => {
    await base.lancamentos.where('despesaId').equals(id).delete();
    await base.historico.where('despesaId').equals(id).delete();
    await base.despesas.delete(id);
  });
}

/** Cria as ocorrências que faltam de todas as recorrentes. Roda ao abrir o app. */
export async function materializarTodas(base: JuliusDB, hoje: DataISO): Promise<void> {
  await base.transaction('rw', [base.despesas, base.lancamentos, base.meios], async () => {
    const recorrentes = (await base.despesas.where('tipo').equals('recorrente').toArray()) as DespesaRecorrente[];
    for (const r of recorrentes) {
      const existentes = await base.lancamentos.where('despesaId').equals(r.id).toArray();
      const meio = r.meioPagamentoId ? await base.meios.get(r.meioPagamentoId) : undefined;
      let m: Mudancas;
      try {
        m = sincronizarRecorrencia(r, meio, existentes, hoje);
      } catch (e) {
        if (e instanceof ErroDominio) continue; // registro antigo inválido: não trava a abertura do app
        throw e;
      }
      await aplicarMudancas(base, m);
    }
  });
}

export async function salvarCategoria(base: JuliusDB, c: Categoria): Promise<void> {
  const nome = c.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  const todas = await base.categorias.toArray();
  if (todas.some((o) => o.id !== c.id && normalizar(o.nome) === normalizar(nome))) {
    throw new ErroDominio('Já existe uma categoria com esse nome.');
  }
  await base.categorias.put({ ...c, nome });
}

export async function excluirCategoria(base: JuliusDB, id: string, substitutaId?: string): Promise<void> {
  await base.transaction('rw', base.categorias, base.despesas, async () => {
    if ((await base.categorias.count()) <= 1) throw new ErroDominio('Mantenha pelo menos uma categoria.');
    const emUso = (await base.despesas.toArray()).filter((d) => d.categoriaId === id);
    if (emUso.length > 0) {
      if (!substitutaId || substitutaId === id || !(await base.categorias.get(substitutaId))) {
        throw new ErroDominio('Escolha outra categoria para as despesas que usam esta.');
      }
      for (const d of emUso) await base.despesas.put({ ...d, categoriaId: substitutaId });
    }
    await base.categorias.delete(id);
  });
}

export async function salvarMarca(base: JuliusDB, m: Marca): Promise<void> {
  const nome = m.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  await base.marcas.put({ ...m, nome, apelidos: m.apelidos.map((a) => a.trim()).filter(Boolean) });
}

export async function excluirMarca(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.marcas, base.despesas, async () => {
    for (const d of (await base.despesas.toArray()).filter((x) => x.marcaId === id)) {
      const { marcaId: _marcaId, ...resto } = d;
      await base.despesas.put(resto as Despesa);
    }
    await base.marcas.delete(id);
  });
}

function diaValido(dia: number | undefined): boolean {
  return dia === undefined || (Number.isInteger(dia) && dia >= 1 && dia <= 31);
}

export async function salvarMeio(base: JuliusDB, m: MeioPagamento, hoje: DataISO): Promise<void> {
  const nome = m.nome.trim();
  if (!nome) throw new ErroDominio('Informe o nome.');
  if (m.tipo === 'credito' && (!diaValido(m.diaFechamento) || !diaValido(m.diaVencimento))) {
    throw new ErroDominio('Informe um dia entre 1 e 31.');
  }
  const limpo: MeioPagamento =
    m.tipo === 'credito' ? { ...m, nome } : { id: m.id, nome, tipo: m.tipo };
  await base.transaction('rw', [base.meios, base.despesas, base.lancamentos], async () => {
    const anterior = await base.meios.get(m.id);
    await base.meios.put(limpo);
    const mudouRegra =
      anterior !== undefined &&
      (anterior.tipo !== limpo.tipo ||
        anterior.diaFechamento !== limpo.diaFechamento ||
        anterior.diaVencimento !== limpo.diaVencimento);
    if (!mudouRegra) return;
    const recorrentes = (await base.despesas.where('tipo').equals('recorrente').toArray()).filter(
      (d) => d.meioPagamentoId === m.id,
    ) as DespesaRecorrente[];
    for (const r of recorrentes) {
      const existentes = await base.lancamentos.where('despesaId').equals(r.id).toArray();
      await aplicarMudancas(base, sincronizarRecorrencia(r, limpo, existentes, hoje, mesDe(hoje)));
    }
  });
}

export async function excluirMeio(base: JuliusDB, id: string): Promise<void> {
  await base.transaction('rw', base.meios, base.despesas, async () => {
    for (const d of (await base.despesas.toArray()).filter((x) => x.meioPagamentoId === id)) {
      const { meioPagamentoId: _meio, ...resto } = d;
      await base.despesas.put(resto as Despesa);
    }
    await base.meios.delete(id);
  });
}

export async function inicializarPadrao(base: JuliusDB): Promise<void> {
  await base.transaction('rw', base.categorias, base.config, async () => {
    if ((await base.categorias.count()) === 0) await base.categorias.bulkAdd(CATEGORIAS_PADRAO);
    if (!(await base.config.get('config'))) await base.config.put({ id: 'config', versaoEsquema: VERSAO_ESQUEMA });
  });
}

export async function obterConfig(base: JuliusDB): Promise<RegistroConfig> {
  return (await base.config.get('config')) ?? { id: 'config', versaoEsquema: VERSAO_ESQUEMA };
}

export async function registrarBackup(base: JuliusDB, quando: string): Promise<void> {
  const c = await obterConfig(base);
  await base.config.put({ ...c, ultimoBackupEm: quando });
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/dados/repositorio.test.ts` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros. (Se o `tsc` acusar variáveis `_valorPago`/`_marcaId`/`_meio` não usadas, a configuração não tem `noUnusedLocals`; se tiver, troque a desestruturação por `delete` em uma cópia.)

- [ ] **Step 6: Confirmar que o teste de atomicidade pega o erro**

Em `salvarDespesa`, mova temporariamente `await base.despesas.put(gravar);` para **antes** de `base.transaction(...)` (fora da transação). Run: `npx vitest run tests/dados/repositorio.test.ts -t "intacto"` → Expected: FAIL (`numParcelas` vira 2). Desfaça → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/dados tests/dados
git commit -m "feat(dados): banco Dexie e repositório com histórico e transações" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Backup JSON e exportação CSV

**Files:**
- Create: `src/dados/backup.ts`, `src/dados/csv.ts`
- Test: `tests/dados/backup.test.ts`, `tests/dados/csv.test.ts`

**Interfaces:**
- Consumes: `JuliusDB`, `ArquivoBackup`, `DadosBackup`, `VERSAO_ESQUEMA` (Task 7), repositório (Task 7), `detalhar`, `valorEfetivo`, `ItemLista` (Task 6), datas e dinheiro.
- Produces:
  - `APP_ID = 'julius-finance'`, `VERSAO_BACKUP = 1`
  - `exportar(base, agora?: string): Promise<ArquivoBackup>`
  - `serializar(a: ArquivoBackup): string`
  - `nomeArquivoBackup(hoje: DataISO): string` → `julius-backup-AAAA-MM-DD.json`
  - `type ResultadoLeitura = { ok: true; arquivo: ArquivoBackup } | { ok: false; erro: string }`
  - `lerBackup(texto: string): ResultadoLeitura`
  - `resumirBackup(a: ArquivoBackup): { despesas: number; lancamentos: number; exportadoEm: string }`
  - `importar(base, a: ArquivoBackup): Promise<void>` (snapshot + substitui tudo, numa transação)
  - `desfazerImportacao(base): Promise<boolean>`, `temImportacaoParaDesfazer(base): Promise<boolean>`
  - `csv.ts`: `gerarCsv(itens: ItemLista[]): string`

- [ ] **Step 1: Escrever os testes de backup**

`tests/dados/backup.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  desfazerImportacao,
  exportar,
  importar,
  lerBackup,
  nomeArquivoBackup,
  resumirBackup,
  serializar,
  temImportacaoParaDesfazer,
} from '../../src/dados/backup';
import { JuliusDB, type ArquivoBackup } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { avulsa, CARTAO, parcelada, recorrente } from '../fabricas';

const HOJE = '2026-10-06';
const novaBase = async () => {
  const b = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await b.open();
  return b;
};

async function popular(base: JuliusDB): Promise<void> {
  await repo.inicializarPadrao(base);
  await repo.salvarMeio(base, CARTAO, HOJE);
  await repo.salvarMarca(base, { id: 'm1', nome: 'Padaria São João', apelidos: ['Pão ⟦quente⟧'] });
  await repo.salvarDespesa(base, avulsa({ descricao: 'Açaí & Cia — ção ⟦⟧', marcaId: 'm1', observacoes: 'aspas "duplas"\nlinha 2' }), { hoje: HOJE });
  await repo.salvarDespesa(base, recorrente({ meioPagamentoId: CARTAO.id }), { hoje: HOJE });
  await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
  await repo.marcarPaga(base, 'pa1#1', HOJE);
}

function arquivoValido(): Record<string, any> {
  return {
    app: 'julius-finance',
    versao: 1,
    exportadoEm: '2026-10-06T12:00:00.000Z',
    dados: {
      categorias: [{ id: 'c', nome: 'Outros', cor: '#000000', icone: 'dots', ordem: 1 }],
      marcas: [],
      meiosPagamento: [],
      despesas: [{ ...avulsa({ id: 'd', categoriaId: 'c' }) }],
      lancamentos: [{ id: 'd#1', despesaId: 'd', mes: '2026-10', valor: 10000, estimado: false }],
      historico: [],
      configuracao: { versaoEsquema: 1 },
    },
  };
}

let base: JuliusDB;
beforeEach(async () => {
  base = await novaBase();
});

describe('exportar e importar', () => {
  it('round-trip preserva tudo, inclusive acentos e caracteres especiais', async () => {
    await popular(base);
    const original = await exportar(base, '2026-10-06T12:00:00.000Z');
    const lido = lerBackup(serializar(original));
    expect(lido.ok).toBe(true);
    const destino = await novaBase();
    await importar(destino, (lido as { ok: true; arquivo: ArquivoBackup }).arquivo);
    const copia = await exportar(destino, '2026-10-06T12:00:00.000Z');
    expect(copia.dados).toEqual(original.dados);
    expect(copia.dados.despesas.find((d) => d.id === 'av1')!.descricao).toBe('Açaí & Cia — ção ⟦⟧');
  });

  it('importação que falha no meio não altera nada', async () => {
    await popular(base);
    const antes = await exportar(base, 'x');
    const ruim = arquivoValido() as ArquivoBackup;
    ruim.dados.lancamentos.push({ ...ruim.dados.lancamentos[0]! }); // ID repetido: bulkAdd falha
    await expect(importar(base, ruim)).rejects.toBeDefined();
    expect((await exportar(base, 'x')).dados).toEqual(antes.dados);
    expect(await temImportacaoParaDesfazer(base)).toBe(false);
  });

  it('desfazer importação restaura os dados anteriores', async () => {
    await popular(base);
    const antes = await exportar(base, 'x');
    await importar(base, lerBackupOk(JSON.stringify(arquivoValido())));
    expect(await base.despesas.count()).toBe(1);
    expect(await desfazerImportacao(base)).toBe(true);
    expect((await exportar(base, 'x')).dados).toEqual(antes.dados);
    expect(await desfazerImportacao(base)).toBe(false);
  });

  it('guarda no máximo 3 cópias para desfazer', async () => {
    for (let i = 0; i < 4; i++) await importar(base, lerBackupOk(JSON.stringify(arquivoValido())));
    expect(await base.snapshots.count()).toBe(3);
  });
});

function lerBackupOk(texto: string): ArquivoBackup {
  const r = lerBackup(texto);
  if (!r.ok) throw new Error(r.erro);
  return r.arquivo;
}

describe('lerBackup rejeita arquivos ruins com mensagem clara', () => {
  const casos: [string, (a: Record<string, any>) => unknown, string][] = [
    ['JSON quebrado', () => '{ isto não é json', 'O arquivo não é um JSON válido.'],
    ['outro app', (a) => ({ ...a, app: 'outro' }), 'Este arquivo não é um backup do Julius.'],
    ['sem versão', (a) => ({ ...a, versao: undefined }), 'Versão do backup ausente.'],
    [
      'versão futura',
      (a) => ({ ...a, versao: 2 }),
      'Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.',
    ],
    ['sem dados', (a) => ({ ...a, dados: undefined }), 'Arquivo incompleto: faltam os dados.'],
    ['sem despesas', (a) => ({ ...a, dados: { ...a.dados, despesas: undefined } }), 'Arquivo incompleto: falta a lista "despesas".'],
    [
      'descrição numérica',
      (a) => ({ ...a, dados: { ...a.dados, despesas: [{ ...a.dados.despesas[0], descricao: 5 }] } }),
      'Arquivo inválido: despesas[0].descricao ausente ou com tipo errado.',
    ],
    [
      'valor com centavos fracionados',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [{ ...a.dados.lancamentos[0], valor: 10.5 }] } }),
      'Arquivo inválido: lancamentos[0].valor ausente ou com tipo errado.',
    ],
    [
      'tipo de despesa desconhecido',
      (a) => ({ ...a, dados: { ...a.dados, despesas: [{ ...a.dados.despesas[0], tipo: 'xyz' }] } }),
      'Arquivo inválido: despesas[0].tipo ausente ou com tipo errado.',
    ],
    [
      'lançamento órfão',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [{ ...a.dados.lancamentos[0], despesaId: 'nada' }] } }),
      'Arquivo inválido: o lançamento "d#1" aponta para uma despesa que não existe.',
    ],
    [
      'ID repetido',
      (a) => ({ ...a, dados: { ...a.dados, lancamentos: [a.dados.lancamentos[0], a.dados.lancamentos[0]] } }),
      'Arquivo inválido: ID repetido em lancamentos ("d#1").',
    ],
  ];

  it.each(casos)('%s', (_nome, alterar, mensagem) => {
    const r = alterar(arquivoValido());
    const texto = typeof r === 'string' ? r : JSON.stringify(r);
    expect(lerBackup(texto)).toEqual({ ok: false, erro: mensagem });
  });

  it('aceita arquivo válido sem configuração, usando o padrão', () => {
    const a = arquivoValido();
    delete a.dados.configuracao;
    const r = lerBackup(JSON.stringify(a));
    expect(r.ok && r.arquivo.dados.configuracao).toEqual({ versaoEsquema: 1 });
  });
});

describe('auxiliares', () => {
  it('resumirBackup e nomeArquivoBackup', () => {
    expect(resumirBackup(lerBackupOk(JSON.stringify(arquivoValido())))).toEqual({
      despesas: 1,
      lancamentos: 1,
      exportadoEm: '2026-10-06T12:00:00.000Z',
    });
    expect(nomeArquivoBackup('2026-10-06')).toBe('julius-backup-2026-10-06.json');
  });
});
```

- [ ] **Step 2: Escrever o teste de CSV**

`tests/dados/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gerarCsv } from '../../src/dados/csv';
import { CATEGORIAS_PADRAO } from '../../src/dominio/padroes';
import { detalhar } from '../../src/dominio/resumo';
import { avulsa, CARTAO, lanc, parcelada, PIX, recorrente } from '../fabricas';

describe('gerarCsv', () => {
  it('gera o texto exato: BOM, ";", vírgula decimal, aspas escapadas e CRLF', () => {
    const itens = detalhar(
      [
        lanc({ id: 'a#1', despesaId: 'a', mes: '2026-10', vencimento: '2026-10-05', valor: 123456 }),
        lanc({ id: 'p#11', despesaId: 'p', numero: 11, mes: '2026-10', valor: 45000 }),
        lanc({ id: 'r@2026-10', despesaId: 'r', mes: '2026-10', vencimento: '2026-10-08', valor: 3990, pagoEm: '2026-10-08', valorPago: 4000 }),
      ],
      {
        despesas: [
          avulsa({ id: 'a', descricao: 'Consulta; retorno', marcaId: 'm', categoriaId: 'cat-saude', meioPagamentoId: 'mp-pix', observacoes: 'linha1\nlinha2' }),
          parcelada({ id: 'p', descricao: 'Celular', categoriaId: 'cat-compras', numParcelas: 12 }),
          recorrente({ id: 'r', descricao: 'Streaming', categoriaId: 'cat-assinaturas', meioPagamentoId: 'mp-cartao' }),
        ],
        categorias: CATEGORIAS_PADRAO,
        marcas: [{ id: 'm', nome: 'Clínica "Boa"', apelidos: [] }],
        meios: [CARTAO, PIX],
      },
      '2026-10-06',
    );

    expect(gerarCsv(itens)).toBe(
      '﻿' +
        'Descrição;Loja/marca;Categoria;Tipo;Parcela;Mês;Vencimento;Valor;Situação;Pago em;Meio de pagamento;Observações\r\n' +
        '"Consulta; retorno";"Clínica ""Boa""";Saúde;Avulsa;;10/2026;05/10/2026;1234,56;Atrasada;;Pix;"linha1\nlinha2"\r\n' +
        'Celular;;Compras;Parcelada;11/12;10/2026;;450,00;Sem vencimento;;;\r\n' +
        'Streaming;;Assinaturas;Recorrente;;10/2026;08/10/2026;40,00;Paga;08/10/2026;Cartão Teste;\r\n',
    );
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/dados/backup.test.ts tests/dados/csv.test.ts`
Expected: FAIL — imports `backup` e `csv` não resolvidos.

- [ ] **Step 4: Implementar `src/dados/backup.ts`**

```ts
import type { Configuracao, DataISO } from '../dominio/tipos';
import { VERSAO_ESQUEMA, type ArquivoBackup, type DadosBackup, type JuliusDB } from './db';

export const APP_ID = 'julius-finance';
export const VERSAO_BACKUP = 1;
const MAX_SNAPSHOTS = 3;

type TipoCampo = 'string' | 'number' | 'inteiro' | 'boolean' | 'array';
type Tabela = Exclude<keyof DadosBackup, 'configuracao'>;

/** Campos obrigatórios de cada lista. Campos opcionais não são exigidos. */
const ESQUEMAS: Record<Tabela, Record<string, TipoCampo>> = {
  categorias: { id: 'string', nome: 'string', cor: 'string', icone: 'string', ordem: 'number' },
  marcas: { id: 'string', nome: 'string', apelidos: 'array' },
  meiosPagamento: { id: 'string', nome: 'string', tipo: 'string' },
  despesas: { id: 'string', tipo: 'string', descricao: 'string', categoriaId: 'string', observacoes: 'string', aConfirmar: 'array' },
  lancamentos: { id: 'string', despesaId: 'string', mes: 'string', valor: 'inteiro', estimado: 'boolean' },
  historico: { id: 'string', despesaId: 'string', quando: 'string', acao: 'string', mudancas: 'array' },
};
const TIPOS_DESPESA = new Set(['avulsa', 'parcelada', 'recorrente']);

export type ResultadoLeitura = { ok: true; arquivo: ArquivoBackup } | { ok: false; erro: string };

const falha = (erro: string): ResultadoLeitura => ({ ok: false, erro });
const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function confere(valor: unknown, tipo: TipoCampo): boolean {
  if (tipo === 'array') return Array.isArray(valor);
  if (tipo === 'inteiro') return Number.isInteger(valor);
  return typeof valor === tipo;
}

export async function exportar(base: JuliusDB, agora = new Date().toISOString()): Promise<ArquivoBackup> {
  return base.transaction(
    'r',
    [base.categorias, base.marcas, base.meios, base.despesas, base.lancamentos, base.historico, base.config],
    async () => {
      const [categorias, marcas, meiosPagamento, despesas, lancamentos, historico, cfg] = await Promise.all([
        base.categorias.toArray(),
        base.marcas.toArray(),
        base.meios.toArray(),
        base.despesas.toArray(),
        base.lancamentos.toArray(),
        base.historico.toArray(),
        base.config.get('config'),
      ]);
      const configuracao: Configuracao = cfg
        ? { versaoEsquema: cfg.versaoEsquema, ...(cfg.ultimoBackupEm ? { ultimoBackupEm: cfg.ultimoBackupEm } : {}) }
        : { versaoEsquema: VERSAO_ESQUEMA };
      return {
        app: APP_ID,
        versao: VERSAO_BACKUP,
        exportadoEm: agora,
        dados: { categorias, marcas, meiosPagamento, despesas, lancamentos, historico, configuracao },
      };
    },
  );
}

export function serializar(a: ArquivoBackup): string {
  return JSON.stringify(a, null, 2);
}

export function nomeArquivoBackup(hoje: DataISO): string {
  return `julius-backup-${hoje}.json`;
}

export function lerBackup(texto: string): ResultadoLeitura {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return falha('O arquivo não é um JSON válido.');
  }
  if (!ehObjeto(json) || json.app !== APP_ID) return falha('Este arquivo não é um backup do Julius.');
  if (typeof json.versao !== 'number') return falha('Versão do backup ausente.');
  if (json.versao > VERSAO_BACKUP) {
    return falha('Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo.');
  }
  const dados = json.dados;
  if (!ehObjeto(dados)) return falha('Arquivo incompleto: faltam os dados.');

  for (const [tabela, esquema] of Object.entries(ESQUEMAS)) {
    const lista = dados[tabela];
    if (!Array.isArray(lista)) return falha(`Arquivo incompleto: falta a lista "${tabela}".`);
    const ids = new Set<string>();
    for (const [i, registro] of lista.entries()) {
      if (!ehObjeto(registro)) return falha(`Arquivo inválido: ${tabela}[${i}] não é um registro.`);
      for (const [campo, tipo] of Object.entries(esquema)) {
        if (!confere(registro[campo], tipo)) {
          return falha(`Arquivo inválido: ${tabela}[${i}].${campo} ausente ou com tipo errado.`);
        }
      }
      const id = registro.id as string;
      if (ids.has(id)) return falha(`Arquivo inválido: ID repetido em ${tabela} ("${id}").`);
      ids.add(id);
    }
  }

  const despesas = dados.despesas as Record<string, unknown>[];
  for (const [i, d] of despesas.entries()) {
    if (!TIPOS_DESPESA.has(d.tipo as string)) return falha(`Arquivo inválido: despesas[${i}].tipo ausente ou com tipo errado.`);
  }
  const idsDespesas = new Set(despesas.map((d) => d.id as string));
  for (const l of dados.lancamentos as Record<string, unknown>[]) {
    if (!idsDespesas.has(l.despesaId as string)) {
      return falha(`Arquivo inválido: o lançamento "${l.id as string}" aponta para uma despesa que não existe.`);
    }
  }

  const configuracao: Configuracao =
    ehObjeto(dados.configuracao) && typeof dados.configuracao.versaoEsquema === 'number'
      ? (dados.configuracao as unknown as Configuracao)
      : { versaoEsquema: VERSAO_ESQUEMA };

  return {
    ok: true,
    arquivo: migrar({
      app: APP_ID,
      versao: json.versao,
      exportadoEm: typeof json.exportadoEm === 'string' ? json.exportadoEm : '',
      dados: { ...(dados as unknown as DadosBackup), configuracao },
    }),
  };
}

/** Converte backups de versões antigas para a atual. Hoje só existe a versão 1. */
function migrar(a: ArquivoBackup): ArquivoBackup {
  return { ...a, versao: VERSAO_BACKUP };
}

export function resumirBackup(a: ArquivoBackup): { despesas: number; lancamentos: number; exportadoEm: string } {
  return { despesas: a.dados.despesas.length, lancamentos: a.dados.lancamentos.length, exportadoEm: a.exportadoEm };
}

async function substituirTudo(base: JuliusDB, d: DadosBackup): Promise<void> {
  await Promise.all([
    base.categorias.clear(),
    base.marcas.clear(),
    base.meios.clear(),
    base.despesas.clear(),
    base.lancamentos.clear(),
    base.historico.clear(),
    base.config.clear(),
  ]);
  await base.categorias.bulkAdd(d.categorias);
  await base.marcas.bulkAdd(d.marcas);
  await base.meios.bulkAdd(d.meiosPagamento);
  await base.despesas.bulkAdd(d.despesas);
  await base.lancamentos.bulkAdd(d.lancamentos);
  await base.historico.bulkAdd(d.historico);
  await base.config.put({ id: 'config', ...d.configuracao });
}

/** Guarda uma cópia dos dados atuais e substitui tudo pelo arquivo. Tudo ou nada. */
export async function importar(base: JuliusDB, arquivo: ArquivoBackup): Promise<void> {
  const atual = await exportar(base);
  await base.transaction('rw', base.tables, async () => {
    const ultimo = await base.snapshots.orderBy('seq').last();
    await base.snapshots.add({
      id: crypto.randomUUID(),
      seq: (ultimo?.seq ?? 0) + 1,
      criadoEm: new Date().toISOString(),
      arquivo: atual,
    });
    const todos = await base.snapshots.orderBy('seq').toArray();
    const excesso = todos.slice(0, Math.max(0, todos.length - MAX_SNAPSHOTS));
    if (excesso.length > 0) await base.snapshots.bulkDelete(excesso.map((s) => s.id));
    await substituirTudo(base, arquivo.dados);
  });
}

export async function temImportacaoParaDesfazer(base: JuliusDB): Promise<boolean> {
  return (await base.snapshots.count()) > 0;
}

export async function desfazerImportacao(base: JuliusDB): Promise<boolean> {
  return base.transaction('rw', base.tables, async () => {
    const ultimo = await base.snapshots.orderBy('seq').last();
    if (!ultimo) return false;
    await substituirTudo(base, ultimo.arquivo.dados);
    await base.snapshots.delete(ultimo.id);
    return true;
  });
}
```

- [ ] **Step 5: Implementar `src/dados/csv.ts`**

```ts
import { formatarData, formatarMesCsv } from '../dominio/datas';
import { valorEfetivo, type ItemLista } from '../dominio/resumo';
import type { Centavos, Situacao, TipoDespesa } from '../dominio/tipos';

const COLUNAS = [
  'Descrição', 'Loja/marca', 'Categoria', 'Tipo', 'Parcela', 'Mês', 'Vencimento',
  'Valor', 'Situação', 'Pago em', 'Meio de pagamento', 'Observações',
];
const TIPO: Record<TipoDespesa, string> = { avulsa: 'Avulsa', parcelada: 'Parcelada', recorrente: 'Recorrente' };
const SITUACAO: Record<Situacao, string> = {
  paga: 'Paga',
  pendente: 'Pendente',
  atrasada: 'Atrasada',
  'sem-vencimento': 'Sem vencimento',
};

function campo(texto: string): string {
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** '1234,56' — sem separador de milhar, para o Excel em pt-BR ler como número. */
function valorCsv(c: Centavos): string {
  const abs = Math.abs(c);
  return `${c < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function gerarCsv(itens: ItemLista[]): string {
  const linhas = [
    COLUNAS,
    ...itens.map((i) => {
      const l = i.lancamento;
      const d = i.despesa;
      return [
        d.descricao,
        i.marca?.nome ?? '',
        i.categoria?.nome ?? '',
        TIPO[d.tipo],
        d.tipo === 'parcelada' && l.numero ? `${l.numero}/${d.numParcelas}` : '',
        formatarMesCsv(l.mes),
        l.vencimento ? formatarData(l.vencimento) : '',
        valorCsv(valorEfetivo(l)),
        SITUACAO[i.situacao],
        l.pagoEm ? formatarData(l.pagoEm) : '',
        i.meio?.nome ?? '',
        d.observacoes,
      ];
    }),
  ];
  return '﻿' + linhas.map((linha) => linha.map(campo).join(';')).join('\r\n') + '\r\n';
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/dados` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 7: Confirmar que o round-trip pega erro de codificação**

Em `serializar`, troque temporariamente por `JSON.stringify(a).normalize('NFD')`. Run: `npx vitest run tests/dados/backup.test.ts -t "round-trip"` → Expected: FAIL (descrição com acento decomposto). Desfaça → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/dados/backup.ts src/dados/csv.ts tests/dados/backup.test.ts tests/dados/csv.test.ts
git commit -m "feat(dados): backup JSON validado com desfazer e exportação CSV" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Catálogo de marcas, identificação, ícones e componente Logo

**Files:**
- Create: `scripts/gerar-catalogo-marcas.mjs`, `src/marcas/tipos.ts`, `src/marcas/catalogo.gerado.ts` (gerado), `src/marcas/identificar.ts`, `src/ui/icones.tsx`, `src/ui/componentes/Logo.tsx`
- Test: `tests/marcas/identificar.test.ts`, `tests/ui/Logo.test.tsx`

**Interfaces:**
- Consumes: `normalizar` (Task 6), tipos.
- Produces:
  - `interface MarcaCatalogo { slug: string; nome: string; hex: string; path: string }`
  - `CATALOGO: MarcaCatalogo[]`
  - `buscarNoCatalogo(slug: string): MarcaCatalogo | undefined`
  - `contemTermo(texto: string, termo: string): boolean` (palavra inteira, sem acento/caixa)
  - `type Identificacao = { tipo: 'marca'; marca: Marca } | { tipo: 'catalogo'; item: MarcaCatalogo } | null`
  - `identificarMarca(texto: string, marcas: Marca[], catalogo?: MarcaCatalogo[]): Identificacao` (marca do usuário vence; termo mais longo vence)
  - `buscarCatalogoPorNome(termo: string, limite?: number): MarcaCatalogo[]`
  - `icones.tsx`: `ICONES: Record<string, ComponentType<...>>`, `NOMES_ICONES: string[]`, `Icone({ nome, tamanho? })`
  - `Logo({ marca?, categoria?, rotulo: string, tamanho?: number })`, `iniciais(texto): string`

- [ ] **Step 1: Criar `src/marcas/tipos.ts` e o script**

`src/marcas/tipos.ts`:

```ts
export interface MarcaCatalogo {
  slug: string;
  nome: string;
  /** Cor da marca sem '#'. */
  hex: string;
  /** Caminho SVG em viewBox 0 0 24 24. */
  path: string;
}
```

`scripts/gerar-catalogo-marcas.mjs`:

```js
// Gera src/marcas/catalogo.gerado.ts com uma seleção do pacote simple-icons (licença CC0).
import { writeFileSync } from 'node:fs';
import * as icones from 'simple-icons';

const SLUGS = [
  'netflix', 'spotify', 'youtube', 'youtubemusic', 'hbo', 'hbomax', 'max', 'crunchyroll', 'applemusic', 'appletv',
  'deezer', 'paramountplus', 'twitch', 'playstation', 'steam', 'epicgames', 'icloud', 'google', 'googleplay',
  'googledrive', 'dropbox', 'anthropic', 'claude', 'notion', 'duolingo', 'tinder', 'uber', 'ubereats', 'ifood',
  'airbnb', 'bookingdotcom', 'mercadopago', 'nubank', 'picpay', 'paypal', 'visa', 'mastercard', 'americanexpress',
  'shopee', 'aliexpress', 'carrefour', 'mcdonalds', 'burgerking', 'starbucks', 'kfc', 'cocacola', 'shell', 'vivo',
  'apple', 'samsung', 'xiaomi', 'motorola', 'dell', 'lenovo', 'hp', 'lg', 'sony', 'nike', 'adidas', 'puma', 'zara',
  'handm', 'ikea', 'leroymerlin', 'waze', 'googlemaps', 'appstore', 'github', 'discord', 'whatsapp', 'telegram',
  'instagram', 'facebook', 'tiktok', 'pinterest', 'reddit', 'patreon', 'audible', 'medium', 'dazn', 'nba',
  'pagseguro', 'wise', 'revolut', 'binance', 'coinbase', 'ebay', 'etsy', 'zoom', 'trello', 'figma', 'mubi', 'vimeo',
  'soundcloud', 'tidal', 'bandcamp', 'wikipedia', 'protonmail', 'proton', 'bitwarden', '1password', 'nordvpn',
  'expressvpn', 'mullvad', 'surfshark', 'cloudflare', 'vercel', 'digitalocean', 'hostinger', 'godaddy', 'namecheap',
];

const porSlug = new Map(
  Object.values(icones)
    .filter((i) => i && typeof i === 'object' && 'slug' in i)
    .map((i) => [i.slug, i]),
);
const faltando = SLUGS.filter((s) => !porSlug.has(s));
if (faltando.length > 0) {
  console.error(`Slugs inexistentes no simple-icons: ${faltando.join(', ')}`);
  process.exit(1);
}
const itens = SLUGS.map((s) => {
  const i = porSlug.get(s);
  return { slug: s, nome: i.title, hex: i.hex, path: i.path };
});
const conteudo =
  '// Gerado por scripts/gerar-catalogo-marcas.mjs a partir do pacote simple-icons (CC0). Não editar à mão.\n' +
  "import type { MarcaCatalogo } from './tipos';\n\n" +
  `export const CATALOGO: MarcaCatalogo[] = ${JSON.stringify(itens, null, 2)};\n`;
writeFileSync(new URL('../src/marcas/catalogo.gerado.ts', import.meta.url), conteudo, { encoding: 'utf-8' });
console.log(`${itens.length} marcas gravadas em src/marcas/catalogo.gerado.ts`);
```

- [ ] **Step 2: Gerar o catálogo**

Run: `npm run marcas`
Expected: `112 marcas gravadas em src/marcas/catalogo.gerado.ts` (o número exato é o tamanho de `SLUGS`). Se aparecer "Slugs inexistentes", remova esses slugs da lista e rode de novo.

- [ ] **Step 3: Escrever os testes**

`tests/marcas/identificar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buscarCatalogoPorNome, buscarNoCatalogo, contemTermo, identificarMarca } from '../../src/marcas/identificar';

const slug = (texto: string) => {
  const r = identificarMarca(texto, []);
  return r?.tipo === 'catalogo' ? r.item.slug : r;
};

describe('contemTermo', () => {
  it('compara palavras inteiras, sem acento e sem caixa', () => {
    expect(contemTermo('Academia Força Total', 'forca total')).toBe(true);
    expect(contemTermo('Maxi Mercado', 'Max')).toBe(false);
    expect(contemTermo('Pão de Açúcar', 'acucar')).toBe(true);
    expect(contemTermo('qualquer', '')).toBe(false);
  });
});

describe('identificarMarca', () => {
  it('acha no catálogo pelo nome dentro da descrição', () => {
    expect(slug('Google Fotos extra')).toBe('google');
    expect(slug('Spotify Premium')).toBe('spotify');
    expect(slug('NETFLIX padrão')).toBe('netflix');
  });

  it('termo mais longo vence', () => {
    expect(slug('Google Drive extra')).toBe('googledrive');
  });

  it('não confunde pedaço de palavra e devolve null quando não acha', () => {
    expect(slug('Maxi Mercado')).toBeNull();
    expect(slug('Açaí da esquina')).toBeNull();
  });

  it('marca do usuário (nome ou apelido) vence o catálogo', () => {
    const marcas = [{ id: 'ft', nome: 'Força Total', apelidos: [] }, { id: 'm', nome: 'Música da família', apelidos: ['spotify'] }];
    expect(identificarMarca('Academia Força Total', marcas)).toEqual({ tipo: 'marca', marca: marcas[0] });
    expect(identificarMarca('Spotify', marcas)).toEqual({ tipo: 'marca', marca: marcas[1] });
  });
});

describe('catálogo', () => {
  it('busca por slug e por nome', () => {
    expect(buscarNoCatalogo('spotify')?.nome).toBe('Spotify');
    expect(buscarNoCatalogo('nao-existe')).toBeUndefined();
    expect(buscarCatalogoPorNome('goo').map((i) => i.slug)).toContain('google');
    expect(buscarCatalogoPorNome('  ')).toEqual([]);
  });
});
```

`tests/ui/Logo.test.tsx`:

```tsx
import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { iniciais, Logo } from '../../src/ui/componentes/Logo';
import { buscarNoCatalogo } from '../../src/marcas/identificar';

describe('Logo', () => {
  it('usa a imagem enviada pelo usuário primeiro', () => {
    const { container } = render(
      <Logo rotulo="x" marca={{ id: 'm', nome: 'M', apelidos: [], logoImagem: 'data:image/png;base64,AAA', logoSlug: 'spotify' }} />,
    );
    expect(container.querySelector('img')!.getAttribute('src')).toBe('data:image/png;base64,AAA');
  });

  it('depois o logo do catálogo, com a cor da marca', () => {
    const { container } = render(<Logo rotulo="x" marca={{ id: 'm', nome: 'M', apelidos: [], logoSlug: 'spotify' }} />);
    const path = container.querySelector('path')!;
    const item = buscarNoCatalogo('spotify')!;
    expect(path.getAttribute('d')).toBe(item.path);
    expect(path.getAttribute('fill')).toBe(`#${item.hex}`);
  });

  it('sem logo, usa o ícone da categoria', () => {
    const { container } = render(<Logo rotulo="x" categoria={{ id: 'c', nome: 'Saúde', cor: '#047857', icone: 'heartbeat', ordem: 1 }} />);
    expect(container.querySelector('.logo-icone svg')).not.toBeNull();
  });

  it('sem nada, mostra iniciais', () => {
    const { container } = render(<Logo rotulo="Despesa teste" />);
    expect(container.textContent).toBe('DT');
  });

  it('iniciais', () => {
    expect(iniciais('academia smart fit')).toBe('AS');
    expect(iniciais('Luz')).toBe('L');
    expect(iniciais('   ')).toBe('?');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run tests/marcas tests/ui/Logo.test.tsx`
Expected: FAIL — `identificar` e `Logo` não existem.

- [ ] **Step 5: Implementar `src/marcas/identificar.ts`**

```ts
import { normalizar } from '../dominio/filtros';
import type { Marca } from '../dominio/tipos';
import { CATALOGO } from './catalogo.gerado';
import type { MarcaCatalogo } from './tipos';

const POR_SLUG = new Map(CATALOGO.map((i) => [i.slug, i]));

export type Identificacao = { tipo: 'marca'; marca: Marca } | { tipo: 'catalogo'; item: MarcaCatalogo } | null;

function palavras(texto: string): string {
  return normalizar(texto).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function buscarNoCatalogo(slug: string): MarcaCatalogo | undefined {
  return POR_SLUG.get(slug);
}

/** O texto contém o termo como palavra(s) inteira(s), ignorando acento e caixa. */
export function contemTermo(texto: string, termo: string): boolean {
  const t = palavras(termo);
  return t !== '' && ` ${palavras(texto)} `.includes(` ${t} `);
}

export function identificarMarca(texto: string, marcas: Marca[], catalogo: MarcaCatalogo[] = CATALOGO): Identificacao {
  let melhorMarca: { tamanho: number; marca: Marca } | null = null;
  for (const marca of marcas) {
    for (const termo of [marca.nome, ...marca.apelidos]) {
      if (!contemTermo(texto, termo)) continue;
      const tamanho = palavras(termo).length;
      if (!melhorMarca || tamanho > melhorMarca.tamanho) melhorMarca = { tamanho, marca };
    }
  }
  if (melhorMarca) return { tipo: 'marca', marca: melhorMarca.marca };

  let melhorItem: { tamanho: number; item: MarcaCatalogo } | null = null;
  for (const item of catalogo) {
    if (!contemTermo(texto, item.nome)) continue;
    const tamanho = palavras(item.nome).length;
    if (!melhorItem || tamanho > melhorItem.tamanho) melhorItem = { tamanho, item };
  }
  return melhorItem ? { tipo: 'catalogo', item: melhorItem.item } : null;
}

export function buscarCatalogoPorNome(termo: string, limite = 12): MarcaCatalogo[] {
  const t = palavras(termo);
  if (!t) return [];
  const semEspaco = t.replace(/ /g, '');
  return CATALOGO.filter((i) => palavras(i.nome).includes(t) || i.slug.includes(semEspaco)).slice(0, limite);
}
```

- [ ] **Step 6: Implementar `src/ui/icones.tsx`**

```tsx
import {
  IconBabyCarriage, IconBarbell, IconBolt, IconBook, IconBuildingBank, IconBus, IconCar, IconCash, IconCloud,
  IconCoffee, IconConfetti, IconCreditCard, IconDeviceGamepad2, IconDeviceMobile, IconDeviceTv, IconDog, IconDots,
  IconDroplet, IconFlame, IconGasStation, IconGift, IconHeartbeat, IconHome, IconMovie, IconMusic, IconPaw,
  IconPill, IconPizza, IconPlane, IconReceipt, IconRepeat, IconSchool, IconShirt, IconShoppingBag,
  IconShoppingCart, IconStethoscope, IconTool, IconToolsKitchen2, IconWifi,
} from '@tabler/icons-preact';
import type { ComponentType } from 'preact';

type PropsTabler = { size?: number; stroke?: number; 'aria-hidden'?: 'true' };

/** Ícones disponíveis para categorias e marcas. A chave é gravada no banco: não renomear. */
export const ICONES: Record<string, ComponentType<PropsTabler>> = {
  home: IconHome,
  'tools-kitchen-2': IconToolsKitchen2,
  car: IconCar,
  heartbeat: IconHeartbeat,
  'shopping-bag': IconShoppingBag,
  confetti: IconConfetti,
  repeat: IconRepeat,
  'device-mobile': IconDeviceMobile,
  dots: IconDots,
  wifi: IconWifi,
  paw: IconPaw,
  dog: IconDog,
  school: IconSchool,
  plane: IconPlane,
  'gas-station': IconGasStation,
  bus: IconBus,
  pill: IconPill,
  stethoscope: IconStethoscope,
  barbell: IconBarbell,
  movie: IconMovie,
  'device-tv': IconDeviceTv,
  music: IconMusic,
  cloud: IconCloud,
  gift: IconGift,
  shirt: IconShirt,
  bolt: IconBolt,
  droplet: IconDroplet,
  flame: IconFlame,
  receipt: IconReceipt,
  'credit-card': IconCreditCard,
  cash: IconCash,
  'building-bank': IconBuildingBank,
  'device-gamepad-2': IconDeviceGamepad2,
  book: IconBook,
  coffee: IconCoffee,
  pizza: IconPizza,
  'shopping-cart': IconShoppingCart,
  tool: IconTool,
  'baby-carriage': IconBabyCarriage,
};

export const NOMES_ICONES = Object.keys(ICONES);

export function Icone({ nome, tamanho = 20 }: { nome: string; tamanho?: number }) {
  const Componente = ICONES[nome] ?? IconDots;
  return <Componente size={tamanho} stroke={1.75} aria-hidden="true" />;
}
```

- [ ] **Step 7: Implementar `src/ui/componentes/Logo.tsx`**

```tsx
import type { Categoria, Marca } from '../../dominio/tipos';
import { buscarNoCatalogo } from '../../marcas/identificar';
import { Icone } from '../icones';

const COR_PADRAO = '#57534E';

export function iniciais(texto: string): string {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Identificação visual: imagem enviada → logo do catálogo → ícone da marca/categoria → iniciais.
 * Decorativo (o nome aparece ao lado), por isso aria-hidden.
 */
export function Logo({
  marca,
  categoria,
  rotulo,
  tamanho = 40,
}: {
  marca?: Marca;
  categoria?: Categoria;
  rotulo: string;
  tamanho?: number;
}) {
  const estilo = { width: `${tamanho}px`, height: `${tamanho}px` };
  if (marca?.logoImagem) {
    return <img class="logo logo-imagem" src={marca.logoImagem} alt="" style={estilo} />;
  }
  const item = marca?.logoSlug ? buscarNoCatalogo(marca.logoSlug) : undefined;
  if (item) {
    const lado = Math.round(tamanho * 0.6);
    return (
      <span class="logo logo-catalogo" style={estilo} aria-hidden="true">
        <svg viewBox="0 0 24 24" width={lado} height={lado}>
          <path d={item.path} fill={`#${item.hex}`} />
        </svg>
      </span>
    );
  }
  const cor = marca?.cor ?? categoria?.cor ?? COR_PADRAO;
  const fundo = { ...estilo, color: cor, backgroundColor: `${cor}1f` };
  const icone = marca?.icone ?? categoria?.icone;
  if (icone) {
    return (
      <span class="logo logo-icone" style={fundo} aria-hidden="true">
        <Icone nome={icone} tamanho={Math.round(tamanho * 0.55)} />
      </span>
    );
  }
  return (
    <span class="logo logo-iniciais" style={fundo} aria-hidden="true">
      {iniciais(rotulo)}
    </span>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run tests/marcas tests/ui/Logo.test.tsx` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add scripts/gerar-catalogo-marcas.mjs src/marcas src/ui/icones.tsx src/ui/componentes/Logo.tsx tests/marcas tests/ui/Logo.test.tsx
git commit -m "feat(marcas): catálogo embutido do simple-icons, identificação e componente Logo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 10: Casca da interface (estilos, rotas, contexto, navegação, toast)

**Files:**
- Create: `src/ui/estilos.css`, `src/ui/contexto.ts`, `src/ui/Provedores.tsx`, `src/ui/rota.ts`, `src/ui/consulta.ts`, `src/ui/estado.ts`, `src/ui/textos.ts`, `src/ui/componentes/Toast.tsx`, `src/ui/componentes/Navegacao.tsx`, `src/ui/componentes/EstadoVazio.tsx`, `src/ui/componentes/Campo.tsx`, `src/ui/componentes/PilulaSituacao.tsx`, `src/ui/Casca.tsx`, `src/ui/App.tsx`, `tests/ui/auxiliar.tsx`
- Modify: `src/main.tsx` (substituir pelo conteúdo abaixo)
- Test: `tests/ui/rota.test.ts`, `tests/ui/App.test.tsx`, `tests/ui/Toast.test.tsx`

**Interfaces:**
- Consumes: `JuliusDB`, `db`, `materializarTodas` (Task 7); `Cadastros` (Task 6); `RegistroConfig` (Task 7); `Icone` (Task 9).
- Produces:
  - `contexto.ts`: `BaseContexto`, `HojeContexto`, `MesContexto`, `usarBase()`, `usarHoje()`, `usarMes(): { mes: MesISO; setMes(m) }`
  - `Provedores({ base, hoje, children })`
  - `rota.ts`: `type Rota`, `lerRota(hash): Rota`, `caminho(r: Rota): string`, `usarRota(): Rota`, `navegar(r: Rota): void`
  - `consulta.ts`: `usarConsulta<T>(consulta: () => Promise<T>, deps: unknown[]): T | undefined` (Dexie `liveQuery`)
  - `estado.ts`: `interface Estado extends Cadastros { lancamentos: Lancamento[]; config?: RegistroConfig }`, `usarEstado(): Estado | undefined`
  - `textos.ts`: `ROTULO_FREQUENCIA`, `ROTULO_TIPO`, `ROTULO_SITUACAO`, `ROTULO_MEIO`, `ROTULO_A_CONFIRMAR`, `ROTULO_ACAO`, `plural(n, um, varios)`
  - Componentes: `ToastProvider`, `usarToast(): (texto: string, acao?: { rotulo: string; executar: () => void }) => void`, `Navegacao({ rota })`, `EstadoVazio({ icone?, titulo, texto?, acao? })`, `Campo({ id, rotulo, erro?, dica?, children })`, `PilulaSituacao({ situacao, vencimento?, estimado? })`, `textoSituacao(s, vencimento?)`
  - `Casca()` — escolhe a tela pela rota. Nesta tarefa, as telas ainda não existem: a Casca mostra `EmBreve` para todas. As Tasks 11–15 trocam cada caso; a Task 15 apaga `EmBreve`.
  - `App({ base?, hoje? })`
  - `tests/ui/auxiliar.tsx`: `HOJE`, `novaBase()`, `ComEstado({ filho })`, `renderizar(ui, base, hoje?)`

- [ ] **Step 1: Escrever os testes**

`tests/ui/rota.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { caminho, lerRota, type Rota } from '../../src/ui/rota';

describe('rotas', () => {
  it.each<[string, Rota]>([
    ['', { tela: 'inicio' }],
    ['#/', { tela: 'inicio' }],
    ['#/lancamentos', { tela: 'lancamentos' }],
    ['#/nova', { tela: 'nova' }],
    ['#/despesas', { tela: 'despesas' }],
    ['#/despesas/abc', { tela: 'despesa', id: 'abc' }],
    ['#/editar/x%20y', { tela: 'editar', id: 'x y' }],
    ['#/backup', { tela: 'backup' }],
    ['#/qualquer-coisa', { tela: 'inicio' }],
    ['#/nova/demais', { tela: 'inicio' }],
  ])('lerRota(%s)', (hash, esperado) => {
    expect(lerRota(hash)).toEqual(esperado);
  });

  it('caminho e lerRota são inversos', () => {
    const rotas: Rota[] = [
      { tela: 'inicio' }, { tela: 'lancamentos' }, { tela: 'nova' }, { tela: 'editar', id: 'a#1 b' },
      { tela: 'despesas' }, { tela: 'despesa', id: 'r@2026-10' }, { tela: 'ajustes' }, { tela: 'categorias' },
      { tela: 'marcas' }, { tela: 'meios' }, { tela: 'backup' }, { tela: 'dados' },
    ];
    for (const r of rotas) expect(lerRota(caminho(r))).toEqual(r);
  });
});
```

`tests/ui/Toast.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, usarToast } from '../../src/ui/componentes/Toast';

function Disparador({ executar }: { executar: () => void }) {
  const mostrar = usarToast();
  return (
    <button type="button" onClick={() => mostrar('Despesa paga', { rotulo: 'Desfazer', executar })}>
      disparar
    </button>
  );
}

describe('Toast', () => {
  it('mostra a mensagem e executa a ação uma vez', () => {
    const executar = vi.fn();
    render(
      <ToastProvider>
        <Disparador executar={executar} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    expect(screen.getByText('Despesa paga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(executar).toHaveBeenCalledOnce();
    expect(screen.queryByText('Despesa paga')).toBeNull();
  });

  it('some sozinho depois de 5 segundos', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Disparador executar={() => undefined} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('disparar'));
    vi.advanceTimersByTime(5001);
    expect(screen.queryByText('Despesa paga')).toBeNull();
    vi.useRealTimers();
  });
});
```

`tests/ui/auxiliar.tsx`:

```tsx
import { render } from '@testing-library/preact';
import type { ComponentChildren, JSX } from 'preact';
import { JuliusDB } from '../../src/dados/db';
import type { DataISO } from '../../src/dominio/tipos';
import { usarEstado, type Estado } from '../../src/ui/estado';
import { Provedores } from '../../src/ui/Provedores';

export const HOJE = '2026-10-06';

export async function novaBase(): Promise<JuliusDB> {
  const base = new JuliusDB(`teste-${crypto.randomUUID()}`);
  await base.open();
  return base;
}

/** Renderiza `filho` com o estado vivo do banco (como a Casca faz). */
export function ComEstado({ filho }: { filho: (e: Estado) => JSX.Element }) {
  const estado = usarEstado();
  return estado ? filho(estado) : null;
}

export function renderizar(ui: ComponentChildren, base: JuliusDB, hoje: DataISO = HOJE) {
  return render(
    <Provedores base={base} hoje={hoje}>
      {ui}
    </Provedores>,
  );
}
```

`tests/ui/App.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import { App } from '../../src/ui/App';
import { HOJE, novaBase } from './auxiliar';

describe('App', () => {
  it('explica o problema quando o armazenamento não abre', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const base = { open: () => Promise.reject(new Error('bloqueado')) } as unknown as JuliusDB;
    render(<App base={base} hoje={HOJE} />);
    expect(await screen.findByRole('heading', { name: 'Não foi possível abrir seus dados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('abre e mostra a navegação principal', async () => {
    render(<App base={await novaBase()} hoje={HOJE} />);
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    for (const nome of ['Início', 'Lançamentos', 'Nova despesa', 'Despesas', 'Ajustes']) {
      expect(within(nav).getByRole('link', { name: nome })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui/rota.test.ts tests/ui/Toast.test.tsx tests/ui/App.test.tsx`
Expected: FAIL — módulos `rota`, `Toast`, `App` não existem.

- [ ] **Step 3: Criar `src/ui/estilos.css`**

```css
:root {
  color-scheme: light dark;
  --fundo: #f6f5f2;
  --superficie: #ffffff;
  --superficie-2: #efede8;
  --texto: #1c1b19;
  --texto-2: #5f5e5a;
  --texto-3: #85847e;
  --borda: rgba(0, 0, 0, 0.1);
  --acento: #1f6feb;
  --acento-texto: #ffffff;
  --acento-suave: #e6f0fd;
  --perigo: #b42318;
  --perigo-suave: #fdecec;
  --sucesso: #1e7a34;
  --sucesso-suave: #e7f4ea;
  --aviso: #8a5a00;
  --aviso-suave: #fff4dc;
  --raio: 12px;
  --toque: 44px;
  --nav-altura: 64px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.45;
  -webkit-text-size-adjust: 100%;
}

@media (prefers-color-scheme: dark) {
  :root {
    --fundo: #000000;
    --superficie: #1c1c1e;
    --superficie-2: #2c2c2e;
    --texto: #f2f2f7;
    --texto-2: #aeaeb2;
    --texto-3: #8e8e93;
    --borda: rgba(255, 255, 255, 0.14);
    --acento: #3b8cff;
    --acento-suave: #0d2747;
    --perigo: #ff6b6b;
    --perigo-suave: #3b1414;
    --sucesso: #63d47a;
    --sucesso-suave: #10301a;
    --aviso: #ffcc66;
    --aviso-suave: #3a2c0a;
  }
}

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--fundo); color: var(--texto); }
body { min-height: 100dvh; -webkit-tap-highlight-color: transparent; }
h1 { font-size: 1.5rem; font-weight: 650; margin: 0 0 1rem; }
h2 { font-size: 1.125rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
a { color: var(--acento); }
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
.visualmente-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Casca e navegação */
.casca { min-height: 100dvh; }
.conteudo {
  max-width: 720px;
  margin: 0 auto;
  padding: calc(env(safe-area-inset-top) + 16px) 16px calc(var(--nav-altura) + env(safe-area-inset-bottom) + 32px);
}
.navegacao {
  position: fixed; z-index: 10; left: 0; right: 0; bottom: 0;
  display: flex; align-items: center; justify-content: space-around;
  height: calc(var(--nav-altura) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--superficie); border-top: 1px solid var(--borda);
}
.nav-marca { display: none; }
.nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 64px; min-height: var(--toque); padding: 6px 4px;
  color: var(--texto-2); text-decoration: none; font-size: 0.6875rem;
}
.nav-item[aria-current='page'] { color: var(--acento); }
.nav-nova {
  display: flex; align-items: center; justify-content: center;
  width: 56px; height: 56px; margin-top: -28px; border-radius: 50%;
  background: var(--acento); color: var(--acento-texto); text-decoration: none;
  box-shadow: 0 4px 14px rgba(31, 111, 235, 0.35);
}
.nav-nova-rotulo { display: none; }

@media (min-width: 768px) {
  .casca { display: grid; grid-template-columns: 232px 1fr; }
  .navegacao {
    position: sticky; top: 0; height: 100dvh;
    flex-direction: column; justify-content: flex-start; align-items: stretch; gap: 4px;
    padding: 24px 12px; border-top: 0; border-right: 1px solid var(--borda);
  }
  .nav-marca { display: block; font-size: 1.25rem; font-weight: 700; padding: 0 12px 16px; }
  .nav-item { flex-direction: row; gap: 12px; padding: 10px 12px; border-radius: 10px; font-size: 1rem; }
  .nav-item[aria-current='page'] { background: var(--acento-suave); }
  .nav-nova { order: -1; width: auto; height: 48px; margin: 0 0 12px; border-radius: 10px; gap: 8px; box-shadow: none; }
  .nav-nova-rotulo { display: inline; font-weight: 600; }
  .conteudo { max-width: 960px; padding: 32px 32px 48px; }
  .grade-inicio { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
}

/* Botões */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: var(--toque); padding: 0 16px; border: 1px solid var(--borda); border-radius: 10px;
  background: var(--superficie); color: var(--texto); font-weight: 600; text-decoration: none; cursor: pointer;
}
.botao:disabled { opacity: 0.6; cursor: default; }
.botao-primario { background: var(--acento); color: var(--acento-texto); border-color: transparent; }
.botao-perigo { color: var(--perigo); }
.botao-largo { width: 100%; }
.botao-icone {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: var(--toque); height: var(--toque); border: 0; border-radius: 50%;
  background: transparent; color: var(--texto-2); cursor: pointer;
}
.botao-pagar { color: var(--sucesso); background: var(--sucesso-suave); }
.acoes { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }

/* Cartões e métricas */
.cartao { background: var(--superficie); border: 1px solid var(--borda); border-radius: var(--raio); padding: 16px; margin: 12px 0; }
.cartao h2:first-child { margin-top: 0; }
.cartoes-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.metrica { background: var(--superficie); border-radius: var(--raio); padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.metrica-destaque { grid-column: 1 / -1; }
.metrica-rotulo { font-size: 0.8125rem; color: var(--texto-2); }
.metrica-valor { font-size: 1.25rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.metrica-destaque .metrica-valor { font-size: 1.875rem; }
.metrica-pequena .metrica-valor { font-size: 1rem; }
.positivo { color: var(--sucesso); }
.negativo { color: var(--perigo); }
.texto-suave { color: var(--texto-2); font-size: 0.875rem; }

/* Avisos */
.aviso {
  display: flex; align-items: center; gap: 10px; min-height: var(--toque);
  padding: 10px 14px; margin: 12px 0; border-radius: 10px;
  background: var(--superficie-2); color: var(--texto); text-decoration: none;
}
.aviso-atencao { background: var(--aviso-suave); color: var(--aviso); }

/* Listas */
.lista { list-style: none; margin: 0; padding: 0; background: var(--superficie); border-radius: var(--raio); overflow: hidden; }
.linha { display: flex; align-items: center; gap: 8px; padding: 0 8px 0 0; border-bottom: 1px solid var(--borda); touch-action: pan-y; }
.linha:last-child { border-bottom: 0; }
.linha-principal {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px;
  padding: 10px 0 10px 12px; min-height: 60px; color: inherit; text-decoration: none;
}
.linha-textos { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.linha-titulo { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.linha-sub { font-size: 0.8125rem; color: var(--texto-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.linha-valores { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.linha-valor { font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Pílulas */
.pilula {
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600;
  white-space: nowrap; background: var(--superficie-2); color: var(--texto-2);
}
.pilula-paga { background: var(--sucesso-suave); color: var(--sucesso); }
.pilula-atrasada { background: var(--perigo-suave); color: var(--perigo); }
.pilula-sem-vencimento { background: var(--aviso-suave); color: var(--aviso); }
.pilula-pendente { background: var(--acento-suave); color: var(--acento); }

/* Logo */
.logo {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 10px; font-size: 0.875rem; font-weight: 700; overflow: hidden;
}
.logo-catalogo, .logo-imagem { background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.08); object-fit: contain; }

/* Início */
.seletor-mes { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.seletor-mes-titulo { margin: 0; font-size: 1.25rem; text-align: center; }
.barras { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.barra-topo { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.875rem; }
.barra-topo h2 { margin: 0; }
.barra-trilho { height: 8px; border-radius: 4px; background: var(--superficie-2); overflow: hidden; }
.barra-preenchida { height: 100%; border-radius: 4px; }
.meses-futuros { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

/* Formulários */
.formulario { display: flex; flex-direction: column; gap: 4px; }
.campo { display: flex; flex-direction: column; gap: 6px; margin: 0 0 12px; border: 0; padding: 0; min-width: 0; }
.campo-rotulo { font-size: 0.875rem; font-weight: 600; color: var(--texto-2); }
.campo input:not([type='checkbox']):not([type='color']):not([type='file']),
.campo select, .campo textarea, .busca {
  width: 100%; min-height: var(--toque); padding: 10px 12px; border: 1px solid var(--borda);
  border-radius: 10px; background: var(--superficie); font-size: 1rem;
}
.campo input[type='color'] { width: 64px; height: var(--toque); border: 1px solid var(--borda); border-radius: 10px; background: var(--superficie); }
.campo textarea { min-height: 88px; resize: vertical; }
.campo-com-erro input, .campo-com-erro select { border-color: var(--perigo); }
.campo-dica { margin: 0; font-size: 0.8125rem; color: var(--texto-2); }
.campo-erro { margin: 0; font-size: 0.8125rem; color: var(--perigo); font-weight: 600; }
.duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.check { display: flex; align-items: center; gap: 10px; min-height: var(--toque); }
.check input { width: 22px; height: 22px; }
.segmentado { display: flex; padding: 3px; margin-bottom: 16px; border-radius: 10px; background: var(--superficie-2); }
.segmentado button {
  flex: 1; min-height: 40px; border: 0; border-radius: 8px; background: transparent;
  font-weight: 600; color: var(--texto-2); cursor: pointer;
}
.segmentado button[aria-checked='true'], .segmentado button[aria-selected='true'] {
  background: var(--superficie); color: var(--texto); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.previa { margin: 8px 0 16px; }
.previa ul { list-style: none; padding: 0; margin: 0; }
.previa li {
  display: grid; grid-template-columns: 4.5rem 1fr auto; gap: 8px; padding: 8px 0;
  border-bottom: 1px solid var(--borda); font-variant-numeric: tabular-nums;
}
.erro-geral { color: var(--perigo); font-weight: 600; }
.grade-icones { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 6px; }
.grade-icones button {
  width: 44px; height: 44px; border: 1px solid var(--borda); border-radius: 10px;
  background: var(--superficie); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
}
.grade-icones button[aria-pressed='true'] { border: 2px solid var(--acento); color: var(--acento); }

/* Filtros */
.busca { margin-bottom: 4px; }
.filtros { display: flex; gap: 8px; overflow-x: auto; margin: 0 -16px; padding: 8px 16px; }
.filtros select {
  flex: none; min-height: 40px; padding: 0 12px; border: 1px solid var(--borda);
  border-radius: 999px; background: var(--superficie); font-size: 0.875rem;
}
.filtros select.ativo { background: var(--acento-suave); color: var(--acento); border-color: transparent; }

/* Estado vazio */
.estado-vazio { text-align: center; padding: 32px 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.estado-vazio-icone {
  width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--superficie-2); color: var(--texto-2);
}
.estado-vazio h2 { margin: 8px 0 0; }
.estado-vazio p { margin: 0 0 8px; color: var(--texto-2); max-width: 32ch; }

/* Toast */
.toast-area {
  position: fixed; z-index: 20; left: 16px; right: 16px;
  bottom: calc(var(--nav-altura) + env(safe-area-inset-bottom) + 12px);
  display: flex; justify-content: center; pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 12px; max-width: 480px; padding: 10px 10px 10px 16px;
  border-radius: 12px; background: #1c1b19; color: #ffffff; pointer-events: auto;
}
.toast-acao {
  min-height: 40px; padding: 0 12px; border: 0; border-radius: 8px;
  background: rgba(255, 255, 255, 0.14); color: #ffffff; font-weight: 700; cursor: pointer;
}
@media (min-width: 768px) { .toast-area { bottom: 24px; left: 248px; } }

/* Diversos */
.carregando { padding: 48px; text-align: center; color: var(--texto-2); }
.erro-armazenamento, .boas-vindas { max-width: 480px; margin: 0 auto; padding: 32px 0; }
.voltar { display: inline-flex; align-items: center; min-height: var(--toque); color: var(--texto-2); text-decoration: none; }
.cabecalho-despesa { display: flex; align-items: center; gap: 12px; margin: 4px 0 12px; }
.cabecalho-despesa h1 { margin: 0; }
.historico { list-style: none; padding: 0; margin: 0; font-size: 0.875rem; }
.historico li { padding: 8px 0; border-bottom: 1px solid var(--borda); }
.historico time { color: var(--texto-2); margin-right: 6px; }
```

- [ ] **Step 4: Criar contexto, provedores, rotas, consulta, estado e textos**

`src/ui/contexto.ts`:

```ts
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { db, type JuliusDB } from '../dados/db';
import { hojeISO, mesDe } from '../dominio/datas';
import type { DataISO, MesISO } from '../dominio/tipos';

export interface EstadoMes {
  mes: MesISO;
  setMes: (m: MesISO) => void;
}

export const BaseContexto = createContext<JuliusDB>(db);
export const HojeContexto = createContext<DataISO>(hojeISO());
export const MesContexto = createContext<EstadoMes>({ mes: mesDe(hojeISO()), setMes: () => undefined });

export const usarBase = (): JuliusDB => useContext(BaseContexto);
export const usarHoje = (): DataISO => useContext(HojeContexto);
export const usarMes = (): EstadoMes => useContext(MesContexto);
```

`src/ui/Provedores.tsx`:

```tsx
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { JuliusDB } from '../dados/db';
import { mesDe } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { ToastProvider } from './componentes/Toast';
import { BaseContexto, HojeContexto, MesContexto } from './contexto';

export function Provedores({ base, hoje, children }: { base: JuliusDB; hoje: DataISO; children: ComponentChildren }) {
  const [mes, setMes] = useState(mesDe(hoje));
  return (
    <BaseContexto.Provider value={base}>
      <HojeContexto.Provider value={hoje}>
        <MesContexto.Provider value={{ mes, setMes }}>
          <ToastProvider>{children}</ToastProvider>
        </MesContexto.Provider>
      </HojeContexto.Provider>
    </BaseContexto.Provider>
  );
}
```

`src/ui/rota.ts`:

```ts
import { useEffect, useState } from 'preact/hooks';

export type Rota =
  | { tela: 'inicio' }
  | { tela: 'lancamentos' }
  | { tela: 'nova' }
  | { tela: 'editar'; id: string }
  | { tela: 'despesas' }
  | { tela: 'despesa'; id: string }
  | { tela: 'ajustes' }
  | { tela: 'categorias' }
  | { tela: 'marcas' }
  | { tela: 'meios' }
  | { tela: 'backup' }
  | { tela: 'dados' };

type TelaSimples = Exclude<Rota['tela'], 'editar' | 'despesa'>;
const SIMPLES: readonly TelaSimples[] = [
  'inicio', 'lancamentos', 'nova', 'despesas', 'ajustes', 'categorias', 'marcas', 'meios', 'backup', 'dados',
];

export function lerRota(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = partes;
  if (c !== undefined) return { tela: 'inicio' };
  if (a === 'editar' && b) return { tela: 'editar', id: b };
  if (a === 'despesas' && b) return { tela: 'despesa', id: b };
  if (b === undefined && SIMPLES.includes(a as TelaSimples)) return { tela: a as TelaSimples };
  return { tela: 'inicio' };
}

export function caminho(r: Rota): string {
  if (r.tela === 'editar') return `#/editar/${encodeURIComponent(r.id)}`;
  if (r.tela === 'despesa') return `#/despesas/${encodeURIComponent(r.id)}`;
  return `#/${r.tela}`;
}

export function navegar(r: Rota): void {
  location.hash = caminho(r);
}

export function usarRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(location.hash));
  useEffect(() => {
    const aoMudar = () => {
      setRota(lerRota(location.hash));
      try {
        window.scrollTo(0, 0);
      } catch {
        // jsdom não implementa scrollTo
      }
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return rota;
}
```

`src/ui/consulta.ts`:

```ts
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

/** Executa a consulta e a repete sempre que as tabelas lidas mudarem. */
export function usarConsulta<T>(consulta: () => Promise<T>, deps: unknown[]): T | undefined {
  const [valor, setValor] = useState<{ v: T } | undefined>(undefined);
  useEffect(() => {
    const assinatura = liveQuery(consulta).subscribe({
      next: (v) => setValor({ v }),
      error: (e: unknown) => console.error(e),
    });
    return () => assinatura.unsubscribe();
  }, deps);
  return valor?.v;
}
```

`src/ui/estado.ts`:

```ts
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
```

`src/ui/textos.ts`:

```ts
import type { AcaoHistorico, CampoAConfirmar, Frequencia, Situacao, TipoDespesa, TipoMeio } from '../dominio/tipos';

export const ROTULO_FREQUENCIA: Record<Frequencia, string> = { mensal: 'Mensal', semanal: 'Semanal', anual: 'Anual' };
export const ROTULO_TIPO: Record<TipoDespesa, string> = { avulsa: 'Avulsa', parcelada: 'Parcelada', recorrente: 'Recorrente' };
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  paga: 'Paga',
  pendente: 'Pendente',
  atrasada: 'Atrasada',
  'sem-vencimento': 'Sem vencimento',
};
export const ROTULO_MEIO: Record<TipoMeio, string> = {
  credito: 'Cartão de crédito',
  debito: 'Débito',
  pix: 'Pix',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};
export const ROTULO_A_CONFIRMAR: Record<CampoAConfirmar, string> = {
  vencimento: 'vencimento',
  loja: 'loja ou marca',
  valor: 'valor',
  valorTotal: 'valor total',
  categoria: 'categoria',
  dataCompra: 'data da compra',
  meioPagamento: 'meio de pagamento',
};
export const ROTULO_ACAO: Record<AcaoHistorico, string> = {
  criada: 'Criada',
  editada: 'Editada',
  paga: 'Paga',
  'pagamento desfeito': 'Pagamento desfeito',
  pausada: 'Pausada',
  retomada: 'Retomada',
  encerrada: 'Encerrada',
  importada: 'Importada',
};

export function plural(n: number, um: string, varios: string): string {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}
```

- [ ] **Step 5: Criar os componentes básicos**

`src/ui/componentes/Toast.tsx`:

```tsx
import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';

interface AcaoToast {
  rotulo: string;
  executar: () => void;
}
interface Aviso {
  id: number;
  texto: string;
  acao?: AcaoToast;
}
type Mostrar = (texto: string, acao?: AcaoToast) => void;

const ToastContexto = createContext<Mostrar>(() => undefined);

export const usarToast = (): Mostrar => useContext(ToastContexto);

export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const mostrar = useCallback<Mostrar>((texto, acao) => setAviso({ id: Date.now(), texto, acao }), []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <ToastContexto.Provider value={mostrar}>
      {children}
      <div class="toast-area" aria-live="polite">
        {aviso && (
          <div class="toast" key={aviso.id}>
            <span>{aviso.texto}</span>
            {aviso.acao && (
              <button
                type="button"
                class="toast-acao"
                onClick={() => {
                  aviso.acao!.executar();
                  setAviso(null);
                }}
              >
                {aviso.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContexto.Provider>
  );
}
```

`src/ui/componentes/EstadoVazio.tsx`:

```tsx
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
```

`src/ui/componentes/Campo.tsx`:

```tsx
import type { ComponentChildren } from 'preact';

/** Rótulo visível + controle + dica ou erro. O controle filho deve ter `id={id}`. */
export function Campo({ id, rotulo, erro, dica, children }: { id: string; rotulo: string; erro?: string; dica?: string; children: ComponentChildren }) {
  return (
    <div class={`campo${erro ? ' campo-com-erro' : ''}`}>
      <label for={id} class="campo-rotulo">
        {rotulo}
      </label>
      {children}
      {dica && !erro && <p class="campo-dica">{dica}</p>}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
```

`src/ui/componentes/PilulaSituacao.tsx`:

```tsx
import { formatarDataCurta } from '../../dominio/datas';
import type { DataISO, Situacao } from '../../dominio/tipos';

export function textoSituacao(s: Situacao, vencimento?: DataISO): string {
  if (s === 'paga') return 'Paga';
  if (s === 'sem-vencimento' || !vencimento) return 'Vencimento a confirmar';
  if (s === 'atrasada') return `Atrasada · ${formatarDataCurta(vencimento)}`;
  return `Vence ${formatarDataCurta(vencimento)}`;
}

export function PilulaSituacao({ situacao, vencimento, estimado = false }: { situacao: Situacao; vencimento?: DataISO; estimado?: boolean }) {
  return (
    <span class={`pilula pilula-${situacao}`}>
      {textoSituacao(situacao, vencimento)}
      {estimado && situacao !== 'paga' ? ' · estimado' : ''}
    </span>
  );
}
```

`src/ui/componentes/Navegacao.tsx`:

```tsx
import { IconHome, IconListDetails, IconPlus, IconRepeat, IconSettings } from '@tabler/icons-preact';
import type { Rota } from '../rota';

type Grupo = 'inicio' | 'lancamentos' | 'nova' | 'despesas' | 'ajustes';

function grupoDaRota(tela: Rota['tela']): Grupo {
  if (tela === 'despesa' || tela === 'editar') return 'despesas';
  if (tela === 'categorias' || tela === 'marcas' || tela === 'meios' || tela === 'backup' || tela === 'dados') return 'ajustes';
  return tela;
}

const ITENS = [
  { grupo: 'inicio', rotulo: 'Início', href: '#/inicio', Icone: IconHome },
  { grupo: 'lancamentos', rotulo: 'Lançamentos', href: '#/lancamentos', Icone: IconListDetails },
  { grupo: 'despesas', rotulo: 'Despesas', href: '#/despesas', Icone: IconRepeat },
  { grupo: 'ajustes', rotulo: 'Ajustes', href: '#/ajustes', Icone: IconSettings },
] as const;

export function Navegacao({ rota }: { rota: Rota }) {
  const atual = grupoDaRota(rota.tela);
  const link = (i: (typeof ITENS)[number]) => (
    <a key={i.grupo} href={i.href} class="nav-item" aria-current={atual === i.grupo ? 'page' : undefined}>
      <i.Icone size={24} stroke={1.75} aria-hidden="true" />
      <span>{i.rotulo}</span>
    </a>
  );
  return (
    <nav class="navegacao" aria-label="Principal">
      <span class="nav-marca">Julius</span>
      {link(ITENS[0])}
      {link(ITENS[1])}
      <a href="#/nova" class="nav-nova" aria-label="Nova despesa" aria-current={atual === 'nova' ? 'page' : undefined}>
        <IconPlus size={28} stroke={2} aria-hidden="true" />
        <span class="nav-nova-rotulo">Nova despesa</span>
      </a>
      {link(ITENS[2])}
      {link(ITENS[3])}
    </nav>
  );
}
```

- [ ] **Step 6: Criar `Casca`, `App` e o novo `main.tsx`**

`src/ui/Casca.tsx`:

```tsx
import { EstadoVazio } from './componentes/EstadoVazio';
import { Navegacao } from './componentes/Navegacao';
import { usarEstado, type Estado } from './estado';
import { usarRota, type Rota } from './rota';

// Provisório: cada tela é ligada nas Tasks 11 a 15; a Task 15 remove este componente.
function EmBreve() {
  return <EstadoVazio icone="tool" titulo="Em construção" texto="Esta tela chega numa próxima etapa." />;
}

function Tela({ rota, estado: _estado }: { rota: Rota; estado: Estado }) {
  switch (rota.tela) {
    default:
      return <EmBreve />;
  }
}

export function Casca() {
  const rota = usarRota();
  const estado = usarEstado();
  if (!estado) {
    return (
      <div class="carregando" role="status">
        Carregando…
      </div>
    );
  }
  return (
    <div class="casca">
      <Navegacao rota={rota} />
      <main class="conteudo" id="conteudo">
        <Tela rota={rota} estado={estado} />
      </main>
    </div>
  );
}
```

`src/ui/App.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks';
import { db, type JuliusDB } from '../dados/db';
import { materializarTodas } from '../dados/repositorio';
import { hojeISO } from '../dominio/datas';
import type { DataISO } from '../dominio/tipos';
import { Casca } from './Casca';
import { Provedores } from './Provedores';

function ErroArmazenamento() {
  return (
    <main class="erro-armazenamento">
      <h1>Não foi possível abrir seus dados</h1>
      <p>O navegador bloqueou o armazenamento deste app. Isso acontece em janelas privadas ou quando o armazenamento do aparelho está cheio.</p>
      <p>Abra o app pelo ícone da tela de início, fora da navegação privada, e tente de novo.</p>
      <button type="button" class="botao botao-primario" onClick={() => location.reload()}>
        Tentar de novo
      </button>
    </main>
  );
}

export function App({ base = db, hoje }: { base?: JuliusDB; hoje?: DataISO }) {
  const [dia] = useState(() => hoje ?? hojeISO());
  const [fase, setFase] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    let ativo = true;
    base
      .open()
      .then(() => materializarTodas(base, dia))
      .then(() => {
        if (ativo) setFase('pronto');
      })
      .catch((e: unknown) => {
        console.error(e);
        if (ativo) setFase('erro');
      });
    // Pede ao navegador para não apagar os dados quando faltar espaço.
    void navigator.storage?.persist?.()?.catch(() => false);
    return () => {
      ativo = false;
    };
  }, [base, dia]);

  if (fase === 'erro') return <ErroArmazenamento />;
  if (fase === 'carregando') {
    return (
      <div class="carregando" role="status">
        Carregando…
      </div>
    );
  }
  return (
    <Provedores base={base} hoje={dia}>
      <Casca />
    </Provedores>
  );
}
```

`src/main.tsx`:

```tsx
import { render } from 'preact';
import { App } from './ui/App';
import './ui/estilos.css';

render(<App />, document.getElementById('app')!);
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/ui` → Expected: todos passam.
Run: `npm run build` → Expected: sem erros.

- [ ] **Step 8: Conferir no navegador**

Run: `npm run dev` e abra `http://localhost:5173/julius-finance/`. Expected: barra inferior com 4 itens e o botão **+** central; acima de 768 px de largura, barra lateral. Pare o servidor (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add src/ui src/main.tsx tests/ui
git commit -m "feat(ui): casca com rotas por hash, contexto, navegação, toast e tela de erro de armazenamento" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Tela Início

**Files:**
- Create: `src/ui/componentes/SeletorMes.tsx`, `src/ui/componentes/LinhaLancamento.tsx`, `src/ui/telas/Inicio.tsx`
- Modify: `src/ui/Casca.tsx` (rotear `inicio`)
- Test: `tests/ui/Inicio.test.tsx`

**Interfaces:**
- Consumes: `detalhar`, `resumoDoMes`, `proximosVencimentos`, `faturasDoMes`, `totaisProximosMeses`, `contarAConfirmar`, `backupAtrasado`, `valorEfetivo`, `ItemLista`, `Fatura` (Task 6); `marcarPaga`, `marcarVariosPagos`, `desfazerPagamento`, `desfazerVariosPagamentos` (Task 7); `Logo` (Task 9); contexto, `usarToast`, `PilulaSituacao`, `EstadoVazio`, `caminho`, `ROTULO_FREQUENCIA` (Task 10).
- Produces:
  - `SeletorMes()` (botões "Mês anterior"/"Próximo mês", título = mês por extenso)
  - `LinhaLancamento({ item, onPagar? })` — link para a despesa; botão "Marcar {descrição} como paga"; deslizar para a esquerda (> 70 px) também paga.
  - `descreverLancamento(item: ItemLista): string`
  - `Inicio({ estado })`

- [ ] **Step 1: Escrever os testes**

`tests/ui/Inicio.test.tsx`:

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Inicio } from '../../src/ui/telas/Inicio';
import { avulsa, CARTAO, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

async function popular(): Promise<void> {
  await repo.inicializarPadrao(base);
  await repo.salvarMeio(base, CARTAO, HOJE);
  // Cobrança em 10/09 no cartão (fecha 2, vence 7) → vence 07/10.
  await repo.salvarDespesa(
    base,
    recorrente({ id: 'r', descricao: 'Streaming', meioPagamentoId: CARTAO.id, inicio: '2026-09-10', categoriaId: 'cat-assinaturas' }),
    { hoje: HOJE },
  );
  await repo.salvarDespesa(
    base,
    avulsa({ id: 'a', descricao: 'Conta de luz', vencimento: '2026-10-05', mes: '2026-10', categoriaId: 'cat-moradia' }),
    { hoje: HOJE },
  );
}

function abrir() {
  renderizar(<ComEstado filho={(e) => <Inicio estado={e} />} />, base);
}

const metrica = (rotulo: string) => screen.getByText(rotulo).closest('.metrica') as HTMLElement;

beforeEach(async () => {
  base = await novaBase();
});

describe('Início', () => {
  it('mostra total, pago e pendente do mês', async () => {
    await popular();
    abrir();
    await screen.findByRole('heading', { name: 'outubro de 2026' });
    expect(within(metrica('Total do mês')).getByText('R$ 139,90')).toBeInTheDocument();
    expect(within(metrica('Pago')).getByText('R$ 0,00')).toBeInTheDocument();
    expect(within(metrica('Pendente')).getByText('R$ 139,90')).toBeInTheDocument();
  });

  it('atrasadas aparecem primeiro nos próximos vencimentos', async () => {
    await popular();
    abrir();
    const secao = (await screen.findByRole('heading', { name: 'Próximos vencimentos' })).closest('section')!;
    const linhas = within(secao).getAllByRole('listitem');
    expect(linhas[0]).toHaveTextContent('Conta de luz');
    expect(linhas[0]).toHaveTextContent('Atrasada · 05/10');
  });

  it('marca a fatura do cartão inteira como paga', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar fatura como paga' }));
    expect(await screen.findByText('Fatura paga')).toBeInTheDocument();
    expect((await base.lancamentos.get('r@2026-09'))!.pagoEm).toBe(HOJE);
  });

  it('pagar pela linha e desfazer', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar Conta de luz como paga' }));
    expect(await screen.findByText('Conta de luz marcada como paga')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect((await base.lancamentos.get('a#1'))!.pagoEm).toBeUndefined());
  });

  it('mês sem lançamentos convida a cadastrar', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('Nada lançado em setembro de 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar despesa' })).toHaveAttribute('href', '#/nova');
  });

  it('avisa sobre dados a confirmar e backup', async () => {
    await popular();
    await repo.salvarDespesa(base, avulsa({ id: 'b', aConfirmar: ['vencimento'] }), { hoje: HOJE });
    abrir();
    expect(await screen.findByText('1 despesa tem dados a confirmar')).toBeInTheDocument();
    expect(screen.getByText('Faça um backup: seus dados ficam só neste aparelho.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui/Inicio.test.tsx`
Expected: FAIL — `Failed to resolve import "../../src/ui/telas/Inicio"`.

- [ ] **Step 3: Criar `src/ui/componentes/SeletorMes.tsx`**

```tsx
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-preact';
import { formatarMes, somarMesesAoMes } from '../../dominio/datas';
import { usarMes } from '../contexto';

export function SeletorMes() {
  const { mes, setMes } = usarMes();
  return (
    <div class="seletor-mes">
      <button type="button" class="botao-icone" aria-label="Mês anterior" onClick={() => setMes(somarMesesAoMes(mes, -1))}>
        <IconChevronLeft aria-hidden="true" />
      </button>
      <h1 class="seletor-mes-titulo">{formatarMes(mes)}</h1>
      <button type="button" class="botao-icone" aria-label="Próximo mês" onClick={() => setMes(somarMesesAoMes(mes, 1))}>
        <IconChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Criar `src/ui/componentes/LinhaLancamento.tsx`**

```tsx
import { IconCheck } from '@tabler/icons-preact';
import { useRef } from 'preact/hooks';
import { formatarReais } from '../../dominio/dinheiro';
import { valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { caminho } from '../rota';
import { ROTULO_FREQUENCIA } from '../textos';
import { Logo } from './Logo';
import { PilulaSituacao } from './PilulaSituacao';

const DISTANCIA_DESLIZE = 70;

export function descreverLancamento(item: ItemLista): string {
  const { despesa: d, lancamento: l } = item;
  if (d.tipo === 'parcelada' && l.numero) return `Parcela ${l.numero}/${d.numParcelas}`;
  if (d.tipo === 'recorrente') return ROTULO_FREQUENCIA[d.frequencia];
  return 'Avulsa';
}

export function LinhaLancamento({ item, onPagar }: { item: ItemLista; onPagar?: (item: ItemLista) => void }) {
  const { lancamento: l, despesa: d } = item;
  const inicioX = useRef<number | null>(null);
  const deslizou = useRef(false);
  const podePagar = onPagar !== undefined && item.situacao !== 'paga';
  const subtitulo = [item.categoria?.nome, descreverLancamento(item)].filter(Boolean).join(' · ');

  return (
    <li
      class="linha"
      onPointerDown={(e) => {
        inicioX.current = e.clientX;
        deslizou.current = false;
      }}
      onPointerUp={(e) => {
        if (inicioX.current !== null && podePagar && e.clientX - inicioX.current < -DISTANCIA_DESLIZE) {
          deslizou.current = true;
          onPagar!(item);
        }
        inicioX.current = null;
      }}
    >
      <a
        class="linha-principal"
        href={caminho({ tela: 'despesa', id: d.id })}
        onClick={(e) => {
          if (deslizou.current) {
            e.preventDefault();
            deslizou.current = false;
          }
        }}
      >
        <Logo marca={item.marca} categoria={item.categoria} rotulo={d.descricao} />
        <span class="linha-textos">
          <span class="linha-titulo">{d.descricao}</span>
          <span class="linha-sub">{subtitulo}</span>
        </span>
        <span class="linha-valores">
          <span class="linha-valor">{formatarReais(valorEfetivo(l))}</span>
          <PilulaSituacao situacao={item.situacao} vencimento={l.vencimento} estimado={l.estimado} />
        </span>
      </a>
      {podePagar && (
        <button type="button" class="botao-icone botao-pagar" aria-label={`Marcar ${d.descricao} como paga`} onClick={() => onPagar!(item)}>
          <IconCheck size={22} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
```

- [ ] **Step 5: Criar `src/ui/telas/Inicio.tsx`**

```tsx
import { IconAlertTriangle, IconDownload } from '@tabler/icons-preact';
import { useMemo } from 'preact/hooks';
import { desfazerPagamento, desfazerVariosPagamentos, marcarPaga, marcarVariosPagos } from '../../dados/repositorio';
import { formatarData, formatarMes, formatarMesCurto } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import {
  backupAtrasado,
  contarAConfirmar,
  detalhar,
  faturasDoMes,
  proximosVencimentos,
  resumoDoMes,
  totaisProximosMeses,
  type Fatura,
  type ItemLista,
} from '../../dominio/resumo';
import type { Centavos } from '../../dominio/tipos';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { SeletorMes } from '../componentes/SeletorMes';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

function Metrica({ rotulo, valor, destaque = false, classe = '' }: { rotulo: string; valor: Centavos; destaque?: boolean; classe?: string }) {
  return (
    <div class={`metrica${destaque ? ' metrica-destaque' : ''}`}>
      <span class="metrica-rotulo">{rotulo}</span>
      <span class={`metrica-valor ${classe}`}>{formatarReais(valor)}</span>
    </div>
  );
}

export function Inicio({ estado }: { estado: Estado }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes } = usarMes();
  const mostrar = usarToast();

  const itens = useMemo(() => detalhar(estado.lancamentos, estado, hoje), [estado, hoje]);
  const doMes = itens.filter((i) => i.lancamento.mes === mes);
  const resumo = resumoDoMes(itens, mes);
  const proximos = proximosVencimentos(itens, 6);
  const faturas = faturasDoMes(itens, mes);
  const futuros = totaisProximosMeses(itens, mes, 3);
  const aConfirmar = contarAConfirmar(estado.despesas);
  const lembrarBackup = estado.despesas.length > 0 && backupAtrasado(estado.config?.ultimoBackupEm, hoje);
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const maiorCategoria = resumo.porCategoria[0]?.total ?? 1;

  async function pagar(item: ItemLista) {
    await marcarPaga(base, item.lancamento.id, hoje);
    mostrar(`${item.despesa.descricao} marcada como paga`, {
      rotulo: 'Desfazer',
      executar: () => void desfazerPagamento(base, item.lancamento.id),
    });
  }

  async function pagarFatura(f: Fatura) {
    const ids = f.idsAbertos;
    await marcarVariosPagos(base, ids, hoje);
    mostrar(`Fatura de ${formatarData(f.vencimento)} marcada como paga`, {
      rotulo: 'Desfazer',
      executar: () => void desfazerVariosPagamentos(base, ids),
    });
  }

  return (
    <>
      <SeletorMes />
      <section class="cartoes-resumo" aria-label="Resumo do mês">
        <Metrica rotulo="Total do mês" valor={resumo.total} destaque />
        <Metrica rotulo="Pago" valor={resumo.pago} classe="positivo" />
        <Metrica rotulo="Pendente" valor={resumo.pendente} />
        {resumo.atrasado > 0 && (
          <Metrica rotulo={plural(resumo.qtdAtrasadas, 'atrasada', 'atrasadas')} valor={resumo.atrasado} classe="negativo" />
        )}
      </section>

      {aConfirmar > 0 && (
        <a class="aviso aviso-atencao" href="#/despesas">
          <IconAlertTriangle aria-hidden="true" />
          <span>{aConfirmar === 1 ? '1 despesa tem dados a confirmar' : `${aConfirmar} despesas têm dados a confirmar`}</span>
        </a>
      )}
      {lembrarBackup && (
        <a class="aviso" href="#/backup">
          <IconDownload aria-hidden="true" />
          <span>Faça um backup: seus dados ficam só neste aparelho.</span>
        </a>
      )}

      <div class="grade-inicio">
        <section aria-labelledby="titulo-proximos">
          <h2 id="titulo-proximos">Próximos vencimentos</h2>
          {proximos.length > 0 ? (
            <ul class="lista">
              {proximos.map((i) => (
                <LinhaLancamento key={i.lancamento.id} item={i} onPagar={(x) => void pagar(x)} />
              ))}
            </ul>
          ) : (
            <p class="texto-suave">Nenhum vencimento pendente.</p>
          )}
        </section>

        <div>
          {faturas.map((f) => {
            const meio = estado.meios.find((m) => m.id === f.meioId);
            return (
              <section class="cartao" key={`${f.meioId}-${f.vencimento}`} aria-label={`Fatura ${meio?.nome ?? ''}`}>
                <div class="barra-topo">
                  <h2>Fatura {meio?.nome}</h2>
                  <strong>{formatarReais(f.total)}</strong>
                </div>
                <p class="texto-suave">
                  Vence em {formatarData(f.vencimento)} · {plural(f.ids.length, 'lançamento', 'lançamentos')}
                </p>
                {f.pago ? (
                  <span class="pilula pilula-paga">Fatura paga</span>
                ) : (
                  <button type="button" class="botao botao-largo" onClick={() => void pagarFatura(f)}>
                    Marcar fatura como paga
                  </button>
                )}
              </section>
            );
          })}

          {doMes.length === 0 ? (
            <EstadoVazio
              titulo={`Nada lançado em ${formatarMes(mes)}`}
              texto="Cadastre uma despesa para ver o resumo deste mês."
              acao={{ rotulo: 'Cadastrar despesa', href: '#/nova' }}
            />
          ) : (
            <section aria-labelledby="titulo-categorias">
              <h2 id="titulo-categorias">Gastos por categoria</h2>
              <ul class="barras">
                {resumo.porCategoria.map((c) => {
                  const cat = categorias.get(c.categoriaId);
                  const largura = Math.max(4, Math.round((c.total / maiorCategoria) * 100));
                  return (
                    <li key={c.categoriaId}>
                      <div class="barra-topo">
                        <span>{cat?.nome ?? 'Sem categoria'}</span>
                        <span>{formatarReais(c.total)}</span>
                      </div>
                      <div class="barra-trilho">
                        <div class="barra-preenchida" style={{ width: `${largura}%`, background: cat?.cor ?? '#57534E' }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="titulo-futuros">
            <h2 id="titulo-futuros">Próximos meses</h2>
            <div class="meses-futuros">
              {futuros.map((f) => (
                <div class="metrica metrica-pequena" key={f.mes}>
                  <span class="metrica-rotulo">{formatarMesCurto(f.mes)}</span>
                  <span class="metrica-valor">{formatarReais(f.total)}</span>
                  {f.temEstimado && <span class="texto-suave">inclui estimativas</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5b: Ligar a rota em `src/ui/Casca.tsx`**

Adicione `import { Inicio } from './telas/Inicio';` e, no `switch` de `Tela`, antes de `default`:

```tsx
    case 'inicio':
      return <Inicio estado={estado} />;
```

Renomeie o parâmetro `estado: _estado` para `estado`.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/ui` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/ui tests/ui/Inicio.test.tsx
git commit -m "feat(ui): tela Início com resumo, próximos vencimentos, fatura e categorias" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Formulário de despesa (nova e edição)

**Files:**
- Create: `src/ui/telas/formDespesa.ts` (lógica pura), `src/ui/telas/FormDespesa.tsx`
- Modify: `src/ui/Casca.tsx` (rotear `nova` e `editar`)
- Test: `tests/ui/formDespesa.test.ts`, `tests/ui/FormDespesa.test.tsx`

**Interfaces:**
- Consumes: `lerReais`, `formatarNumero` (Task 2); `ehDataISO`, `ehMesISO`, `mesDe`, `somarMesesAoMes`, `formatarMes`, `formatarMesCurto`, `formatarData` (Task 2); `vencimentoNoCartao` (Task 3); `gerarAvulsa`, `gerarParcelas`, `diferencaParcelas` (Task 4); `gerarOcorrencias` (Task 5); `normalizar` (Task 6); `salvarDespesa`, `salvarMarca` (Task 7); `identificarMarca` (Task 9); componentes e contexto (Task 10); `navegar` (Task 10).
- Produces (`formDespesa.ts`):
  - `interface ValoresForm` (todos os campos como texto, mais `tipo`, `frequencia`, `valorVariavel`, `aConfirmar`)
  - `type ErrosForm = Partial<Record<keyof ValoresForm, string>>`
  - `valoresIniciais(mesAtual: MesISO): ValoresForm`
  - `valoresDeDespesa(d: Despesa, marcas: Marca[], mesAtual: MesISO): ValoresForm`
  - `validar(v: ValoresForm): ErrosForm`
  - `atualizarAConfirmar(v: ValoresForm): CampoAConfirmar[]`
  - `montarDespesa(v: ValoresForm, ctx: { id: string; marcaId?: string; pausas?: Pausa[] }): Despesa`
  - `sugerirVencimento(dataCompra: string, meio?: MeioPagamento): DataISO | undefined`
  - `resolverMarca(texto: string, descricao: string, marcas: Marca[], novoId?: () => string): { marcaId?: string; nova?: Marca }`
  - `mudouCobranca(antes: Despesa, depois: Despesa): boolean`
  - `previa(d: Despesa, meio: MeioPagamento | undefined, hoje: DataISO): { lancamentos: Lancamento[]; anteriores: number }`
- Produces (`FormDespesa.tsx`): `FormDespesa({ estado, id? })`

- [ ] **Step 1: Escrever os testes da lógica**

`tests/ui/formDespesa.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  atualizarAConfirmar,
  montarDespesa,
  mudouCobranca,
  previa,
  resolverMarca,
  sugerirVencimento,
  validar,
  valoresIniciais,
  type ValoresForm,
} from '../../src/ui/telas/formDespesa';
import { CARTAO, PIX, recorrente } from '../fabricas';

const v = (o: Partial<ValoresForm>): ValoresForm => ({ ...valoresIniciais('2026-10'), categoriaId: 'cat-outros', ...o });

describe('validar', () => {
  it('avulsa vazia: descrição e valor', () => {
    expect(validar(v({ descricao: '' }))).toEqual({
      descricao: 'Informe a descrição.',
      valor: 'Informe um valor maior que zero.',
    });
  });

  it('categoria obrigatória', () => {
    expect(validar(v({ descricao: 'Luz', valor: '10', categoriaId: '' }))).toEqual({ categoriaId: 'Escolha uma categoria.' });
  });

  it('avulsa válida', () => {
    expect(validar(v({ descricao: 'Luz', valor: '120,50', vencimento: '2026-10-20' }))).toEqual({});
  });

  it('parcelada: número de parcelas, valores e parcela inicial', () => {
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '1', valorTotal: '100' }))).toEqual({
      numParcelas: 'Informe de 2 a 120 parcelas.',
    });
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '3' }))).toEqual({
      valorTotal: 'Informe o valor total ou o valor da parcela.',
    });
    expect(validar(v({ tipo: 'parcelada', descricao: 'TV', numParcelas: '12', valorParcela: '10', comecaNaParcela: '13' }))).toEqual({
      comecaNaParcela: 'A parcela inicial deve estar entre 1 e 12.',
    });
  });

  it('recorrente: início e fim', () => {
    expect(validar(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90' }))).toEqual({
      inicio: 'Informe a data da primeira cobrança.',
    });
    expect(validar(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90', inicio: '2026-10-10', fim: '2026-09-01' }))).toEqual({
      fim: 'O fim não pode ser antes do início.',
    });
  });
});

describe('montarDespesa', () => {
  it('parcelada só com o valor da parcela calcula o total', () => {
    const d = montarDespesa(v({ tipo: 'parcelada', descricao: 'Celular', numParcelas: '12', valorParcela: '450,00', comecaNaParcela: '11' }), { id: 'x' });
    expect(d).toMatchObject({ tipo: 'parcelada', valorTotal: 540000, valorParcela: 45000, numParcelas: 12, comecaNaParcela: 11, mesPrimeira: '2026-10' });
  });

  it('avulsa sem vencimento usa o mês informado', () => {
    expect(montarDespesa(v({ descricao: 'X', valor: '10', mes: '2026-12' }), { id: 'x' })).toMatchObject({ mes: '2026-12', vencimento: undefined });
  });

  it('recorrente preserva as pausas recebidas', () => {
    const d = montarDespesa(v({ tipo: 'recorrente', descricao: 'Net', valor: '99,90', inicio: '2026-10-10' }), { id: 'x', pausas: [{ de: '2026-12-01' }] });
    expect(d).toMatchObject({ tipo: 'recorrente', valor: 9990, pausas: [{ de: '2026-12-01' }] });
  });
});

describe('auxiliares', () => {
  it('sugerirVencimento só para cartão com dias', () => {
    expect(sugerirVencimento('2026-10-02', CARTAO)).toBe('2026-11-07');
    expect(sugerirVencimento('2026-10-02', PIX)).toBeUndefined();
    expect(sugerirVencimento('', CARTAO)).toBeUndefined();
  });

  it('resolverMarca', () => {
    const marcas = [{ id: 'm1', nome: 'Loja do Bairro', apelidos: ['Lojinha'] }, { id: 'm2', nome: 'Spotify', apelidos: [], logoSlug: 'spotify' }];
    const id = () => 'novo';
    expect(resolverMarca('lojinha', 'qualquer', marcas, id)).toEqual({ marcaId: 'm1' });
    expect(resolverMarca('Netflix', 'qualquer', marcas, id)).toEqual({ nova: { id: 'novo', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' } });
    expect(resolverMarca('Padaria do Zé', 'pão', marcas, id)).toEqual({ nova: { id: 'novo', nome: 'Padaria do Zé', apelidos: [] } });
    expect(resolverMarca('', 'Netflix família', [], id)).toEqual({ nova: { id: 'novo', nome: 'Netflix', apelidos: [], logoSlug: 'netflix' } });
    expect(resolverMarca('', 'Spotify Premium', marcas, id)).toEqual({ marcaId: 'm2' });
    expect(resolverMarca('', 'Conta de luz', marcas, id)).toEqual({});
  });

  it('atualizarAConfirmar tira o que foi preenchido', () => {
    expect(
      atualizarAConfirmar(v({ tipo: 'parcelada', aConfirmar: ['vencimento', 'loja', 'valorTotal'], primeiroVencimento: '2026-11-10', marca: 'Loja' })),
    ).toEqual(['valorTotal']);
  });

  it('mudouCobranca considera só o que altera as cobranças', () => {
    expect(mudouCobranca(recorrente(), recorrente({ valor: 4990 }))).toBe(true);
    expect(mudouCobranca(recorrente(), recorrente({ descricao: 'Outra' }))).toBe(false);
  });

  it('previa da recorrente mostra as próximas e conta as anteriores a hoje', () => {
    const p = previa(recorrente({ inicio: '2026-08-08' }), undefined, '2026-10-06');
    expect(p.lancamentos.map((l) => l.dataCobranca)).toEqual(['2026-10-08', '2026-11-08', '2026-12-08']);
    expect(p.anteriores).toBe(2);
  });
});
```

- [ ] **Step 2: Escrever os testes do componente**

`tests/ui/FormDespesa.test.tsx`:

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { FormDespesa } from '../../src/ui/telas/FormDespesa';
import { CARTAO, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  location.hash = '';
});

async function abrir(id?: string) {
  renderizar(<ComEstado filho={(e) => <FormDespesa estado={e} id={id} />} />, base);
  await screen.findByRole('heading', { name: id ? 'Editar despesa' : 'Nova despesa' });
}

const digitar = (rotulo: string, valor: string) => fireEvent.input(screen.getByLabelText(rotulo), { target: { value: valor } });
const escolher = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });

describe('FormDespesa', () => {
  it('cadastra uma despesa avulsa e abre o detalhe', async () => {
    await abrir();
    digitar('Descrição', 'Conta de luz');
    escolher('Categoria', 'cat-moradia');
    digitar('Valor', '120,50');
    digitar('Vencimento', '2026-10-20');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    const d = (await base.despesas.toArray())[0]!;
    expect((await base.lancamentos.get(`${d.id}#1`))!.valor).toBe(12050);
    expect(location.hash).toBe(`#/despesas/${d.id}`);
  });

  it('mostra os erros e não salva', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    expect(await screen.findByText('Informe a descrição.')).toBeInTheDocument();
    expect(screen.getByText('Escolha uma categoria.')).toBeInTheDocument();
    expect(await base.despesas.count()).toBe(0);
  });

  it('dois toques em salvar criam uma despesa e uma marca só', async () => {
    await abrir();
    digitar('Descrição', 'Netflix família');
    escolher('Categoria', 'cat-assinaturas');
    digitar('Valor', '44,90');
    const botao = screen.getByRole('button', { name: 'Salvar despesa' });
    fireEvent.click(botao);
    fireEvent.click(botao);
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(await base.despesas.count()).toBe(1);
    // Sem a trava, cada toque criaria a sua marca "Netflix".
    expect(await base.marcas.count()).toBe(1);
  });

  it('o cartão sugere o vencimento a partir da data da compra', async () => {
    await repo.salvarMeio(base, CARTAO, HOJE);
    await abrir();
    escolher('Meio de pagamento', CARTAO.id);
    digitar('Data da compra (opcional)', '2026-10-02');
    expect(screen.getByLabelText('Vencimento')).toHaveValue('2026-11-07');
  });

  it('parcelada mostra a prévia das parcelas', async () => {
    await abrir();
    fireEvent.click(screen.getByRole('radio', { name: 'Parcelada' }));
    digitar('Descrição', 'Notebook');
    escolher('Categoria', 'cat-compras');
    digitar('Valor total', '1.200,00');
    digitar('Número de parcelas', '3');
    digitar('1º vencimento', '2026-11-10');
    const previa = screen.getByRole('region', { name: 'Parcelas que serão geradas' });
    expect(within(previa).getAllByText('R$ 400,00')).toHaveLength(3);
  });

  it('editar recorrente aplica o novo valor a partir do mês escolhido', async () => {
    await repo.salvarDespesa(base, recorrente({ id: 'r', descricao: 'Streaming', categoriaId: 'cat-assinaturas' }), { hoje: HOJE });
    await abrir('r');
    digitar('Valor', '49,90');
    escolher('Aplicar a mudança a partir de', '2027-01');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect((await base.lancamentos.get('r@2027-01'))!.valor).toBe(4990));
    expect((await base.lancamentos.get('r@2026-12'))!.valor).toBe(3990);
  });

  it('nome de marca conhecida na descrição cria a marca com logo', async () => {
    await abrir();
    digitar('Descrição', 'Netflix família');
    escolher('Categoria', 'cat-assinaturas');
    digitar('Valor', '44,90');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar despesa' }));
    await waitFor(async () => expect(await base.marcas.count()).toBe(1));
    expect((await base.marcas.toArray())[0]).toMatchObject({ nome: 'Netflix', logoSlug: 'netflix' });
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/ui/formDespesa.test.ts tests/ui/FormDespesa.test.tsx`
Expected: FAIL — `formDespesa` e `FormDespesa` não existem.

- [ ] **Step 4: Implementar `src/ui/telas/formDespesa.ts`**

```ts
import { vencimentoNoCartao } from '../../dominio/cartao';
import { ehDataISO, ehMesISO, mesDe } from '../../dominio/datas';
import { formatarNumero, lerReais } from '../../dominio/dinheiro';
import { normalizar } from '../../dominio/filtros';
import { gerarAvulsa, gerarParcelas } from '../../dominio/parcelas';
import { gerarOcorrencias } from '../../dominio/recorrencias';
import type {
  CampoAConfirmar,
  DataISO,
  Despesa,
  Frequencia,
  Lancamento,
  Marca,
  MeioPagamento,
  MesISO,
  Pausa,
  TipoDespesa,
} from '../../dominio/tipos';
import { identificarMarca } from '../../marcas/identificar';

export interface ValoresForm {
  tipo: TipoDespesa;
  descricao: string;
  marca: string;
  categoriaId: string;
  meioPagamentoId: string;
  dataCompra: string;
  observacoes: string;
  valor: string;
  vencimento: string;
  mes: string;
  valorTotal: string;
  numParcelas: string;
  valorParcela: string;
  primeiroVencimento: string;
  mesPrimeira: string;
  comecaNaParcela: string;
  frequencia: Frequencia;
  inicio: string;
  fim: string;
  valorVariavel: boolean;
  aConfirmar: CampoAConfirmar[];
}

export type ErrosForm = Partial<Record<keyof ValoresForm, string>>;

const MSG_VALOR = 'Informe um valor maior que zero.';
const MSG_DATA = 'Data inválida.';

export function valoresIniciais(mesAtual: MesISO): ValoresForm {
  return {
    tipo: 'avulsa', descricao: '', marca: '', categoriaId: '', meioPagamentoId: '', dataCompra: '', observacoes: '',
    valor: '', vencimento: '', mes: mesAtual,
    valorTotal: '', numParcelas: '2', valorParcela: '', primeiroVencimento: '', mesPrimeira: mesAtual, comecaNaParcela: '1',
    frequencia: 'mensal', inicio: '', fim: '', valorVariavel: false,
    aConfirmar: [],
  };
}

export function valoresDeDespesa(d: Despesa, marcas: Marca[], mesAtual: MesISO): ValoresForm {
  const v = valoresIniciais(mesAtual);
  v.tipo = d.tipo;
  v.descricao = d.descricao;
  v.marca = marcas.find((m) => m.id === d.marcaId)?.nome ?? '';
  v.categoriaId = d.categoriaId;
  v.meioPagamentoId = d.meioPagamentoId ?? '';
  v.dataCompra = d.dataCompra ?? '';
  v.observacoes = d.observacoes;
  v.aConfirmar = [...d.aConfirmar];
  if (d.tipo === 'avulsa') {
    v.valor = formatarNumero(d.valor);
    v.vencimento = d.vencimento ?? '';
    v.mes = d.mes;
  } else if (d.tipo === 'parcelada') {
    v.valorTotal = formatarNumero(d.valorTotal);
    v.numParcelas = String(d.numParcelas);
    v.valorParcela = d.valorParcela !== undefined ? formatarNumero(d.valorParcela) : '';
    v.primeiroVencimento = d.primeiroVencimento ?? '';
    v.mesPrimeira = d.mesPrimeira;
    v.comecaNaParcela = String(d.comecaNaParcela);
  } else {
    v.valor = formatarNumero(d.valor);
    v.valorVariavel = d.valorVariavel;
    v.frequencia = d.frequencia;
    v.inicio = d.inicio;
    v.fim = d.fim ?? '';
  }
  return v;
}

function valorPositivo(texto: string): boolean {
  const c = lerReais(texto);
  return c !== null && c > 0;
}

function inteiro(texto: string): number | null {
  return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

export function validar(v: ValoresForm): ErrosForm {
  const e: ErrosForm = {};
  if (!v.descricao.trim()) e.descricao = 'Informe a descrição.';
  if (!v.categoriaId) e.categoriaId = 'Escolha uma categoria.';
  if (v.dataCompra && !ehDataISO(v.dataCompra)) e.dataCompra = MSG_DATA;

  if (v.tipo === 'avulsa') {
    if (!valorPositivo(v.valor)) e.valor = MSG_VALOR;
    if (v.vencimento && !ehDataISO(v.vencimento)) e.vencimento = MSG_DATA;
    if (!v.vencimento && !ehMesISO(v.mes)) e.mes = 'Informe o mês.';
  } else if (v.tipo === 'parcelada') {
    const n = inteiro(v.numParcelas);
    const nValido = n !== null && n >= 2 && n <= 120;
    if (!nValido) e.numParcelas = 'Informe de 2 a 120 parcelas.';
    const temTotal = v.valorTotal.trim() !== '';
    const temParcela = v.valorParcela.trim() !== '';
    if (!temTotal && !temParcela) e.valorTotal = 'Informe o valor total ou o valor da parcela.';
    if (temTotal && !valorPositivo(v.valorTotal)) e.valorTotal = MSG_VALOR;
    if (temParcela && !valorPositivo(v.valorParcela)) e.valorParcela = MSG_VALOR;
    const k = inteiro(v.comecaNaParcela);
    if (nValido && (k === null || k < 1 || k > n!)) e.comecaNaParcela = `A parcela inicial deve estar entre 1 e ${n}.`;
    if (v.primeiroVencimento && !ehDataISO(v.primeiroVencimento)) e.primeiroVencimento = MSG_DATA;
    if (!v.primeiroVencimento && !ehMesISO(v.mesPrimeira)) e.mesPrimeira = 'Informe o mês.';
  } else {
    if (!valorPositivo(v.valor)) e.valor = MSG_VALOR;
    if (!ehDataISO(v.inicio)) e.inicio = 'Informe a data da primeira cobrança.';
    if (v.fim && !ehDataISO(v.fim)) e.fim = MSG_DATA;
    else if (v.fim && ehDataISO(v.inicio) && v.fim < v.inicio) e.fim = 'O fim não pode ser antes do início.';
  }
  return e;
}

/** Tira de "a confirmar" o que o usuário acabou de preencher. */
export function atualizarAConfirmar(v: ValoresForm): CampoAConfirmar[] {
  return v.aConfirmar.filter((c) => {
    if (c === 'vencimento') {
      return !((v.tipo === 'avulsa' && v.vencimento) || (v.tipo === 'parcelada' && v.primeiroVencimento) || v.tipo === 'recorrente');
    }
    if (c === 'loja') return !v.marca.trim();
    if (c === 'dataCompra') return !v.dataCompra;
    if (c === 'meioPagamento') return !v.meioPagamentoId;
    return true;
  });
}

/** Monta a despesa a partir de valores já validados. */
export function montarDespesa(v: ValoresForm, ctx: { id: string; marcaId?: string; pausas?: Pausa[] }): Despesa {
  const comum = {
    id: ctx.id,
    descricao: v.descricao.trim(),
    categoriaId: v.categoriaId,
    marcaId: ctx.marcaId,
    meioPagamentoId: v.meioPagamentoId || undefined,
    dataCompra: v.dataCompra || undefined,
    observacoes: v.observacoes.trim(),
    aConfirmar: atualizarAConfirmar(v),
    criadaEm: '',
    atualizadaEm: '',
  };
  if (v.tipo === 'avulsa') {
    return { ...comum, tipo: 'avulsa', valor: lerReais(v.valor)!, vencimento: v.vencimento || undefined, mes: v.vencimento ? mesDe(v.vencimento) : v.mes };
  }
  if (v.tipo === 'parcelada') {
    const n = Number(v.numParcelas);
    const parcela = v.valorParcela.trim() ? lerReais(v.valorParcela)! : undefined;
    const total = v.valorTotal.trim() ? lerReais(v.valorTotal)! : parcela! * n;
    return {
      ...comum,
      tipo: 'parcelada',
      valorTotal: total,
      numParcelas: n,
      valorParcela: parcela,
      primeiroVencimento: v.primeiroVencimento || undefined,
      mesPrimeira: v.primeiroVencimento ? mesDe(v.primeiroVencimento) : v.mesPrimeira,
      comecaNaParcela: Number(v.comecaNaParcela),
    };
  }
  return {
    ...comum,
    tipo: 'recorrente',
    valor: lerReais(v.valor)!,
    valorVariavel: v.valorVariavel,
    frequencia: v.frequencia,
    inicio: v.inicio,
    fim: v.fim || undefined,
    pausas: ctx.pausas ?? [],
  };
}

export function sugerirVencimento(dataCompra: string, meio?: MeioPagamento): DataISO | undefined {
  if (!ehDataISO(dataCompra) || meio?.tipo !== 'credito' || !meio.diaFechamento || !meio.diaVencimento) return undefined;
  return vencimentoNoCartao(dataCompra, meio.diaFechamento, meio.diaVencimento);
}

/**
 * Decide a marca: o texto digitado (marca existente por nome/apelido, ou nova, com logo do catálogo
 * se houver) ou, sem texto, uma marca reconhecida na descrição.
 */
export function resolverMarca(
  texto: string,
  descricao: string,
  marcas: Marca[],
  novoId: () => string = () => crypto.randomUUID(),
): { marcaId?: string; nova?: Marca } {
  const t = texto.trim();
  if (t) {
    const existente = marcas.find((m) => [m.nome, ...m.apelidos].some((n) => normalizar(n) === normalizar(t)));
    if (existente) return { marcaId: existente.id };
    const doCatalogo = identificarMarca(t, []);
    return {
      nova: { id: novoId(), nome: t, apelidos: [], ...(doCatalogo?.tipo === 'catalogo' ? { logoSlug: doCatalogo.item.slug } : {}) },
    };
  }
  const achada = identificarMarca(descricao, marcas);
  if (achada?.tipo === 'marca') return { marcaId: achada.marca.id };
  if (achada?.tipo === 'catalogo') {
    const mesmaLogo = marcas.find((m) => m.logoSlug === achada.item.slug);
    if (mesmaLogo) return { marcaId: mesmaLogo.id };
    return { nova: { id: novoId(), nome: achada.item.nome, apelidos: [], logoSlug: achada.item.slug } };
  }
  return {};
}

/** A edição muda valor/datas das cobranças? Só então pergunta "a partir de qual mês". */
export function mudouCobranca(antes: Despesa, depois: Despesa): boolean {
  if (antes.tipo !== 'recorrente' || depois.tipo !== 'recorrente') return false;
  return (
    antes.valor !== depois.valor ||
    antes.valorVariavel !== depois.valorVariavel ||
    antes.frequencia !== depois.frequencia ||
    antes.inicio !== depois.inicio ||
    antes.fim !== depois.fim ||
    antes.meioPagamentoId !== depois.meioPagamentoId
  );
}

export function previa(d: Despesa, meio: MeioPagamento | undefined, hoje: DataISO): { lancamentos: Lancamento[]; anteriores: number } {
  try {
    if (d.tipo === 'avulsa') return { lancamentos: [gerarAvulsa(d)], anteriores: 0 };
    if (d.tipo === 'parcelada') return { lancamentos: gerarParcelas(d), anteriores: 0 };
    const todas = gerarOcorrencias(d, meio, hoje);
    const futuras = todas.filter((l) => l.dataCobranca! >= hoje);
    return { lancamentos: futuras.slice(0, 3), anteriores: todas.length - futuras.length };
  } catch {
    return { lancamentos: [], anteriores: 0 };
  }
}
```

- [ ] **Step 5: Implementar `src/ui/telas/FormDespesa.tsx`**

```tsx
import { useRef, useState } from 'preact/hooks';
import { salvarDespesa, salvarMarca } from '../../dados/repositorio';
import { formatarData, formatarMes, formatarMesCurto, mesDe, somarMesesAoMes } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { diferencaParcelas } from '../../dominio/parcelas';
import { ErroDominio, type Despesa, type Lancamento, type TipoDespesa } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { navegar } from '../rota';
import { ROTULO_A_CONFIRMAR } from '../textos';
import {
  montarDespesa,
  mudouCobranca,
  previa,
  resolverMarca,
  sugerirVencimento,
  validar,
  valoresDeDespesa,
  valoresIniciais,
  type ErrosForm,
  type ValoresForm,
} from './formDespesa';

const TIPOS: { valor: TipoDespesa; rotulo: string }[] = [
  { valor: 'avulsa', rotulo: 'Avulsa' },
  { valor: 'parcelada', rotulo: 'Parcelada' },
  { valor: 'recorrente', rotulo: 'Recorrente' },
];
const MAX_PREVIA = 12;

type Alterar = <K extends keyof ValoresForm>(campo: K, valor: ValoresForm[K]) => void;
interface PropsCampos {
  v: ValoresForm;
  erros: ErrosForm;
  alterar: Alterar;
}

function CampoDataCompra({ v, erros, alterar }: PropsCampos) {
  return (
    <Campo id="f-data-compra" rotulo="Data da compra (opcional)" erro={erros.dataCompra}>
      <input id="f-data-compra" type="date" value={v.dataCompra} onInput={(e) => alterar('dataCompra', e.currentTarget.value)} />
    </Campo>
  );
}

function CamposAvulsa(p: PropsCampos) {
  const { v, erros, alterar } = p;
  return (
    <>
      <Campo id="f-valor" rotulo="Valor" erro={erros.valor}>
        <input id="f-valor" inputMode="decimal" placeholder="0,00" value={v.valor} onInput={(e) => alterar('valor', e.currentTarget.value)} />
      </Campo>
      <div class="duas-colunas">
        <CampoDataCompra {...p} />
        <Campo id="f-vencimento" rotulo="Vencimento" erro={erros.vencimento}>
          <input id="f-vencimento" type="date" value={v.vencimento} onInput={(e) => alterar('vencimento', e.currentTarget.value)} />
        </Campo>
      </div>
      {!v.vencimento && (
        <Campo id="f-mes" rotulo="Mês de referência" erro={erros.mes} dica="Sem vencimento, a despesa conta neste mês e fica como a confirmar.">
          <input id="f-mes" type="month" value={v.mes} onInput={(e) => alterar('mes', e.currentTarget.value)} />
        </Campo>
      )}
    </>
  );
}

function CamposParcelada(p: PropsCampos) {
  const { v, erros, alterar } = p;
  return (
    <>
      <div class="duas-colunas">
        <Campo id="f-valor-total" rotulo="Valor total" erro={erros.valorTotal}>
          <input id="f-valor-total" inputMode="decimal" placeholder="0,00" value={v.valorTotal} onInput={(e) => alterar('valorTotal', e.currentTarget.value)} />
        </Campo>
        <Campo id="f-num-parcelas" rotulo="Número de parcelas" erro={erros.numParcelas}>
          <input id="f-num-parcelas" inputMode="numeric" value={v.numParcelas} onInput={(e) => alterar('numParcelas', e.currentTarget.value)} />
        </Campo>
      </div>
      <Campo
        id="f-valor-parcela"
        rotulo="Valor da parcela (opcional)"
        erro={erros.valorParcela}
        dica="Preencha se a parcela não for o total dividido, por exemplo com juros."
      >
        <input id="f-valor-parcela" inputMode="decimal" placeholder="0,00" value={v.valorParcela} onInput={(e) => alterar('valorParcela', e.currentTarget.value)} />
      </Campo>
      <div class="duas-colunas">
        <CampoDataCompra {...p} />
        <Campo id="f-primeiro-venc" rotulo="1º vencimento" erro={erros.primeiroVencimento}>
          <input id="f-primeiro-venc" type="date" value={v.primeiroVencimento} onInput={(e) => alterar('primeiroVencimento', e.currentTarget.value)} />
        </Campo>
      </div>
      {!v.primeiroVencimento && (
        <Campo id="f-mes-primeira" rotulo="Mês da 1ª parcela" erro={erros.mesPrimeira}>
          <input id="f-mes-primeira" type="month" value={v.mesPrimeira} onInput={(e) => alterar('mesPrimeira', e.currentTarget.value)} />
        </Campo>
      )}
      <Campo
        id="f-comeca"
        rotulo="Começa na parcela"
        erro={erros.comecaNaParcela}
        dica="Para compras que já estavam em andamento. O 1º vencimento é o desta parcela; as anteriores ficam fora do app."
      >
        <input id="f-comeca" inputMode="numeric" value={v.comecaNaParcela} onInput={(e) => alterar('comecaNaParcela', e.currentTarget.value)} />
      </Campo>
    </>
  );
}

function CamposRecorrente({ v, erros, alterar }: PropsCampos) {
  return (
    <>
      <Campo id="f-valor" rotulo="Valor" erro={erros.valor}>
        <input id="f-valor" inputMode="decimal" placeholder="0,00" value={v.valor} onInput={(e) => alterar('valor', e.currentTarget.value)} />
      </Campo>
      <label class="check">
        <input type="checkbox" checked={v.valorVariavel} onChange={(e) => alterar('valorVariavel', e.currentTarget.checked)} />
        O valor muda todo mês (conta de consumo)
      </label>
      <Campo id="f-frequencia" rotulo="Repete">
        <select id="f-frequencia" value={v.frequencia} onChange={(e) => alterar('frequencia', e.currentTarget.value as ValoresForm['frequencia'])}>
          <option value="mensal">Todo mês</option>
          <option value="semanal">Toda semana</option>
          <option value="anual">Todo ano</option>
        </select>
      </Campo>
      <div class="duas-colunas">
        <Campo id="f-inicio" rotulo="Primeira cobrança" erro={erros.inicio} dica="As próximas seguem o mesmo dia.">
          <input id="f-inicio" type="date" value={v.inicio} onInput={(e) => alterar('inicio', e.currentTarget.value)} />
        </Campo>
        <Campo id="f-fim" rotulo="Termina em (opcional)" erro={erros.fim}>
          <input id="f-fim" type="date" value={v.fim} onInput={(e) => alterar('fim', e.currentTarget.value)} />
        </Campo>
      </div>
    </>
  );
}

function Previa({ d, lancamentos, anteriores }: { d: Despesa; lancamentos: Lancamento[]; anteriores: number }) {
  const titulo = d.tipo === 'parcelada' ? 'Parcelas que serão geradas' : d.tipo === 'recorrente' ? 'Próximas cobranças' : 'Lançamento';
  const diferenca = d.tipo === 'parcelada' ? diferencaParcelas(d) : 0;
  const visiveis = lancamentos.slice(0, MAX_PREVIA);
  return (
    <section class="previa" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ul>
        {visiveis.map((l) => (
          <li key={l.id}>
            <span>{d.tipo === 'parcelada' && l.numero ? `${l.numero}/${d.numParcelas}` : formatarMesCurto(l.mes)}</span>
            <span>{l.vencimento ? formatarData(l.vencimento) : 'vencimento a confirmar'}</span>
            <span>{formatarReais(l.valor)}</span>
          </li>
        ))}
      </ul>
      {lancamentos.length > MAX_PREVIA && <p class="texto-suave">e mais {lancamentos.length - MAX_PREVIA}.</p>}
      {diferenca !== 0 && (
        <p class="texto-suave">
          As parcelas somam {formatarReais(Math.abs(diferenca))} {diferenca > 0 ? 'a mais' : 'a menos'} que o total informado.
        </p>
      )}
      {anteriores > 0 && (
        <p class="texto-suave">
          {anteriores === 1 ? '1 cobrança anterior a hoje também será criada' : `${anteriores} cobranças anteriores a hoje também serão criadas`}.
        </p>
      )}
    </section>
  );
}

export function FormDespesa({ estado, id }: { estado: Estado; id?: string }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes: mesAtual } = usarMes();
  const mostrar = usarToast();
  const existente = id ? estado.despesas.find((d) => d.id === id) : undefined;
  const [idDespesa] = useState(() => id ?? crypto.randomUUID());
  const [v, setV] = useState<ValoresForm>(() =>
    existente ? valoresDeDespesa(existente, estado.marcas, mesAtual) : valoresIniciais(mesAtual),
  );
  const [erros, setErros] = useState<ErrosForm>({});
  const [erroGeral, setErroGeral] = useState('');
  const [aPartirDe, setAPartirDe] = useState(mesDe(hoje));
  const [salvando, setSalvando] = useState(false);
  const travado = useRef(false);

  if (id && !existente) {
    return <EstadoVazio titulo="Despesa não encontrada" texto="Ela pode ter sido excluída." acao={{ rotulo: 'Ver despesas', href: '#/despesas' }} />;
  }

  const pausas = existente?.tipo === 'recorrente' ? existente.pausas : [];
  const meio = estado.meios.find((m) => m.id === v.meioPagamentoId);

  const alterar: Alterar = (campo, valor) => {
    setV((atual) => {
      const novo = { ...atual, [campo]: valor };
      if (campo === 'dataCompra' || campo === 'meioPagamentoId') {
        const sugestao = sugerirVencimento(novo.dataCompra, estado.meios.find((m) => m.id === novo.meioPagamentoId));
        if (sugestao && novo.tipo === 'avulsa' && !atual.vencimento) novo.vencimento = sugestao;
        if (sugestao && novo.tipo === 'parcelada' && !atual.primeiroVencimento) novo.primeiroVencimento = sugestao;
      }
      return novo;
    });
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  };

  const montada = Object.keys(validar(v)).length === 0 ? montarDespesa(v, { id: idDespesa, pausas }) : null;
  const prev = montada ? previa(montada, meio, hoje) : null;
  const perguntarAPartir = existente !== undefined && montada !== null && mudouCobranca(existente, montada);
  const mesesAPartir = Array.from({ length: 13 }, (_, k) => somarMesesAoMes(mesDe(hoje), k));

  async function salvar(e: Event) {
    e.preventDefault();
    if (travado.current) return;
    const encontrados = validar(v);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    travado.current = true;
    setSalvando(true);
    setErroGeral('');
    try {
      const marca = resolverMarca(v.marca, v.descricao, estado.marcas);
      if (marca.nova) await salvarMarca(base, marca.nova);
      const despesa = montarDespesa(v, { id: idDespesa, marcaId: marca.marcaId ?? marca.nova?.id, pausas });
      const aplicarDesde = existente && mudouCobranca(existente, despesa) ? aPartirDe : undefined;
      await salvarDespesa(base, despesa, { hoje, aPartirDe: aplicarDesde });
      mostrar(existente ? 'Despesa atualizada' : 'Despesa cadastrada');
      navegar({ tela: 'despesa', id: idDespesa });
    } catch (err) {
      setErroGeral(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
      travado.current = false;
      setSalvando(false);
    }
  }

  const props: PropsCampos = { v, erros, alterar };

  return (
    <form class="formulario" onSubmit={(e) => void salvar(e)} noValidate>
      <h1>{existente ? 'Editar despesa' : 'Nova despesa'}</h1>

      {!existente && (
        <div class="segmentado" role="radiogroup" aria-label="Tipo de despesa">
          {TIPOS.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={v.tipo === t.valor} onClick={() => alterar('tipo', t.valor)}>
              {t.rotulo}
            </button>
          ))}
        </div>
      )}

      <Campo id="f-descricao" rotulo="Descrição" erro={erros.descricao}>
        <input id="f-descricao" value={v.descricao} autocomplete="off" onInput={(e) => alterar('descricao', e.currentTarget.value)} />
      </Campo>
      <Campo id="f-marca" rotulo="Loja ou marca (opcional)" dica="O logo aparece sozinho para marcas conhecidas.">
        <input id="f-marca" list="f-marcas" value={v.marca} autocomplete="off" onInput={(e) => alterar('marca', e.currentTarget.value)} />
        <datalist id="f-marcas">
          {estado.marcas.map((m) => (
            <option key={m.id} value={m.nome} />
          ))}
        </datalist>
      </Campo>
      <div class="duas-colunas">
        <Campo id="f-categoria" rotulo="Categoria" erro={erros.categoriaId}>
          <select id="f-categoria" value={v.categoriaId} onChange={(e) => alterar('categoriaId', e.currentTarget.value)}>
            <option value="">Escolha…</option>
            {estado.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="f-meio" rotulo="Meio de pagamento">
          <select id="f-meio" value={v.meioPagamentoId} onChange={(e) => alterar('meioPagamentoId', e.currentTarget.value)}>
            <option value="">Não informado</option>
            {estado.meios.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {v.tipo === 'avulsa' && <CamposAvulsa {...props} />}
      {v.tipo === 'parcelada' && <CamposParcelada {...props} />}
      {v.tipo === 'recorrente' && <CamposRecorrente {...props} />}

      <Campo id="f-obs" rotulo="Observações (opcional)">
        <textarea id="f-obs" value={v.observacoes} onInput={(e) => alterar('observacoes', e.currentTarget.value)} />
      </Campo>

      {v.aConfirmar.length > 0 && (
        <fieldset class="cartao">
          <legend>A confirmar</legend>
          <p class="texto-suave">Marque o que você já conferiu.</p>
          {v.aConfirmar.map((c) => (
            <label class="check" key={c}>
              <input type="checkbox" onChange={() => alterar('aConfirmar', v.aConfirmar.filter((x) => x !== c))} />
              {ROTULO_A_CONFIRMAR[c]}
            </label>
          ))}
        </fieldset>
      )}

      {perguntarAPartir && (
        <Campo id="f-a-partir" rotulo="Aplicar a mudança a partir de" dica="Meses anteriores e cobranças já pagas não mudam.">
          <select id="f-a-partir" value={aPartirDe} onChange={(e) => setAPartirDe(e.currentTarget.value)}>
            {mesesAPartir.map((m) => (
              <option key={m} value={m}>
                {formatarMes(m)}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {montada && prev && prev.lancamentos.length > 0 && <Previa d={montada} lancamentos={prev.lancamentos} anteriores={prev.anteriores} />}

      {erroGeral && (
        <p class="erro-geral" role="alert">
          {erroGeral}
        </p>
      )}
      <button type="submit" class="botao botao-primario botao-largo" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar despesa'}
      </button>
    </form>
  );
}
```

- [ ] **Step 6: Ligar as rotas em `src/ui/Casca.tsx`**

Adicione `import { FormDespesa } from './telas/FormDespesa';` e, no `switch`:

```tsx
    case 'nova':
      return <FormDespesa key="nova" estado={estado} />;
    case 'editar':
      return <FormDespesa key={`editar-${rota.id}`} estado={estado} id={rota.id} />;
```

(A `key` garante um formulário limpo a cada abertura.)

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/ui` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 8: Confirmar que o teste de toque duplo pega o erro**

Em `salvar`, comente temporariamente a linha `if (travado.current) return;`. Run: `npx vitest run tests/ui/FormDespesa.test.tsx -t "dois toques"` → Expected: FAIL em `marcas.count()` (2 marcas "Netflix"). A despesa em si não duplica porque o ID é gerado uma vez só, quando o formulário abre; a trava protege o que é criado no salvamento. Restaure a linha → PASS.

- [ ] **Step 9: Commit**

```bash
git add src/ui tests/ui/formDespesa.test.ts tests/ui/FormDespesa.test.tsx
git commit -m "feat(ui): formulário de despesa com validação, prévia, sugestão de vencimento e marca automática" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 13: Tela Lançamentos (busca, filtros, pagar, CSV)

**Files:**
- Create: `src/ui/arquivo.ts`, `src/ui/telas/Lancamentos.tsx`
- Modify: `src/ui/Casca.tsx` (rotear `lancamentos`)
- Test: `tests/ui/arquivo.test.ts`, `tests/ui/Lancamentos.test.tsx`

**Interfaces:**
- Consumes: `detalhar`, `valorEfetivo`, `ItemLista` (Task 6); `filtrar` (Task 6); `gerarCsv` (Task 8); `marcarPaga`, `desfazerPagamento` (Task 7); `LinhaLancamento` (Task 11); componentes/contexto (Task 10).
- Produces:
  - `arquivo.ts`: `type ResultadoArquivo = 'compartilhado' | 'baixado' | 'cancelado'`, `compartilharOuBaixar(nome: string, conteudo: string, tipo: string): Promise<ResultadoArquivo>`, `lerArquivoTexto(arquivo: File): Promise<string>` (via `FileReader`, UTF-8)
  - `Lancamentos({ estado })`

- [ ] **Step 1: Escrever os testes**

`tests/ui/arquivo.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compartilharOuBaixar, lerArquivoTexto } from '../../src/ui/arquivo';

const nav = navigator as Navigator & { canShare?: unknown; share?: unknown };

afterEach(() => {
  delete nav.canShare;
  delete nav.share;
  vi.restoreAllMocks();
});

describe('compartilharOuBaixar', () => {
  it('sem folha de compartilhar, baixa com o nome certo', async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    let nome = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      nome = this.download;
    });
    expect(await compartilharOuBaixar('a.csv', 'x', 'text/csv')).toBe('baixado');
    expect(nome).toBe('a.csv');
  });

  it('usa a folha de compartilhar quando o aparelho aceita arquivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(nav, { canShare: () => true, share });
    expect(await compartilharOuBaixar('b.json', '{}', 'application/json')).toBe('compartilhado');
    expect(share).toHaveBeenCalledOnce();
  });

  it('cancelar o compartilhamento não baixa nada', async () => {
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    Object.assign(nav, { canShare: () => true, share: vi.fn().mockRejectedValue(new DOMException('cancelado', 'AbortError')) });
    expect(await compartilharOuBaixar('b.json', '{}', 'application/json')).toBe('cancelado');
    expect(clique).not.toHaveBeenCalled();
  });
});

describe('lerArquivoTexto', () => {
  it('lê UTF-8 com acentos', async () => {
    const f = new File(['Açaí ⟦⟧'], 'x.json', { type: 'application/json' });
    expect(await lerArquivoTexto(f)).toBe('Açaí ⟦⟧');
  });
});
```

`tests/ui/Lancamentos.test.tsx`:

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Lancamentos } from '../../src/ui/telas/Lancamentos';
import { avulsa, parcelada } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
});

async function popular(): Promise<void> {
  await repo.salvarDespesa(base, avulsa({ id: 'a', descricao: 'Açaí da esquina', vencimento: '2026-10-05', categoriaId: 'cat-alimentacao' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'b', descricao: 'Academia', vencimento: '2026-10-20', categoriaId: 'cat-saude' }), { hoje: HOJE });
  await repo.salvarDespesa(
    base,
    parcelada({ id: 'p', descricao: 'Celular', numParcelas: 12, comecaNaParcela: 11, valorParcela: 45000, valorTotal: 540000, primeiroVencimento: undefined, mesPrimeira: '2026-10', categoriaId: 'cat-compras' }),
    { hoje: HOJE },
  );
}

function abrir() {
  renderizar(<ComEstado filho={(e) => <Lancamentos estado={e} />} />, base);
}

describe('Lançamentos', () => {
  it('busca sem acento', async () => {
    await popular();
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'acai' } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('filtra por situação', async () => {
    await popular();
    abrir();
    fireEvent.change(await screen.findByLabelText('Situação'), { target: { value: 'atrasada' } });
    expect(screen.getByText('Açaí da esquina')).toBeInTheDocument();
    expect(screen.queryByText('Academia')).toBeNull();
  });

  it('mostra os sem vencimento numa seção própria', async () => {
    await popular();
    abrir();
    const titulo = await screen.findByRole('heading', { name: 'Sem vencimento — a confirmar' });
    expect(within(titulo.nextElementSibling as HTMLElement).getByText('Celular')).toBeInTheDocument();
  });

  it('pagar e desfazer', async () => {
    await popular();
    abrir();
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar Academia como paga' }));
    expect(await screen.findByText('Academia marcada como paga')).toBeInTheDocument();
    expect((await base.lancamentos.get('b#1'))!.pagoEm).toBe(HOJE);
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect((await base.lancamentos.get('b#1'))!.pagoEm).toBeUndefined());
  });

  it('filtros sem resultado oferecem limpar', async () => {
    await popular();
    abrir();
    fireEvent.input(await screen.findByLabelText('Buscar'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum lançamento com esses filtros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Academia')).toBeInTheDocument();
  });

  it('sem nada cadastrado, convida a cadastrar', async () => {
    abrir();
    expect(await screen.findByText('Nenhum lançamento ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar despesa' })).toHaveAttribute('href', '#/nova');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui/arquivo.test.ts tests/ui/Lancamentos.test.tsx`
Expected: FAIL — `arquivo` e `Lancamentos` não existem.

- [ ] **Step 3: Implementar `src/ui/arquivo.ts`**

```ts
export type ResultadoArquivo = 'compartilhado' | 'baixado' | 'cancelado';

/** No iPhone abre a folha de compartilhar (Arquivos, AirDrop, iCloud Drive); sem ela, baixa. */
export async function compartilharOuBaixar(nome: string, conteudo: string, tipo: string): Promise<ResultadoArquivo> {
  const arquivo = new File([conteudo], nome, { type: tipo });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo] });
      return 'compartilhado';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado';
      // Outro erro de compartilhamento: cai para o download.
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'baixado';
}

export function lerArquivoTexto(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsText(arquivo, 'utf-8');
  });
}
```

- [ ] **Step 4: Implementar `src/ui/telas/Lancamentos.tsx`**

```tsx
import { IconFileSpreadsheet } from '@tabler/icons-preact';
import { useMemo, useState } from 'preact/hooks';
import { gerarCsv } from '../../dados/csv';
import { desfazerPagamento, marcarPaga } from '../../dados/repositorio';
import { formatarMesCurto } from '../../dominio/datas';
import { formatarReais } from '../../dominio/dinheiro';
import { filtrar } from '../../dominio/filtros';
import { detalhar, valorEfetivo, type ItemLista } from '../../dominio/resumo';
import type { Situacao, TipoDespesa } from '../../dominio/tipos';
import { compartilharOuBaixar } from '../arquivo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { LinhaLancamento } from '../componentes/LinhaLancamento';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje, usarMes } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

const SITUACOES: [Situacao, string][] = [
  ['pendente', 'Pendentes'],
  ['atrasada', 'Atrasadas'],
  ['paga', 'Pagas'],
  ['sem-vencimento', 'Sem vencimento'],
];

export function Lancamentos({ estado }: { estado: Estado }) {
  const base = usarBase();
  const hoje = usarHoje();
  const { mes, setMes } = usarMes();
  const mostrar = usarToast();
  const [texto, setTexto] = useState('');
  const [todosMeses, setTodosMeses] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [situacao, setSituacao] = useState<Situacao | ''>('');
  const [tipo, setTipo] = useState<TipoDespesa | ''>('');
  const [meioId, setMeioId] = useState('');

  const itens = useMemo(() => detalhar(estado.lancamentos, estado, hoje), [estado, hoje]);
  const meses = useMemo(() => [...new Set([...itens.map((i) => i.lancamento.mes), mes])].sort(), [itens, mes]);
  const lista = filtrar(itens, {
    texto,
    mes: todosMeses ? undefined : mes,
    categoriaId: categoriaId || undefined,
    situacao: situacao || undefined,
    tipo: tipo || undefined,
    meioPagamentoId: meioId || undefined,
  });
  const comVencimento = lista.filter((i) => i.situacao !== 'sem-vencimento');
  const semVencimento = lista.filter((i) => i.situacao === 'sem-vencimento');
  const total = lista.reduce((s, i) => s + valorEfetivo(i.lancamento), 0);
  const temFiltro = texto !== '' || todosMeses || categoriaId !== '' || situacao !== '' || tipo !== '' || meioId !== '';

  function limpar() {
    setTexto('');
    setTodosMeses(false);
    setCategoriaId('');
    setSituacao('');
    setTipo('');
    setMeioId('');
  }

  async function pagar(item: ItemLista) {
    await marcarPaga(base, item.lancamento.id, hoje);
    mostrar(`${item.despesa.descricao} marcada como paga`, {
      rotulo: 'Desfazer',
      executar: () => void desfazerPagamento(base, item.lancamento.id),
    });
  }

  async function exportarCsv() {
    const nome = `julius-lancamentos-${todosMeses ? 'todos' : mes}.csv`;
    const r = await compartilharOuBaixar(nome, gerarCsv(lista), 'text/csv;charset=utf-8');
    if (r !== 'cancelado') mostrar('Planilha exportada');
  }

  const linhas = (xs: ItemLista[]) => (
    <ul class="lista">
      {xs.map((i) => (
        <LinhaLancamento key={i.lancamento.id} item={i} onPagar={(x) => void pagar(x)} />
      ))}
    </ul>
  );

  return (
    <>
      <h1>Lançamentos</h1>
      <input
        type="search"
        class="busca"
        aria-label="Buscar"
        placeholder="Buscar por nome, loja ou marca"
        value={texto}
        onInput={(e) => setTexto(e.currentTarget.value)}
      />
      <div class="filtros">
        <select
          aria-label="Mês"
          class={todosMeses ? '' : 'ativo'}
          value={todosMeses ? '' : mes}
          onChange={(e) => {
            const valor = e.currentTarget.value;
            if (valor) {
              setTodosMeses(false);
              setMes(valor);
            } else {
              setTodosMeses(true);
            }
          }}
        >
          <option value="">Todos os meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {formatarMesCurto(m)}
            </option>
          ))}
        </select>
        <select aria-label="Categoria" class={categoriaId ? 'ativo' : ''} value={categoriaId} onChange={(e) => setCategoriaId(e.currentTarget.value)}>
          <option value="">Categoria</option>
          {estado.categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select aria-label="Situação" class={situacao ? 'ativo' : ''} value={situacao} onChange={(e) => setSituacao(e.currentTarget.value as Situacao | '')}>
          <option value="">Situação</option>
          {SITUACOES.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <select aria-label="Tipo" class={tipo ? 'ativo' : ''} value={tipo} onChange={(e) => setTipo(e.currentTarget.value as TipoDespesa | '')}>
          <option value="">Tipo</option>
          <option value="avulsa">Avulsas</option>
          <option value="parcelada">Parceladas</option>
          <option value="recorrente">Recorrentes</option>
        </select>
        <select aria-label="Meio de pagamento" class={meioId ? 'ativo' : ''} value={meioId} onChange={(e) => setMeioId(e.currentTarget.value)}>
          <option value="">Pagamento</option>
          {estado.meios.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        estado.lancamentos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum lançamento ainda"
            texto="Cadastre uma despesa e as parcelas e cobranças aparecem aqui."
            acao={{ rotulo: 'Cadastrar despesa', href: '#/nova' }}
          />
        ) : (
          <EstadoVazio
            titulo="Nenhum lançamento com esses filtros"
            texto="Tente outro mês ou limpe os filtros."
            acao={temFiltro ? { rotulo: 'Limpar filtros', onClick: limpar } : undefined}
          />
        )
      ) : (
        <>
          <p class="texto-suave">
            {plural(lista.length, 'lançamento', 'lançamentos')} · {formatarReais(total)}
          </p>
          {comVencimento.length > 0 && linhas(comVencimento)}
          {semVencimento.length > 0 && (
            <>
              <h2>Sem vencimento — a confirmar</h2>
              {linhas(semVencimento)}
            </>
          )}
          <div class="acoes">
            <button type="button" class="botao" onClick={() => void exportarCsv()}>
              <IconFileSpreadsheet aria-hidden="true" /> Exportar CSV
            </button>
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 5: Ligar a rota em `src/ui/Casca.tsx`**

Adicione `import { Lancamentos } from './telas/Lancamentos';` e no `switch`:

```tsx
    case 'lancamentos':
      return <Lancamentos estado={estado} />;
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/ui` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/ui tests/ui/arquivo.test.ts tests/ui/Lancamentos.test.tsx
git commit -m "feat(ui): lançamentos com busca, filtros, pagamento rápido e exportação CSV" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Despesas e detalhe da despesa (ações e histórico)

**Files:**
- Create: `src/ui/telas/Despesas.tsx`, `src/ui/telas/DetalheDespesa.tsx`
- Modify: `src/ui/textos.ts` (adicionar `formatarValorCampo`, `descreverMudanca`, `resumoDespesa`, `ROTULO_ESTADO`), `src/ui/Casca.tsx` (rotear `despesas` e `despesa`)
- Test: `tests/ui/textos.test.ts`, `tests/ui/Despesas.test.tsx`

**Interfaces:**
- Consumes: `estadoRecorrencia`, `pausar`, `retomar`, `encerrar` (Task 5); `detalhar`, `valorEfetivo` (Task 6); `ordenarItens` (Task 6); `alterarRecorrencia`, `marcarPaga`, `desfazerPagamento`, `editarLancamento`, `contarLancamentos`, `excluirDespesa` (Task 7); `usarConsulta` (Task 10); `Logo` (Task 9); componentes (Tasks 10–11).
- Produces:
  - `textos.ts`: `ROTULO_ESTADO: Record<EstadoRecorrencia, string>`, `formatarValorCampo(campo: string, valor: unknown): string`, `descreverMudanca(m: Mudanca, resolver?: (campo: string, valor: unknown) => string | undefined): string`, `resumoDespesa(d: Despesa, lancamentos: Lancamento[]): string`
  - `Despesas({ estado })`, `DetalheDespesa({ estado, id })`

- [ ] **Step 1: Escrever os testes**

`tests/ui/textos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { descreverMudanca, resumoDespesa } from '../../src/ui/textos';
import { avulsa, lanc, parcelada, recorrente } from '../fabricas';

describe('descreverMudanca', () => {
  it.each([
    [{ campo: 'valorTotal', de: 100000, para: 120000 }, 'valor total: R$ 1.000,00 → R$ 1.200,00'],
    [{ campo: 'vencimento', de: null, para: '2026-11-07' }, 'vencimento: vazio → 07/11/2026'],
    [{ campo: 'mesPrimeira', de: '2026-10', para: '2026-11' }, 'mês da 1ª parcela: outubro de 2026 → novembro de 2026'],
    [{ campo: 'aConfirmar', de: ['vencimento', 'loja'], para: [] }, 'a confirmar: vencimento, loja ou marca → nenhum'],
    [{ campo: 'valorVariavel', de: false, para: true }, 'valor variável: não → sim'],
    [{ campo: 'frequencia', de: 'mensal', para: 'anual' }, 'frequência: mensal → anual'],
    [{ campo: 'descricao', de: 'A', para: 'B' }, 'descrição: A → B'],
  ])('%o', (m, esperado) => {
    expect(descreverMudanca(m)).toBe(esperado);
  });

  it('usa o resolvedor para nomes de cadastros', () => {
    const nomes: Record<string, string> = { a: 'Saúde', b: 'Outros' };
    expect(descreverMudanca({ campo: 'categoriaId', de: 'a', para: 'b' }, (_c, v) => nomes[v as string])).toBe('categoria: Saúde → Outros');
  });
});

describe('resumoDespesa', () => {
  it('recorrente', () => {
    expect(resumoDespesa(recorrente({ valorVariavel: true }), [])).toBe('Mensal · R$ 39,90 (varia)');
  });
  it('parcelada em andamento', () => {
    const d = parcelada({ numParcelas: 12, comecaNaParcela: 11, valorParcela: 45000 });
    const ls = [lanc({ id: 'pa1#11', despesaId: 'pa1', numero: 11, valor: 45000, pagoEm: '2026-10-06' }), lanc({ id: 'pa1#12', despesaId: 'pa1', numero: 12, valor: 45000 })];
    expect(resumoDespesa(d, ls)).toBe('Parcelas 11 a 12 de R$ 450,00 · 1 paga');
  });
  it('parcelada desde o início', () => {
    expect(resumoDespesa(parcelada(), [])).toBe('3 parcelas de R$ 333,34 · 0 pagas');
  });
  it('avulsa', () => {
    expect(resumoDespesa(avulsa(), [])).toBe('R$ 100,00 · vence 10/10/2026');
    expect(resumoDespesa(avulsa({ vencimento: undefined }), [])).toBe('R$ 100,00 · vencimento a confirmar');
  });
});
```

`tests/ui/Despesas.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { DetalheDespesa } from '../../src/ui/telas/DetalheDespesa';
import { Despesas } from '../../src/ui/telas/Despesas';
import { avulsa, parcelada, recorrente } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  location.hash = '';
  vi.restoreAllMocks();
});

const detalhe = (id: string) => renderizar(<ComEstado filho={(e) => <DetalheDespesa estado={e} id={id} />} />, base);

describe('Despesas', () => {
  it('lista por tipo e mostra estado vazio por aba', async () => {
    await repo.salvarDespesa(base, recorrente({ descricao: 'Streaming', categoriaId: 'cat-assinaturas' }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Despesas estado={e} />} />, base);
    expect(await screen.findByText('Streaming')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Parceladas' }));
    expect(screen.getByText('Nenhuma compra parcelada')).toBeInTheDocument();
  });

  it('agrupa o que está a confirmar', async () => {
    await repo.salvarDespesa(base, avulsa({ descricao: 'Celular', aConfirmar: ['vencimento', 'loja'] }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Despesas estado={e} />} />, base);
    expect(await screen.findByText(/vencimento, loja ou marca/)).toBeInTheDocument();
  });
});

describe('DetalheDespesa', () => {
  it('mostra parcelas e histórico', async () => {
    await repo.salvarDespesa(base, parcelada(), { hoje: HOJE });
    detalhe('pa1');
    expect(await screen.findByText('Parcela 1/3')).toBeInTheDocument();
    expect(screen.getByText(/Criada/)).toBeInTheDocument();
  });

  it('pausar pede confirmação e remove as cobranças futuras', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await repo.salvarDespesa(base, recorrente({ id: 'r', inicio: '2026-09-08' }), { hoje: HOJE });
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Pausar' }));
    await waitFor(async () => expect(await base.lancamentos.where('despesaId').equals('r').count()).toBe(1));
    expect(await screen.findByRole('button', { name: 'Retomar' })).toBeInTheDocument();
  });

  it('corrigir o valor de um mês estimado', async () => {
    await repo.salvarDespesa(base, recorrente({ id: 'r', valorVariavel: true }), { hoje: HOJE });
    detalhe('r');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar novembro de 2026' }));
    fireEvent.input(screen.getByLabelText('Valor'), { target: { value: '45,12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.lancamentos.get('r@2026-11')).toMatchObject({ valor: 4512, estimado: false }));
  });

  it('excluir só depois de confirmar e volta para a lista', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await repo.salvarDespesa(base, avulsa(), { hoje: HOJE });
    detalhe('av1');
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(await base.despesas.get('av1')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(async () => expect(await base.despesas.get('av1')).toBeUndefined());
    expect(confirmar.mock.calls[1]![0]).toBe('Excluir "Despesa teste"? 1 lançamento será apagado. Isso não pode ser desfeito.');
    expect(location.hash).toBe('#/despesas');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui/textos.test.ts tests/ui/Despesas.test.tsx`
Expected: FAIL — funções e telas não existem.

- [ ] **Step 3: Acrescentar ao fim de `src/ui/textos.ts`**

```ts
import { ehDataISO, ehMesISO, formatarData, formatarMes } from '../dominio/datas';
import { formatarReais } from '../dominio/dinheiro';
import type { EstadoRecorrencia } from '../dominio/recorrencias';
import type { Despesa, Lancamento, Mudanca } from '../dominio/tipos';

export const ROTULO_ESTADO: Record<EstadoRecorrencia, string> = { ativa: 'Ativa', pausada: 'Pausada', encerrada: 'Encerrada' };

const CAMPOS_VALOR = new Set(['valor', 'valorTotal', 'valorParcela', 'valorPago']);

const ROTULO_CAMPO: Record<string, string> = {
  descricao: 'descrição',
  categoriaId: 'categoria',
  marcaId: 'marca',
  meioPagamentoId: 'meio de pagamento',
  dataCompra: 'data da compra',
  observacoes: 'observações',
  aConfirmar: 'a confirmar',
  valor: 'valor',
  vencimento: 'vencimento',
  mes: 'mês',
  valorTotal: 'valor total',
  numParcelas: 'nº de parcelas',
  valorParcela: 'valor da parcela',
  primeiroVencimento: '1º vencimento',
  mesPrimeira: 'mês da 1ª parcela',
  comecaNaParcela: 'começa na parcela',
  valorVariavel: 'valor variável',
  frequencia: 'frequência',
  inicio: 'início',
  fim: 'fim',
  pausas: 'pausas',
  pagoEm: 'pago em',
  valorPago: 'valor pago',
  estimado: 'estimado',
};

export function formatarValorCampo(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'vazio';
  if (CAMPOS_VALOR.has(campo) && typeof valor === 'number') return formatarReais(valor);
  if (typeof valor === 'boolean') return valor ? 'sim' : 'não';
  if (campo === 'frequencia' && typeof valor === 'string') return ROTULO_FREQUENCIA[valor as Frequencia]?.toLowerCase() ?? valor;
  if (ehDataISO(valor)) return formatarData(valor);
  if (ehMesISO(valor)) return formatarMes(valor);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return 'nenhum';
    return valor
      .map((x) => (typeof x === 'string' ? (ROTULO_A_CONFIRMAR[x as CampoAConfirmar] ?? x) : JSON.stringify(x)))
      .join(', ');
  }
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

export function descreverMudanca(
  m: Mudanca,
  resolver: (campo: string, valor: unknown) => string | undefined = () => undefined,
): string {
  const fmt = (v: unknown) => resolver(m.campo, v) ?? formatarValorCampo(m.campo, v);
  return `${ROTULO_CAMPO[m.campo] ?? m.campo}: ${fmt(m.de)} → ${fmt(m.para)}`;
}

export function resumoDespesa(d: Despesa, lancamentos: Lancamento[]): string {
  if (d.tipo === 'recorrente') {
    return `${ROTULO_FREQUENCIA[d.frequencia]} · ${formatarReais(d.valor)}${d.valorVariavel ? ' (varia)' : ''}`;
  }
  if (d.tipo === 'parcelada') {
    const pagas = lancamentos.filter((l) => l.pagoEm).length;
    const valor = d.valorParcela ?? (d.valorTotal - Math.floor(d.valorTotal / d.numParcelas) * (d.numParcelas - 1));
    const faixa = d.comecaNaParcela > 1 ? `Parcelas ${d.comecaNaParcela} a ${d.numParcelas}` : `${d.numParcelas} parcelas`;
    return `${faixa} de ${formatarReais(valor)} · ${plural(pagas, 'paga', 'pagas')}`;
  }
  return `${formatarReais(d.valor)} · ${d.vencimento ? `vence ${formatarData(d.vencimento)}` : 'vencimento a confirmar'}`;
}
```

Mova os imports novos para o topo do arquivo e acrescente `Frequencia` e `CampoAConfirmar` ao `import type` já existente de `../dominio/tipos` (eles já estão lá desde a Task 10). O valor exibido da parcelada sem `valorParcela` é o da 1ª parcela (que leva os centavos restantes), como em `dividirEmParcelas`.

- [ ] **Step 4: Implementar `src/ui/telas/Despesas.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { estadoRecorrencia, type EstadoRecorrencia } from '../../dominio/recorrencias';
import type { Lancamento, TipoDespesa } from '../../dominio/tipos';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { caminho } from '../rota';
import { ROTULO_A_CONFIRMAR, ROTULO_ESTADO, resumoDespesa } from '../textos';

const ABAS: { tipo: TipoDespesa; rotulo: string; vazio: { titulo: string; texto: string; acao: string } }[] = [
  {
    tipo: 'recorrente',
    rotulo: 'Recorrentes',
    vazio: { titulo: 'Nenhuma despesa fixa ainda', texto: 'Cadastre aluguel, internet, assinaturas e outras contas que se repetem.', acao: 'Cadastrar despesa fixa' },
  },
  {
    tipo: 'parcelada',
    rotulo: 'Parceladas',
    vazio: { titulo: 'Nenhuma compra parcelada', texto: 'Cadastre uma compra e as parcelas são geradas sozinhas.', acao: 'Cadastrar compra parcelada' },
  },
  {
    tipo: 'avulsa',
    rotulo: 'Avulsas',
    vazio: { titulo: 'Nenhuma despesa avulsa', texto: 'Contas que acontecem uma vez só aparecem aqui.', acao: 'Cadastrar despesa' },
  },
];

export function PilulaEstado({ estado }: { estado: EstadoRecorrencia }) {
  return <span class={`pilula${estado === 'ativa' ? ' pilula-paga' : ''}`}>{ROTULO_ESTADO[estado]}</span>;
}

export function Despesas({ estado }: { estado: Estado }) {
  const hoje = usarHoje();
  const [aba, setAba] = useState<TipoDespesa>('recorrente');
  const atual = ABAS.find((a) => a.tipo === aba)!;
  const lista = estado.despesas.filter((d) => d.tipo === aba).sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'));
  const pendentes = estado.despesas.filter((d) => d.aConfirmar.length > 0);
  const marcas = new Map(estado.marcas.map((m) => [m.id, m]));
  const categorias = new Map(estado.categorias.map((c) => [c.id, c]));
  const porDespesa = new Map<string, Lancamento[]>();
  for (const l of estado.lancamentos) porDespesa.set(l.despesaId, [...(porDespesa.get(l.despesaId) ?? []), l]);

  return (
    <>
      <h1>Despesas</h1>
      {pendentes.length > 0 && (
        <section class="cartao" aria-labelledby="titulo-a-confirmar">
          <h2 id="titulo-a-confirmar">A confirmar</h2>
          <ul>
            {pendentes.map((d) => (
              <li key={d.id}>
                <a href={caminho({ tela: 'despesa', id: d.id })}>{d.descricao}</a>: {d.aConfirmar.map((c) => ROTULO_A_CONFIRMAR[c]).join(', ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="segmentado" role="tablist" aria-label="Tipo de despesa">
        {ABAS.map((a) => (
          <button key={a.tipo} type="button" role="tab" aria-selected={aba === a.tipo} onClick={() => setAba(a.tipo)}>
            {a.rotulo}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <EstadoVazio titulo={atual.vazio.titulo} texto={atual.vazio.texto} acao={{ rotulo: atual.vazio.acao, href: '#/nova' }} />
      ) : (
        <ul class="lista">
          {lista.map((d) => (
            <li class="linha" key={d.id}>
              <a class="linha-principal" href={caminho({ tela: 'despesa', id: d.id })}>
                <Logo marca={marcas.get(d.marcaId ?? '')} categoria={categorias.get(d.categoriaId)} rotulo={d.descricao} />
                <span class="linha-textos">
                  <span class="linha-titulo">{d.descricao}</span>
                  <span class="linha-sub">{resumoDespesa(d, porDespesa.get(d.id) ?? [])}</span>
                </span>
                <span class="linha-valores">
                  {d.tipo === 'recorrente' && <PilulaEstado estado={estadoRecorrencia(d, hoje)} />}
                  {d.aConfirmar.length > 0 && <span class="pilula pilula-sem-vencimento">a confirmar</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 5: Implementar `src/ui/telas/DetalheDespesa.tsx`**

```tsx
import { IconArrowBackUp, IconCheck, IconEdit } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import {
  alterarRecorrencia,
  contarLancamentos,
  desfazerPagamento,
  editarLancamento,
  excluirDespesa,
  marcarPaga,
} from '../../dados/repositorio';
import { ehDataISO, formatarData, formatarDataHora, formatarMes } from '../../dominio/datas';
import { formatarNumero, formatarReais, lerReais } from '../../dominio/dinheiro';
import { ordenarItens } from '../../dominio/filtros';
import { encerrar, estadoRecorrencia, pausar, retomar } from '../../dominio/recorrencias';
import { detalhar, valorEfetivo, type ItemLista } from '../../dominio/resumo';
import { ErroDominio } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { PilulaSituacao } from '../componentes/PilulaSituacao';
import { usarToast } from '../componentes/Toast';
import { usarConsulta } from '../consulta';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { caminho, navegar } from '../rota';
import { descreverMudanca, plural, resumoDespesa, ROTULO_A_CONFIRMAR, ROTULO_ACAO, ROTULO_ESTADO } from '../textos';

function rotuloLancamento(item: ItemLista): string {
  const { lancamento: l, despesa: d } = item;
  return d.tipo === 'parcelada' && l.numero ? `Parcela ${l.numero}/${d.numParcelas}` : formatarMes(l.mes);
}

function LinhaDetalhe({ item, aoEditar }: { item: ItemLista; aoEditar: () => void }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const l = item.lancamento;
  const rotulo = rotuloLancamento(item);
  return (
    <li class="linha">
      <span class="linha-principal">
        <span class="linha-textos">
          <span class="linha-titulo">{rotulo}</span>
          <span class="linha-sub">
            {formatarReais(valorEfetivo(l))}
            {l.pagoEm ? ` · paga em ${formatarData(l.pagoEm)}` : ''}
          </span>
        </span>
        <PilulaSituacao situacao={item.situacao} vencimento={l.vencimento} estimado={l.estimado} />
      </span>
      {l.pagoEm ? (
        <button
          type="button"
          class="botao-icone"
          aria-label={`Desfazer pagamento de ${rotulo}`}
          onClick={() => void desfazerPagamento(base, l.id).then(() => mostrar('Pagamento desfeito'))}
        >
          <IconArrowBackUp aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          class="botao-icone botao-pagar"
          aria-label={`Marcar ${rotulo} como paga`}
          onClick={() => void marcarPaga(base, l.id, hoje).then(() => mostrar(`${rotulo} marcada como paga`))}
        >
          <IconCheck aria-hidden="true" />
        </button>
      )}
      <button type="button" class="botao-icone" aria-label={`Editar ${rotulo}`} onClick={aoEditar}>
        <IconEdit aria-hidden="true" />
      </button>
    </li>
  );
}

function EditorLancamento({ item, aoFechar }: { item: ItemLista; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const l = item.lancamento;
  const [valor, setValor] = useState(formatarNumero(l.valor));
  const [vencimento, setVencimento] = useState(l.vencimento ?? '');
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    const centavos = lerReais(valor);
    if (centavos === null || centavos <= 0) return setErro('Informe um valor maior que zero.');
    if (vencimento && !ehDataISO(vencimento)) return setErro('Data inválida.');
    try {
      await editarLancamento(base, l.id, { valor: centavos, vencimento: vencimento || null });
      mostrar('Lançamento atualizado');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <li class="cartao">
      <form onSubmit={(e) => void salvar(e)} noValidate aria-label={`Editar ${rotuloLancamento(item)}`}>
        <div class="duas-colunas">
          <Campo id={`e-valor-${l.id}`} rotulo="Valor">
            <input id={`e-valor-${l.id}`} inputMode="decimal" value={valor} onInput={(e) => setValor(e.currentTarget.value)} />
          </Campo>
          <Campo id={`e-venc-${l.id}`} rotulo="Vencimento">
            <input id={`e-venc-${l.id}`} type="date" value={vencimento} onInput={(e) => setVencimento(e.currentTarget.value)} />
          </Campo>
        </div>
        {erro && (
          <p class="campo-erro" role="alert">
            {erro}
          </p>
        )}
        <div class="acoes">
          <button type="submit" class="botao botao-primario">
            Salvar
          </button>
          <button type="button" class="botao" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

export function DetalheDespesa({ estado, id }: { estado: Estado; id: string }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const historico = usarConsulta(() => base.historico.where('despesaId').equals(id).toArray(), [base, id]);
  const [editando, setEditando] = useState<string | null>(null);
  const [fim, setFim] = useState(hoje);
  const [erro, setErro] = useState('');

  const d = estado.despesas.find((x) => x.id === id);
  if (!d) {
    return <EstadoVazio titulo="Despesa não encontrada" texto="Ela pode ter sido excluída." acao={{ rotulo: 'Ver despesas', href: '#/despesas' }} />;
  }

  const itens = detalhar(estado.lancamentos.filter((l) => l.despesaId === id), estado, hoje).sort(ordenarItens);
  const categoria = estado.categorias.find((c) => c.id === d.categoriaId);
  const marca = estado.marcas.find((m) => m.id === d.marcaId);
  const meio = estado.meios.find((m) => m.id === d.meioPagamentoId);
  const situacaoRecorrencia = d.tipo === 'recorrente' ? estadoRecorrencia(d, hoje) : null;
  const eventos = [...(historico ?? [])].sort((a, b) => b.quando.localeCompare(a.quando));

  const resolver = (campo: string, valor: unknown): string | undefined => {
    if (typeof valor !== 'string') return undefined;
    if (campo === 'categoriaId') return estado.categorias.find((c) => c.id === valor)?.nome;
    if (campo === 'marcaId') return estado.marcas.find((m) => m.id === valor)?.nome;
    if (campo === 'meioPagamentoId') return estado.meios.find((m) => m.id === valor)?.nome;
    return undefined;
  };

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setErro('');
    try {
      await acao();
      mostrar(sucesso);
    } catch (e) {
      setErro(e instanceof ErroDominio ? e.message : 'Não foi possível concluir. Tente de novo.');
    }
  }

  async function excluir() {
    const c = await contarLancamentos(base, id);
    const apagados = c.total === 1 ? '1 lançamento será apagado' : `${c.total} lançamentos serão apagados`;
    const pagos = c.pagos > 0 ? `, incluindo ${plural(c.pagos, 'pago', 'pagos')}` : '';
    if (!window.confirm(`Excluir "${d!.descricao}"? ${apagados}${pagos}. Isso não pode ser desfeito.`)) return;
    await excluirDespesa(base, id);
    mostrar('Despesa excluída');
    navegar({ tela: 'despesas' });
  }

  function confirmarPausa() {
    if (!window.confirm(`Pausar "${d!.descricao}" a partir de hoje? As cobranças futuras não pagas serão removidas.`)) return;
    void executar(() => alterarRecorrencia(base, id, (r) => pausar(r, hoje), 'pausada', hoje), 'Recorrência pausada');
  }

  function confirmarEncerramento() {
    if (!ehDataISO(fim)) return setErro('Informe uma data válida.');
    if (!window.confirm(`Encerrar "${d!.descricao}" em ${formatarData(fim)}? Cobranças não pagas depois dessa data serão removidas.`)) return;
    void executar(() => alterarRecorrencia(base, id, (r) => encerrar(r, fim), 'encerrada', hoje), 'Recorrência encerrada');
  }

  return (
    <>
      <a href="#/despesas" class="voltar">
        ‹ Despesas
      </a>
      <div class="cabecalho-despesa">
        <Logo marca={marca} categoria={categoria} rotulo={d.descricao} tamanho={56} />
        <div>
          <h1>{d.descricao}</h1>
          <p class="texto-suave">{[categoria?.nome, marca?.nome, meio?.nome].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p>
        {resumoDespesa(d, itens.map((i) => i.lancamento))}
        {situacaoRecorrencia && ` · ${ROTULO_ESTADO[situacaoRecorrencia]}`}
      </p>
      {d.observacoes && <p class="texto-suave">{d.observacoes}</p>}
      {d.aConfirmar.length > 0 && (
        <a class="aviso aviso-atencao" href={caminho({ tela: 'editar', id })}>
          A confirmar: {d.aConfirmar.map((c) => ROTULO_A_CONFIRMAR[c]).join(', ')}
        </a>
      )}

      <div class="acoes">
        <a class="botao" href={caminho({ tela: 'editar', id })}>
          Editar
        </a>
        {situacaoRecorrencia === 'ativa' && (
          <button type="button" class="botao" onClick={confirmarPausa}>
            Pausar
          </button>
        )}
        {situacaoRecorrencia === 'pausada' && (
          <button
            type="button"
            class="botao"
            onClick={() => void executar(() => alterarRecorrencia(base, id, (r) => retomar(r, hoje), 'retomada', hoje), 'Recorrência retomada')}
          >
            Retomar
          </button>
        )}
        <button type="button" class="botao botao-perigo" onClick={() => void excluir()}>
          Excluir
        </button>
      </div>

      {situacaoRecorrencia !== null && situacaoRecorrencia !== 'encerrada' && (
        <details class="cartao">
          <summary>Encerrar recorrência</summary>
          <Campo id="d-fim" rotulo="Última cobrança em ou antes de">
            <input id="d-fim" type="date" value={fim} onInput={(e) => setFim(e.currentTarget.value)} />
          </Campo>
          <button type="button" class="botao botao-perigo" onClick={confirmarEncerramento}>
            Encerrar
          </button>
        </details>
      )}

      {erro && (
        <p class="erro-geral" role="alert">
          {erro}
        </p>
      )}

      <h2>Lançamentos</h2>
      {itens.length === 0 ? (
        <p class="texto-suave">Nenhum lançamento.</p>
      ) : (
        <ul class="lista">
          {itens.map((i) =>
            editando === i.lancamento.id ? (
              <EditorLancamento key={i.lancamento.id} item={i} aoFechar={() => setEditando(null)} />
            ) : (
              <LinhaDetalhe key={i.lancamento.id} item={i} aoEditar={() => setEditando(i.lancamento.id)} />
            ),
          )}
        </ul>
      )}

      <h2>Histórico</h2>
      <ol class="historico">
        {eventos.map((h) => (
          <li key={h.id}>
            <time>{formatarDataHora(h.quando)}</time>
            {ROTULO_ACAO[h.acao]}
            {h.mudancas.length > 0 && `: ${h.mudancas.map((m) => descreverMudanca(m, resolver)).join('; ')}`}
          </li>
        ))}
      </ol>
    </>
  );
}
```

- [ ] **Step 6: Ligar as rotas em `src/ui/Casca.tsx`**

Adicione os imports de `Despesas` e `DetalheDespesa` e no `switch`:

```tsx
    case 'despesas':
      return <Despesas estado={estado} />;
    case 'despesa':
      return <DetalheDespesa key={rota.id} estado={estado} id={rota.id} />;
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run tests/ui` → Expected: todos passam.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/ui tests/ui/textos.test.ts tests/ui/Despesas.test.tsx
git commit -m "feat(ui): lista de despesas e detalhe com pagar, corrigir, pausar, encerrar, excluir e histórico" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Ajustes, cadastros, backup e boas-vindas

**Files:**
- Create: `src/ui/imagem.ts`, `src/ui/componentes/SeletorIcone.tsx`, `src/ui/componentes/ImportarBackup.tsx`, `src/ui/telas/Ajustes.tsx`, `src/ui/telas/Categorias.tsx`, `src/ui/telas/Marcas.tsx`, `src/ui/telas/Meios.tsx`, `src/ui/telas/Backup.tsx`, `src/ui/telas/OndeFicamDados.tsx`, `src/ui/telas/BoasVindas.tsx`
- Modify: `src/ui/Casca.tsx` (rotear o resto, boas-vindas com banco vazio, **apagar `EmBreve`**)
- Test: `tests/ui/Ajustes.test.tsx`, `tests/ui/Backup.test.tsx`, `tests/ui/Casca.test.tsx`

**Interfaces:**
- Consumes: repositório de cadastros (Task 7); `exportar`, `serializar`, `nomeArquivoBackup`, `lerBackup`, `resumirBackup`, `importar`, `desfazerImportacao`, `temImportacaoParaDesfazer` (Task 8); `buscarNoCatalogo`, `buscarCatalogoPorNome` (Task 9); `NOMES_ICONES`, `Icone` (Task 9); `compartilharOuBaixar`, `lerArquivoTexto` (Task 13); componentes (Tasks 10–11).
- Produces: `redimensionarImagem(arquivo: File, tamanho?: number): Promise<string>`; `SeletorIcone({ valor?, aoEscolher })`; `ImportarBackup({ estado, rotulo?, aoConcluir? })`; telas `Ajustes`, `Categorias`, `Marcas`, `Meios`, `Backup`, `OndeFicamDados`, `BoasVindas`.

- [ ] **Step 1: Escrever os testes**

`tests/ui/Ajustes.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Categorias } from '../../src/ui/telas/Categorias';
import { Meios } from '../../src/ui/telas/Meios';
import { avulsa } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
});

describe('Categorias', () => {
  it('cria uma categoria', async () => {
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'Pets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.categorias.count()).toBe(10));
  });

  it('rejeita nome repetido', async () => {
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'saude' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeInTheDocument();
  });

  it('excluir categoria em uso move as despesas para outra', async () => {
    await repo.salvarDespesa(base, avulsa({ categoriaId: 'cat-saude' }), { hoje: HOJE });
    renderizar(<ComEstado filho={(e) => <Categorias estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Saúde' }));
    expect(screen.getByText('1 despesa usa "Saúde". Para onde ela vai?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mover para'), { target: { value: 'cat-outros' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excluir categoria' }));
    await waitFor(async () => expect((await base.despesas.get('av1'))!.categoriaId).toBe('cat-outros'));
    expect(await base.categorias.get('cat-saude')).toBeUndefined();
  });
});

describe('Meios de pagamento', () => {
  it('valida os dias do cartão e salva', async () => {
    renderizar(<ComEstado filho={(e) => <Meios estado={e} />} />, base);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo meio de pagamento' }));
    fireEvent.input(screen.getByLabelText('Nome'), { target: { value: 'Cartão X' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'credito' } });
    fireEvent.input(screen.getByLabelText('Dia de fechamento'), { target: { value: '40' } });
    fireEvent.input(screen.getByLabelText('Dia de vencimento'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Informe um dia entre 1 e 31.')).toBeInTheDocument();
    fireEvent.input(screen.getByLabelText('Dia de fechamento'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(await base.meios.count()).toBe(1));
    expect((await base.meios.toArray())[0]).toMatchObject({ nome: 'Cartão X', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 });
  });
});
```

`tests/ui/Backup.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportar, serializar } from '../../src/dados/backup';
import type { JuliusDB } from '../../src/dados/db';
import * as repo from '../../src/dados/repositorio';
import { Backup } from '../../src/ui/telas/Backup';
import { avulsa } from '../fabricas';
import { ComEstado, HOJE, novaBase, renderizar } from './auxiliar';

let base: JuliusDB;

beforeEach(async () => {
  base = await novaBase();
  await repo.inicializarPadrao(base);
  await repo.salvarDespesa(base, avulsa({ id: 'a1', descricao: 'Primeira' }), { hoje: HOJE });
  await repo.salvarDespesa(base, avulsa({ id: 'a2', descricao: 'Segunda' }), { hoje: HOJE });
});

const abrir = () => renderizar(<ComEstado filho={(e) => <Backup estado={e} />} />, base);
const enviar = async (conteudo: string) =>
  fireEvent.change(await screen.findByLabelText('Escolher arquivo de backup'), {
    target: { files: [new File([conteudo], 'backup.json', { type: 'application/json' })] },
  });

describe('Backup', () => {
  it('arquivo inválido mostra o motivo e não altera nada', async () => {
    abrir();
    await enviar('{ quebrado');
    expect(await screen.findByText('O arquivo não é um JSON válido.')).toBeInTheDocument();
    expect(await base.despesas.count()).toBe(2);
  });

  it('mostra o que vai substituir, importa e permite desfazer', async () => {
    const outra = await novaBase();
    await repo.inicializarPadrao(outra);
    await repo.salvarDespesa(outra, avulsa({ id: 'x', descricao: 'Do outro aparelho' }), { hoje: HOJE });
    const texto = serializar(await exportar(outra, '2026-10-05T12:00:00.000Z'));

    abrir();
    await enviar(texto);
    expect(await screen.findByText(/O arquivo tem 1 despesa e 1 lançamento/)).toBeInTheDocument();
    expect(screen.getByText(/Seus dados atuais \(2 despesas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Substituir meus dados' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }));
    await waitFor(async () => expect(await base.despesas.count()).toBe(2));
  });
});
```

`tests/ui/Casca.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Casca } from '../../src/ui/Casca';
import { novaBase, renderizar } from './auxiliar';

beforeEach(() => {
  location.hash = '';
});

describe('Casca', () => {
  it('banco vazio mostra boas-vindas; começar do zero leva ao Início', async () => {
    renderizar(<Casca />, await novaBase());
    expect(await screen.findByRole('heading', { name: 'Boas-vindas ao Julius' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Começar do zero' }));
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument();
  });

  it('não sobrou tela provisória', () => {
    expect(readFileSync('src/ui/Casca.tsx', { encoding: 'utf-8' })).not.toContain('EmBreve');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/ui/Ajustes.test.tsx tests/ui/Backup.test.tsx tests/ui/Casca.test.tsx`
Expected: FAIL — telas não existem; `Casca` ainda contém `EmBreve`.

- [ ] **Step 3: Criar `src/ui/imagem.ts` e `src/ui/componentes/SeletorIcone.tsx`**

`src/ui/imagem.ts`:

```ts
/** Reduz uma imagem a um quadrado de `tamanho` px, centralizada sobre fundo branco. Fica no aparelho. */
export async function redimensionarImagem(arquivo: File, tamanho = 128): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tamanho, tamanho);
  const escala = Math.min(tamanho / bitmap.width, tamanho / bitmap.height);
  const largura = bitmap.width * escala;
  const altura = bitmap.height * escala;
  ctx.drawImage(bitmap, (tamanho - largura) / 2, (tamanho - altura) / 2, largura, altura);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
```

`src/ui/componentes/SeletorIcone.tsx`:

```tsx
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
```

- [ ] **Step 4: Criar `src/ui/componentes/ImportarBackup.tsx`**

```tsx
import { useState } from 'preact/hooks';
import { desfazerImportacao, importar, lerBackup, resumirBackup } from '../../dados/backup';
import type { ArquivoBackup } from '../../dados/db';
import { formatarDataHora } from '../../dominio/datas';
import { lerArquivoTexto } from '../arquivo';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';
import { usarToast } from './Toast';

const dataValida = (s: string) => s !== '' && !Number.isNaN(Date.parse(s));

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
  const mostrar = usarToast();
  const [erro, setErro] = useState('');
  const [pendente, setPendente] = useState<ArquivoBackup | null>(null);
  const [importando, setImportando] = useState(false);

  async function escolher(e: Event) {
    setErro('');
    const input = e.currentTarget as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    const r = lerBackup(await lerArquivoTexto(arquivo));
    input.value = '';
    if (!r.ok) {
      setPendente(null);
      setErro(r.erro);
      return;
    }
    setPendente(r.arquivo);
  }

  async function confirmar() {
    if (!pendente) return;
    setImportando(true);
    try {
      await importar(base, pendente);
      setPendente(null);
      mostrar('Dados importados', { rotulo: 'Desfazer', executar: () => void desfazerImportacao(base) });
      aoConcluir?.();
    } catch {
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
```

- [ ] **Step 5: Criar `Ajustes`, `Categorias`, `Marcas`, `Meios`**

`src/ui/telas/Ajustes.tsx`:

```tsx
import { IconCategory, IconChevronRight, IconCreditCard, IconDownload, IconLock, IconPhoto } from '@tabler/icons-preact';

const ITENS = [
  { href: '#/categorias', rotulo: 'Categorias', Icone: IconCategory },
  { href: '#/marcas', rotulo: 'Marcas e logos', Icone: IconPhoto },
  { href: '#/meios', rotulo: 'Meios de pagamento', Icone: IconCreditCard },
  { href: '#/backup', rotulo: 'Backup e importação', Icone: IconDownload },
  { href: '#/dados', rotulo: 'Onde ficam meus dados', Icone: IconLock },
];

export function Ajustes() {
  return (
    <>
      <h1>Ajustes</h1>
      <ul class="lista">
        {ITENS.map(({ href, rotulo, Icone }) => (
          <li class="linha" key={href}>
            <a class="linha-principal" href={href}>
              <Icone aria-hidden="true" />
              <span class="linha-textos">
                <span class="linha-titulo">{rotulo}</span>
              </span>
              <IconChevronRight aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
```

`src/ui/telas/Categorias.tsx`:

```tsx
import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirCategoria, salvarCategoria } from '../../dados/repositorio';
import { ErroDominio, type Categoria } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { Logo } from '../componentes/Logo';
import { SeletorIcone } from '../componentes/SeletorIcone';
import { usarToast } from '../componentes/Toast';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { plural } from '../textos';

function EditorCategoria({ inicial, aoFechar }: { inicial: Categoria; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [c, setC] = useState(inicial);
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarCategoria(base, c);
      mostrar('Categoria salva');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar categoria">
      <Campo id="c-nome" rotulo="Nome" erro={erro}>
        <input id="c-nome" value={c.nome} onInput={(e) => setC({ ...c, nome: e.currentTarget.value })} />
      </Campo>
      <Campo id="c-cor" rotulo="Cor">
        <input id="c-cor" type="color" value={c.cor} onInput={(e) => setC({ ...c, cor: e.currentTarget.value })} />
      </Campo>
      <SeletorIcone valor={c.icone} aoEscolher={(icone) => setC({ ...c, icone })} />
      <div class="acoes">
        <button type="submit" class="botao botao-primario">
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ExcluirCategoria({ categoria, emUso, outras, aoFechar }: { categoria: Categoria; emUso: number; outras: Categoria[]; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [substituta, setSubstituta] = useState(outras[0]?.id ?? '');
  const [erro, setErro] = useState('');

  async function confirmar() {
    try {
      await excluirCategoria(base, categoria.id, emUso > 0 ? substituta : undefined);
      mostrar('Categoria excluída');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível excluir. Tente de novo.');
    }
  }

  const pergunta =
    emUso === 0
      ? `Excluir a categoria "${categoria.nome}"?`
      : emUso === 1
        ? `1 despesa usa "${categoria.nome}". Para onde ela vai?`
        : `${emUso} despesas usam "${categoria.nome}". Para onde elas vão?`;

  return (
    <section class="cartao" aria-label={`Excluir ${categoria.nome}`}>
      <p>{pergunta}</p>
      {emUso > 0 && (
        <Campo id="c-substituta" rotulo="Mover para">
          <select id="c-substituta" value={substituta} onChange={(e) => setSubstituta(e.currentTarget.value)}>
            {outras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <div class="acoes">
        <button type="button" class="botao botao-perigo" onClick={() => void confirmar()}>
          Excluir categoria
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

export function Categorias({ estado }: { estado: Estado }) {
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const uso = (id: string) => estado.despesas.filter((d) => d.categoriaId === id).length;
  const nova = (): Categoria => ({
    id: crypto.randomUUID(),
    nome: '',
    cor: '#57534E',
    icone: 'dots',
    ordem: Math.max(0, ...estado.categorias.map((c) => c.ordem)) + 1,
  });

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Categorias</h1>
      {editando ? (
        <EditorCategoria key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando(nova())}>
          Nova categoria
        </button>
      )}
      {excluindo && (
        <ExcluirCategoria
          key={excluindo.id}
          categoria={excluindo}
          emUso={uso(excluindo.id)}
          outras={estado.categorias.filter((c) => c.id !== excluindo.id)}
          aoFechar={() => setExcluindo(null)}
        />
      )}
      <ul class="lista" style={{ marginTop: '12px' }}>
        {estado.categorias.map((c) => (
          <li class="linha" key={c.id}>
            <span class="linha-principal">
              <Logo categoria={c} rotulo={c.nome} />
              <span class="linha-textos">
                <span class="linha-titulo">{c.nome}</span>
                <span class="linha-sub">{plural(uso(c.id), 'despesa', 'despesas')}</span>
              </span>
            </span>
            <button type="button" class="botao-icone" aria-label={`Editar ${c.nome}`} onClick={() => setEditando(c)}>
              <IconEdit aria-hidden="true" />
            </button>
            <button type="button" class="botao-icone" aria-label={`Excluir ${c.nome}`} onClick={() => setExcluindo(c)}>
              <IconTrash aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

`src/ui/telas/Marcas.tsx`:

```tsx
import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirMarca, salvarMarca } from '../../dados/repositorio';
import { ErroDominio, type Marca } from '../../dominio/tipos';
import { buscarCatalogoPorNome, buscarNoCatalogo } from '../../marcas/identificar';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Logo } from '../componentes/Logo';
import { SeletorIcone } from '../componentes/SeletorIcone';
import { usarToast } from '../componentes/Toast';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';
import { redimensionarImagem } from '../imagem';

function EditorMarca({ inicial, aoFechar }: { inicial: Marca; aoFechar: () => void }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [m, setM] = useState(inicial);
  const [apelidos, setApelidos] = useState(inicial.apelidos.join(', '));
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const resultados = buscarCatalogoPorNome(busca);

  async function enviar(e: Event) {
    const arquivo = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!arquivo) return;
    try {
      setM({ ...m, logoImagem: await redimensionarImagem(arquivo), logoSlug: undefined });
    } catch {
      setErro('Não foi possível ler esta imagem. Tente outra.');
    }
  }

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarMarca(base, { ...m, apelidos: apelidos.split(',') });
      mostrar('Marca salva');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  const origem = m.logoImagem ? 'Imagem enviada' : m.logoSlug ? `Catálogo: ${buscarNoCatalogo(m.logoSlug)?.nome ?? m.logoSlug}` : 'Sem logo';

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar marca">
      <Campo id="m-nome" rotulo="Nome" erro={erro}>
        <input id="m-nome" value={m.nome} onInput={(e) => setM({ ...m, nome: e.currentTarget.value })} />
      </Campo>
      <Campo id="m-apelidos" rotulo="Outros nomes (opcional)" dica="Separe por vírgula. Ajuda a reconhecer a marca na descrição.">
        <input id="m-apelidos" value={apelidos} onInput={(e) => setApelidos(e.currentTarget.value)} />
      </Campo>
      <Campo id="m-cor" rotulo="Cor">
        <input id="m-cor" type="color" value={m.cor ?? '#57534E'} onInput={(e) => setM({ ...m, cor: e.currentTarget.value })} />
      </Campo>
      <SeletorIcone valor={m.icone} aoEscolher={(icone) => setM({ ...m, icone })} />
      <fieldset class="campo">
        <legend class="campo-rotulo">Logo</legend>
        <div class="cabecalho-despesa">
          <Logo marca={m} rotulo={m.nome || '?'} tamanho={56} />
          <span class="texto-suave">{origem}</span>
        </div>
        <Campo id="m-busca" rotulo="Buscar no catálogo">
          <input id="m-busca" value={busca} placeholder="Spotify" onInput={(e) => setBusca(e.currentTarget.value)} />
        </Campo>
        {resultados.length > 0 && (
          <div class="grade-icones">
            {resultados.map((i) => (
              <button key={i.slug} type="button" aria-label={`Usar logo ${i.nome}`} onClick={() => setM({ ...m, logoSlug: i.slug, logoImagem: undefined })}>
                <Logo marca={{ id: i.slug, nome: i.nome, apelidos: [], logoSlug: i.slug }} rotulo={i.nome} tamanho={36} />
              </button>
            ))}
          </div>
        )}
        <div class="acoes">
          <label class="botao">
            Enviar imagem
            <input type="file" accept="image/*" class="visualmente-oculto" onChange={(e) => void enviar(e)} />
          </label>
          {(m.logoImagem || m.logoSlug) && (
            <button type="button" class="botao" onClick={() => setM({ ...m, logoImagem: undefined, logoSlug: undefined })}>
              Remover logo
            </button>
          )}
        </div>
      </fieldset>
      <div class="acoes">
        <button type="submit" class="botao botao-primario">
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Marcas({ estado }: { estado: Estado }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [editando, setEditando] = useState<Marca | null>(null);
  const uso = (id: string) => estado.despesas.filter((d) => d.marcaId === id).length;

  async function excluir(m: Marca) {
    if (!window.confirm(`Excluir a marca "${m.nome}"? As despesas continuam, só sem marca.`)) return;
    await excluirMarca(base, m.id);
    mostrar('Marca excluída');
  }

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Marcas e logos</h1>
      {editando ? (
        <EditorMarca key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando({ id: crypto.randomUUID(), nome: '', apelidos: [] })}>
          Nova marca
        </button>
      )}
      {estado.marcas.length === 0 ? (
        <EstadoVazio
          icone="shopping-bag"
          titulo="Nenhuma marca ainda"
          texto="As marcas aparecem quando você cadastra despesas com loja ou marca. Você também pode criar aqui."
        />
      ) : (
        <ul class="lista" style={{ marginTop: '12px' }}>
          {estado.marcas.map((m) => (
            <li class="linha" key={m.id}>
              <span class="linha-principal">
                <Logo marca={m} rotulo={m.nome} />
                <span class="linha-textos">
                  <span class="linha-titulo">{m.nome}</span>
                  <span class="linha-sub">{uso(m.id) === 1 ? '1 despesa' : `${uso(m.id)} despesas`}</span>
                </span>
              </span>
              <button type="button" class="botao-icone" aria-label={`Editar ${m.nome}`} onClick={() => setEditando(m)}>
                <IconEdit aria-hidden="true" />
              </button>
              <button type="button" class="botao-icone" aria-label={`Excluir ${m.nome}`} onClick={() => void excluir(m)}>
                <IconTrash aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

`src/ui/telas/Meios.tsx`:

```tsx
import { IconEdit, IconTrash } from '@tabler/icons-preact';
import { useState } from 'preact/hooks';
import { excluirMeio, salvarMeio } from '../../dados/repositorio';
import { ErroDominio, type MeioPagamento, type TipoMeio } from '../../dominio/tipos';
import { Campo } from '../componentes/Campo';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { usarToast } from '../componentes/Toast';
import { usarBase, usarHoje } from '../contexto';
import type { Estado } from '../estado';
import { ROTULO_MEIO } from '../textos';

const lerDia = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

function EditorMeio({ inicial, aoFechar }: { inicial: MeioPagamento; aoFechar: () => void }) {
  const base = usarBase();
  const hoje = usarHoje();
  const mostrar = usarToast();
  const [nome, setNome] = useState(inicial.nome);
  const [tipo, setTipo] = useState<TipoMeio>(inicial.tipo);
  const [fechamento, setFechamento] = useState(inicial.diaFechamento?.toString() ?? '');
  const [vencimento, setVencimento] = useState(inicial.diaVencimento?.toString() ?? '');
  const [erro, setErro] = useState('');

  async function salvar(e: Event) {
    e.preventDefault();
    try {
      await salvarMeio(base, { id: inicial.id, nome, tipo, diaFechamento: lerDia(fechamento), diaVencimento: lerDia(vencimento) }, hoje);
      mostrar('Meio de pagamento salvo');
      aoFechar();
    } catch (err) {
      setErro(err instanceof ErroDominio ? err.message : 'Não foi possível salvar. Tente de novo.');
    }
  }

  return (
    <form class="cartao" onSubmit={(e) => void salvar(e)} noValidate aria-label="Editar meio de pagamento">
      <Campo id="mp-nome" rotulo="Nome">
        <input id="mp-nome" value={nome} onInput={(e) => setNome(e.currentTarget.value)} />
      </Campo>
      <Campo id="mp-tipo" rotulo="Tipo">
        <select id="mp-tipo" value={tipo} onChange={(e) => setTipo(e.currentTarget.value as TipoMeio)}>
          {(Object.keys(ROTULO_MEIO) as TipoMeio[]).map((t) => (
            <option key={t} value={t}>
              {ROTULO_MEIO[t]}
            </option>
          ))}
        </select>
      </Campo>
      {tipo === 'credito' && (
        <>
          <div class="duas-colunas">
            <Campo id="mp-fechamento" rotulo="Dia de fechamento">
              <input id="mp-fechamento" inputMode="numeric" value={fechamento} onInput={(e) => setFechamento(e.currentTarget.value)} />
            </Campo>
            <Campo id="mp-vencimento" rotulo="Dia de vencimento">
              <input id="mp-vencimento" inputMode="numeric" value={vencimento} onInput={(e) => setVencimento(e.currentTarget.value)} />
            </Campo>
          </div>
          <p class="campo-dica">Compras no dia do fechamento ou depois vão para a fatura seguinte.</p>
        </>
      )}
      {erro && (
        <p class="campo-erro" role="alert">
          {erro}
        </p>
      )}
      <div class="acoes">
        <button type="submit" class="botao botao-primario">
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Meios({ estado }: { estado: Estado }) {
  const base = usarBase();
  const mostrar = usarToast();
  const [editando, setEditando] = useState<MeioPagamento | null>(null);

  async function excluir(m: MeioPagamento) {
    if (!window.confirm(`Excluir "${m.nome}"? As despesas continuam, só sem meio de pagamento.`)) return;
    await excluirMeio(base, m.id);
    mostrar('Meio de pagamento excluído');
  }

  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Meios de pagamento</h1>
      {editando ? (
        <EditorMeio key={editando.id} inicial={editando} aoFechar={() => setEditando(null)} />
      ) : (
        <button type="button" class="botao botao-primario" onClick={() => setEditando({ id: crypto.randomUUID(), nome: '', tipo: 'credito' })}>
          Novo meio de pagamento
        </button>
      )}
      {estado.meios.length === 0 ? (
        <EstadoVazio
          icone="credit-card"
          titulo="Nenhum meio de pagamento"
          texto="Cadastre seu cartão para o app calcular o vencimento da fatura sozinho."
        />
      ) : (
        <ul class="lista" style={{ marginTop: '12px' }}>
          {estado.meios.map((m) => (
            <li class="linha" key={m.id}>
              <span class="linha-principal">
                <span class="linha-textos">
                  <span class="linha-titulo">{m.nome}</span>
                  <span class="linha-sub">
                    {ROTULO_MEIO[m.tipo]}
                    {m.tipo === 'credito' && m.diaFechamento && m.diaVencimento ? ` · fecha dia ${m.diaFechamento} · vence dia ${m.diaVencimento}` : ''}
                  </span>
                </span>
              </span>
              <button type="button" class="botao-icone" aria-label={`Editar ${m.nome}`} onClick={() => setEditando(m)}>
                <IconEdit aria-hidden="true" />
              </button>
              <button type="button" class="botao-icone" aria-label={`Excluir ${m.nome}`} onClick={() => void excluir(m)}>
                <IconTrash aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 6: Criar `Backup`, `OndeFicamDados` e `BoasVindas`**

`src/ui/telas/Backup.tsx`:

```tsx
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
    const arquivo = await exportar(base);
    const r = await compartilharOuBaixar(nomeArquivoBackup(hoje), serializar(arquivo), 'application/json');
    if (r === 'cancelado') return;
    await registrarBackup(base, new Date().toISOString());
    mostrar('Backup exportado');
  }

  async function desfazer() {
    if (await desfazerImportacao(base)) mostrar('Importação desfeita');
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
```

`src/ui/telas/OndeFicamDados.tsx`:

```tsx
export function OndeFicamDados() {
  return (
    <>
      <a href="#/ajustes" class="voltar">
        ‹ Ajustes
      </a>
      <h1>Onde ficam meus dados</h1>
      <p>
        Tudo fica guardado <strong>só neste aparelho</strong>, no armazenamento do navegador (IndexedDB). Nada é enviado para a internet: o app nem
        tem permissão para isso.
      </p>
      <h2>Cuidados no iPhone</h2>
      <ul>
        <li>Use sempre o ícone da tela de início. O app instalado e o Safari guardam dados separados.</li>
        <li>
          Apagar o ícone do app ou limpar os dados de sites no Safari <strong>apaga suas despesas</strong>.
        </li>
        <li>Se o endereço do app mudar, ele abre vazio. Restaure pelo backup.</li>
      </ul>
      <h2>Computador e iPhone</h2>
      <p>Os aparelhos não sincronizam sozinhos. Para levar os dados de um para o outro, exporte um backup em um e importe no outro.</p>
      <h2>Backup</h2>
      <p>Exporte um backup pelo menos uma vez por mês e guarde em Arquivos ou no iCloud Drive. O app lembra você depois de 30 dias.</p>
      <a class="botao botao-primario" href="#/backup">
        Ir para backup
      </a>
    </>
  );
}
```

`src/ui/telas/BoasVindas.tsx`:

```tsx
import { useState } from 'preact/hooks';
import { inicializarPadrao } from '../../dados/repositorio';
import { ImportarBackup } from '../componentes/ImportarBackup';
import { usarBase } from '../contexto';
import type { Estado } from '../estado';

export function BoasVindas({ estado }: { estado: Estado }) {
  const base = usarBase();
  const [erro, setErro] = useState('');

  async function comecar() {
    try {
      await inicializarPadrao(base);
    } catch {
      setErro('Não foi possível criar as categorias. Tente de novo.');
    }
  }

  return (
    <div class="boas-vindas">
      <h1>Boas-vindas ao Julius</h1>
      <p>Seu controle de gastos fica só neste aparelho. Nada é enviado para a internet.</p>
      <section class="cartao">
        <h2>Já tem um arquivo de contas ou backup?</h2>
        <p class="texto-suave">Escolha o arquivo .json, por exemplo o contas-iniciais.json.</p>
        <ImportarBackup estado={estado} rotulo="Importar minhas contas" />
      </section>
      <section class="cartao">
        <h2>Começar do zero</h2>
        <p class="texto-suave">Criamos categorias iniciais que você pode editar depois.</p>
        <button type="button" class="botao" onClick={() => void comecar()}>
          Começar do zero
        </button>
      </section>
      {erro && (
        <p class="erro-geral" role="alert">
          {erro}
        </p>
      )}
      <p>
        <a href="#/dados">Onde ficam meus dados</a>
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Substituir `src/ui/Casca.tsx` pela versão final**

```tsx
import { Navegacao } from './componentes/Navegacao';
import { usarEstado, type Estado } from './estado';
import { usarRota, type Rota } from './rota';
import { Ajustes } from './telas/Ajustes';
import { Backup } from './telas/Backup';
import { BoasVindas } from './telas/BoasVindas';
import { Categorias } from './telas/Categorias';
import { DetalheDespesa } from './telas/DetalheDespesa';
import { Despesas } from './telas/Despesas';
import { FormDespesa } from './telas/FormDespesa';
import { Inicio } from './telas/Inicio';
import { Lancamentos } from './telas/Lancamentos';
import { Marcas } from './telas/Marcas';
import { Meios } from './telas/Meios';
import { OndeFicamDados } from './telas/OndeFicamDados';

function Tela({ rota, estado }: { rota: Rota; estado: Estado }) {
  switch (rota.tela) {
    case 'inicio':
      return <Inicio estado={estado} />;
    case 'lancamentos':
      return <Lancamentos estado={estado} />;
    case 'nova':
      return <FormDespesa key="nova" estado={estado} />;
    case 'editar':
      return <FormDespesa key={`editar-${rota.id}`} estado={estado} id={rota.id} />;
    case 'despesas':
      return <Despesas estado={estado} />;
    case 'despesa':
      return <DetalheDespesa key={rota.id} estado={estado} id={rota.id} />;
    case 'ajustes':
      return <Ajustes />;
    case 'categorias':
      return <Categorias estado={estado} />;
    case 'marcas':
      return <Marcas estado={estado} />;
    case 'meios':
      return <Meios estado={estado} />;
    case 'backup':
      return <Backup estado={estado} />;
    case 'dados':
      return <OndeFicamDados />;
  }
}

export function Casca() {
  const rota = usarRota();
  const estado = usarEstado();
  if (!estado) {
    return (
      <div class="carregando" role="status">
        Carregando…
      </div>
    );
  }
  const vazio = estado.categorias.length === 0 && estado.despesas.length === 0;
  return (
    <div class="casca">
      <Navegacao rota={rota} />
      <main class="conteudo" id="conteudo">
        {vazio && rota.tela !== 'dados' ? <BoasVindas estado={estado} /> : <Tela rota={rota} estado={estado} />}
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test` → Expected: toda a suíte passa.
Run: `npm run build` → Expected: sem erros.

- [ ] **Step 9: Conferir no navegador (inclui o que jsdom não testa)**

Run: `npm run dev` e abra `http://localhost:5173/julius-finance/`. Confira:
1. Boas-vindas → "Começar do zero" → Início.
2. Ajustes → Marcas → Nova marca → "Enviar imagem" com um PNG qualquer: o logo aparece redimensionado (o canvas não roda no jsdom; esta é a verificação).
3. Ajustes → Backup → Exportar: baixa `julius-backup-AAAA-MM-DD.json`.
Pare o servidor.

- [ ] **Step 10: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): ajustes de categorias, marcas, meios, backup com desfazer e boas-vindas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 16: PWA, verificação do build, CI de publicação e README

**Files:**
- Create: `public/favicon.svg`, ícones PNG gerados em `public/`, `scripts/verificar-build.mjs`, `.github/workflows/publicar.yml`, `README.md`
- Modify: `vite.config.ts` (plugin PWA), `index.html` (links de ícone), `package.json` (dependências)

**Interfaces:**
- Consumes: build da Task 15.
- Produces: `dist/` com `manifest.webmanifest`, `sw.js`, `registerSW.js`, ícones; script `node scripts/verificar-build.mjs` (código 0/1); workflow que publica no GitHub Pages.

- [ ] **Step 1: Escrever a verificação do build (o "teste" desta tarefa)**

`scripts/verificar-build.mjs`:

```js
// Confere o que o iPhone precisa para instalar e o que garante a privacidade. Sai com código 1 se faltar algo.
import { existsSync, readFileSync } from 'node:fs';

const erros = [];
const ler = (caminho) => readFileSync(caminho, { encoding: 'utf-8' });

if (!existsSync('dist/index.html')) {
  console.error('dist/index.html não existe. Rode npm run build antes.');
  process.exit(1);
}
const html = ler('dist/index.html');
if (!html.includes("connect-src 'self'")) erros.push('CSP com connect-src ausente em dist/index.html');
if (!html.includes('manifest.webmanifest')) erros.push('manifest não referenciado em dist/index.html');
if (!html.includes('apple-touch-icon')) erros.push('apple-touch-icon ausente em dist/index.html');
if (!html.includes('registerSW.js')) erros.push('registro do service worker ausente em dist/index.html');

for (const f of ['dist/sw.js', 'dist/registerSW.js', 'dist/manifest.webmanifest', 'dist/apple-touch-icon-180x180.png', 'dist/pwa-192x192.png', 'dist/pwa-512x512.png']) {
  if (!existsSync(f)) erros.push(`${f} não existe`);
}

if (existsSync('dist/manifest.webmanifest')) {
  const m = JSON.parse(ler('dist/manifest.webmanifest'));
  if (m.start_url !== '/julius-finance/') erros.push(`manifest.start_url inesperado: ${m.start_url}`);
  if (m.display !== 'standalone') erros.push(`manifest.display inesperado: ${m.display}`);
  if (m.lang !== 'pt-BR') erros.push(`manifest.lang inesperado: ${m.lang}`);
}

if (erros.length > 0) {
  console.error(erros.join('\n'));
  process.exit(1);
}
console.log('Build verificado: CSP, manifest, service worker e ícones presentes.');
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run build && node scripts/verificar-build.mjs`
Expected: código 1, listando `manifest não referenciado`, `apple-touch-icon ausente`, `registro do service worker ausente` e arquivos inexistentes.

- [ ] **Step 3: Criar o ícone e gerar os PNGs**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1f6feb"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" stroke-width="36"/>
  <path d="M286 170v120c0 40-26 62-62 62-22 0-40-8-52-22" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round"/>
</svg>
```

Run:

```bash
npm install -D vite-plugin-pwa@^2.0.0 @vite-pwa/assets-generator@^2.0.0
npx pwa-assets-generator --preset minimal-2023 public/favicon.svg
```

Expected: em `public/` surgem `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` e `favicon.ico`.

- [ ] **Step 4: Configurar o PWA em `vite.config.ts`**

Acrescente o import e o plugin (mantendo `CSP`, `csp()` e `base` da Task 1):

```ts
import { VitePWA } from 'vite-plugin-pwa';
```

e troque `plugins: [preact(), csp()]` por:

```ts
  plugins: [
    preact(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Julius — controle de gastos',
        short_name: 'Julius',
        description: 'Controle pessoal de gastos. Os dados ficam só no aparelho.',
        lang: 'pt-BR',
        start_url: '/julius-finance/',
        scope: '/julius-finance/',
        display: 'standalone',
        background_color: '#f6f5f2',
        theme_color: '#f6f5f2',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
```

Em `index.html`, dentro de `<head>`, depois do `<title>`:

```html
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run build && node scripts/verificar-build.mjs`
Expected: `Build verificado: CSP, manifest, service worker e ícones presentes.`
Run: `npm test` → Expected: suíte inteira passa.

- [ ] **Step 6: Criar `.github/workflows/publicar.yml`**

```yaml
name: Publicar

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: node scripts/verificar-build.mjs
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(Se o GitHub avisar que alguma action está obsoleta, suba para a versão maior indicada no aviso.)

- [ ] **Step 7: Escrever `README.md`**

````markdown
# Julius — controle de gastos

App pessoal de controle de gastos: despesas avulsas, compras parceladas e gastos fixos, com visão do mês,
próximos vencimentos, fatura do cartão, busca, filtros e backup. Funciona no navegador do computador e
instalado no iPhone (PWA). **Os dados ficam só no aparelho**: não há servidor, login nem envio de dados.

## Rodar no computador

Requer Node 22.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/julius-finance/`.

## Testes

```bash
npm test          # testes unitários e de interface (Vitest)
npm run e2e       # fluxo completo no motor do Safari (Playwright WebKit)
```

## Usar no iPhone

O app é publicado no GitHub Pages a cada push na `main` (veja `.github/workflows/publicar.yml`).

1. No iPhone, abra o endereço publicado no **Safari**.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra o app pelo ícone. Use sempre o ícone: o app instalado e o Safari guardam dados separados.

Para testar no iPhone sem publicar, rode `npm run dev` e abra `http://IP-DO-COMPUTADOR:5173/julius-finance/`
na mesma rede Wi-Fi. Sem HTTPS, o modo offline e a instalação não funcionam; serve só para olhar.

## Importar as contas iniciais

O arquivo `dados-locais/contas-iniciais.json` (fora do Git) é gerado com `npm run dados-iniciais`.
Mande-o para o iPhone (AirDrop ou iCloud Drive) e, na primeira abertura do app, toque em **Importar minhas contas**.
Os itens marcados como **a confirmar** aparecem no Início e em Despesas para você completar.

## Backup e troca de aparelho

Ajustes → Backup e importação → **Exportar backup** gera um `.json` com tudo. Para levar os dados para outro
aparelho, importe esse arquivo lá. A importação substitui os dados e pode ser desfeita logo em seguida.
Exporte um backup ao menos uma vez por mês: apagar o app ou limpar os dados do Safari apaga as despesas.

## Limitações

- Sem sincronização automática entre computador e iPhone (só por backup).
- Sem notificações de vencimento.
- Fatura do cartão por dia de fechamento e vencimento; não há conciliação com o extrato.
- Logos: cerca de 110 marcas embutidas (Simple Icons, CC0). Outras marcas usam imagem enviada por você ou o ícone da categoria.

## Estrutura

- `src/dominio` — regras puras (parcelas, recorrências, cartão, resumo).
- `src/dados` — IndexedDB (Dexie), repositório com histórico, backup e CSV.
- `src/ui` — interface Preact.
- `docs/superpowers` — spec e plano.
````

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts index.html package.json package-lock.json public scripts/verificar-build.mjs .github README.md
git commit -m "feat: PWA instalável, verificação do build, publicação no GitHub Pages e README" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Dados iniciais (gerador + arquivo local)

**Files:**
- Create: `src/dados/dadosIniciais.ts`, `scripts/cli-dados-iniciais.ts`, `scripts/gerar-dados-iniciais.ts`
- Create (fora do Git): `dados-locais/definicao.json`, `dados-locais/contas-iniciais.json`
- Test: `tests/scripts/cliDadosIniciais.test.ts`

**Interfaces:**
- Consumes: `CATEGORIAS_PADRAO` (Task 3), `gerarAvulsa`, `gerarParcelas` (Task 4), `gerarOcorrencias` (Task 5), `APP_ID`, `VERSAO_BACKUP`, `lerBackup` (Task 8), `VERSAO_ESQUEMA`, `ArquivoBackup` (Task 7), `hojeISO` (Task 2).
- Produces:
  - `type SemDatas<T>`; `interface DefinicaoInicial { meios: MeioPagamento[]; marcas: Marca[]; despesas: SemDatas<Despesa>[]; pagamentos: { lancamentoId: string; pagoEm: DataISO; valorPago?: Centavos }[] }`
  - `montarBackupInicial(def: DefinicaoInicial, hoje: DataISO, agora: string): ArquivoBackup` (lança `Error` com mensagem clara)
  - `main(argv: string[], agora?: Date): number` em `scripts/cli-dados-iniciais.ts` (padrões: `dados-locais/definicao.json` → `dados-locais/contas-iniciais.json`)

- [ ] **Step 1: Escrever os testes da CLI**

`tests/scripts/cliDadosIniciais.test.ts`:

```ts
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/cli-dados-iniciais';
import { lerBackup } from '../../src/dados/backup';
import type { DefinicaoInicial } from '../../src/dados/dadosIniciais';

const AGORA = new Date('2026-10-06T15:00:00.000Z'); // meio-dia em São Paulo

function definicao(): DefinicaoInicial {
  return {
    meios: [
      { id: 'mp-cartao', nome: 'Cartão Exemplo', tipo: 'credito', diaFechamento: 2, diaVencimento: 7 },
      { id: 'mp-pix', nome: 'Pix', tipo: 'pix' },
    ],
    marcas: [{ id: 'marca-streaming', nome: 'Streaming Ação', apelidos: [], logoSlug: 'netflix' }],
    despesas: [
      {
        id: 'rec-streaming', tipo: 'recorrente', descricao: 'Streaming Ação ⟦teste⟧', categoriaId: 'cat-assinaturas',
        marcaId: 'marca-streaming', meioPagamentoId: 'mp-cartao', observacoes: '', aConfirmar: [],
        valor: 1990, valorVariavel: false, frequencia: 'mensal', inicio: '2026-10-20', pausas: [],
      },
      {
        id: 'parc-celular', tipo: 'parcelada', descricao: 'Celular', categoriaId: 'cat-compras', meioPagamentoId: 'mp-pix',
        dataCompra: '2025-12-15', observacoes: 'Pago via Pix', aConfirmar: ['vencimento', 'loja', 'valorTotal'],
        valorTotal: 540000, numParcelas: 12, valorParcela: 45000, mesPrimeira: '2026-10', comecaNaParcela: 11,
      },
    ],
    pagamentos: [{ lancamentoId: 'parc-celular#11', pagoEm: '2026-10-06' }],
  };
}

function preparar(conteudo: string | null) {
  const dir = mkdtempSync(join(tmpdir(), 'julius-'));
  const entrada = join(dir, 'definicao.json');
  if (conteudo !== null) writeFileSync(entrada, conteudo, { encoding: 'utf-8' });
  return { entrada, saida: join(dir, 'contas-iniciais.json') };
}

afterEach(() => vi.restoreAllMocks());

describe('CLI de dados iniciais', () => {
  it('gera um backup válido com acentos, pagamento e vencimento pelo cartão', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(JSON.stringify(definicao()));
    expect(main([entrada, saida], AGORA)).toBe(0);

    const r = lerBackup(readFileSync(saida, { encoding: 'utf-8' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const { despesas, lancamentos, categorias, historico } = r.arquivo.dados;
    expect(despesas.find((d) => d.id === 'rec-streaming')!.descricao).toBe('Streaming Ação ⟦teste⟧');
    expect(categorias).toHaveLength(9);
    expect(lancamentos.find((l) => l.id === 'rec-streaming@2026-10')).toMatchObject({
      dataCobranca: '2026-10-20',
      vencimento: '2026-11-07',
      mes: '2026-11',
      valor: 1990,
    });
    expect(lancamentos.find((l) => l.id === 'parc-celular#11')).toMatchObject({ pagoEm: '2026-10-06', valorPago: 45000, mes: '2026-10' });
    expect(lancamentos.find((l) => l.id === 'parc-celular#12')).toMatchObject({ mes: '2026-11' });
    expect(lancamentos.find((l) => l.id === 'parc-celular#12')!.vencimento).toBeUndefined();
    expect(lancamentos.some((l) => l.id === 'parc-celular#10')).toBe(false);
    expect(historico.map((h) => h.acao)).toEqual(['importada', 'importada']);
  });

  it('arquivo ausente: código 1 e nada gravado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar(null);
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith(`Arquivo não encontrado: ${entrada}`);
  });

  it('JSON corrompido: código 1 e nada gravado', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { entrada, saida } = preparar('{ quebrado');
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith(`JSON inválido: ${entrada}`);
  });

  it('pagamento de lançamento inexistente: código 1 com motivo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.pagamentos = [{ lancamentoId: 'nada#1', pagoEm: '2026-10-06' }];
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(existsSync(saida)).toBe(false);
    expect(erro).toHaveBeenCalledWith('Pagamento aponta para lançamento inexistente: nada#1');
  });

  it('categoria desconhecida: código 1 com motivo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const def = definicao();
    def.despesas[1]!.categoriaId = 'cat-nao-existe';
    const { entrada, saida } = preparar(JSON.stringify(def));
    expect(main([entrada, saida], AGORA)).toBe(1);
    expect(erro).toHaveBeenCalledWith('Categoria desconhecida em "Celular": cat-nao-existe');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/scripts`
Expected: FAIL — `Failed to resolve import "../../scripts/cli-dados-iniciais"`.

- [ ] **Step 3: Implementar `src/dados/dadosIniciais.ts`**

```ts
import { CATEGORIAS_PADRAO } from '../dominio/padroes';
import { gerarAvulsa, gerarParcelas } from '../dominio/parcelas';
import { gerarOcorrencias } from '../dominio/recorrencias';
import type { Centavos, DataISO, Despesa, Lancamento, Marca, MeioPagamento, RegistroHistorico } from '../dominio/tipos';
import { APP_ID, VERSAO_BACKUP } from './backup';
import { VERSAO_ESQUEMA, type ArquivoBackup } from './db';

export type SemDatas<T> = T extends unknown ? Omit<T, 'criadaEm' | 'atualizadaEm'> : never;

export interface DefinicaoInicial {
  meios: MeioPagamento[];
  marcas: Marca[];
  despesas: SemDatas<Despesa>[];
  pagamentos: { lancamentoId: string; pagoEm: DataISO; valorPago?: Centavos }[];
}

/** Monta um arquivo de backup a partir de uma definição escrita à mão. */
export function montarBackupInicial(def: DefinicaoInicial, hoje: DataISO, agora: string): ArquivoBackup {
  const categorias = new Set(CATEGORIAS_PADRAO.map((c) => c.id));
  const meios = new Map(def.meios.map((m) => [m.id, m]));
  const despesas = def.despesas.map((d) => ({ ...d, criadaEm: agora, atualizadaEm: agora }) as Despesa);

  const lancamentos = new Map<string, Lancamento>();
  for (const d of despesas) {
    if (!categorias.has(d.categoriaId)) throw new Error(`Categoria desconhecida em "${d.descricao}": ${d.categoriaId}`);
    if (d.meioPagamentoId && !meios.has(d.meioPagamentoId)) {
      throw new Error(`Meio de pagamento desconhecido em "${d.descricao}": ${d.meioPagamentoId}`);
    }
    const gerados =
      d.tipo === 'avulsa'
        ? [gerarAvulsa(d)]
        : d.tipo === 'parcelada'
          ? gerarParcelas(d)
          : gerarOcorrencias(d, d.meioPagamentoId ? meios.get(d.meioPagamentoId) : undefined, hoje);
    for (const l of gerados) lancamentos.set(l.id, l);
  }

  for (const p of def.pagamentos) {
    const l = lancamentos.get(p.lancamentoId);
    if (!l) throw new Error(`Pagamento aponta para lançamento inexistente: ${p.lancamentoId}`);
    lancamentos.set(l.id, { ...l, pagoEm: p.pagoEm, valorPago: p.valorPago ?? l.valor });
  }

  const historico: RegistroHistorico[] = despesas.map((d) => ({
    id: `hist-${d.id}`,
    despesaId: d.id,
    quando: agora,
    acao: 'importada',
    mudancas: [],
  }));

  return {
    app: APP_ID,
    versao: VERSAO_BACKUP,
    exportadoEm: agora,
    dados: {
      categorias: CATEGORIAS_PADRAO,
      marcas: def.marcas,
      meiosPagamento: def.meios,
      despesas,
      lancamentos: [...lancamentos.values()],
      historico,
      configuracao: { versaoEsquema: VERSAO_ESQUEMA },
    },
  };
}
```

- [ ] **Step 4: Implementar a CLI**

`scripts/cli-dados-iniciais.ts`:

```ts
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
```

`scripts/gerar-dados-iniciais.ts`:

```ts
import { main } from './cli-dados-iniciais';

process.exitCode = main(process.argv.slice(2));
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/scripts` → Expected: 5 passed.
Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 6: Commit do gerador (sem dados pessoais)**

```bash
git add src/dados/dadosIniciais.ts scripts/cli-dados-iniciais.ts scripts/gerar-dados-iniciais.ts tests/scripts
git commit -m "feat(dados): gerador de dados iniciais a partir de uma definição local" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Escrever `dados-locais/definicao.json` (NÃO commitar)**

Fonte única: `dados-locais/contas-extraidas.md`. Não use nenhum valor que não esteja nesse arquivo. Regras:

- `meios`: um registro por linha da tabela "Meio de pagamento". IDs `mp-<nome-em-minúsculas-com-hífen>` (ex.: `mp-pix`). Para o cartão de crédito, `tipo: "credito"`, `diaFechamento` e `diaVencimento` da tabela.
- `marcas`: uma por linha das recorrentes, `id: "marca-<slug>"`, `nome` = coluna Despesa, `apelidos: []` e `logoSlug` = coluna "Marca (logo)" quando ela tiver um slug; sem slug, omita `logoSlug`.
- `despesas` recorrentes: `id: "rec-<slug>"`, `tipo: "recorrente"`, `descricao` = coluna Despesa, `categoriaId` = categoria sugerida mapeada para os IDs de `src/dominio/padroes.ts`, `marcaId` da marca acima, `meioPagamentoId` do cartão, `valor` em centavos, `valorVariavel: true` só onde a observação diz "valor variável", `frequencia: "mensal"`, `inicio` = data listada em "Início das recorrências", `pausas: []`, `observacoes: ""`, `aConfirmar: ["categoria"]` (as categorias são sugestões).
- `despesa` parcelada: `id: "parc-<slug>"`, campos da tabela "Parcelada"; `valorTotal` = número de parcelas × valor da parcela (é a confirmar); sem `primeiroVencimento`; `mesPrimeira` = mês da parcela inicial; `aConfirmar: ["vencimento", "loja", "valorTotal", "categoria"]`.
- `pagamentos`: um registro para a parcela marcada como paga, com `lancamentoId: "parc-<slug>#<número>"` e a data informada.

- [ ] **Step 8: Gerar e conferir o arquivo de importação**

Run: `npm run dados-iniciais`
Expected: `Gerado dados-locais/contas-iniciais.json: 7 despesas, N lançamentos.`

Confira à mão contra `dados-locais/contas-extraidas.md`:
1. Cada despesa tem o valor da tabela.
2. Todos os lançamentos das recorrentes no cartão da primeira fatura vencem no mesmo dia (o vencimento do cartão no mês seguinte).
3. A soma dos lançamentos do mês dessa fatura bate com a soma indicada no arquivo, mais a parcela que cai no mesmo mês.

Use este comando para listar os totais por mês:

```bash
node -e "const a=require('./dados-locais/contas-iniciais.json');const t={};for(const l of a.dados.lancamentos)t[l.mes]=(t[l.mes]||0)+l.valor;console.log(t)"
```

Run: `git status --short` → Expected: **nenhum** arquivo de `dados-locais/` listado.

---

### Task 18: Teste de ponta a ponta no WebKit (motor do Safari)

> Antes do Step 2, o controlador confirma com o usuário o download do WebKit do Playwright (~100 MB, do CDN da Microsoft).

**Files:**
- Create: `playwright.config.ts`, `e2e/fluxo.spec.ts`
- Modify: `package.json` (dependência), `.github/workflows/publicar.yml` (rodar o e2e no CI)

**Interfaces:**
- Consumes: app completo (Tasks 1–16).
- Produces: `npm run e2e`.

- [ ] **Step 1: Instalar o Playwright**

```bash
npm install -D @playwright/test@^1.63.0
```

- [ ] **Step 2: Baixar o WebKit (depois da confirmação do usuário)**

```bash
npx playwright install webkit
```

- [ ] **Step 3: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173/julius-finance/',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
  },
  projects: [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/julius-finance/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 4: Escrever `e2e/fluxo.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  // Força o caminho de download (a folha de compartilhar não existe no teste).
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  page.on('dialog', (d) => void d.accept());
});

async function comecarDoZero(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Começar do zero' }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
}

test('parcelada: cadastrar, pagar, exportar, apagar tudo e importar de volta', async ({ page }, info) => {
  await comecarDoZero(page);

  await page.getByRole('link', { name: 'Nova despesa' }).click();
  await page.getByRole('radio', { name: 'Parcelada' }).click();
  await page.getByLabel('Descrição').fill('Notebook Ação');
  await page.getByLabel('Categoria').selectOption('cat-compras');
  await page.getByLabel('Valor total').fill('1.200,00');
  await page.getByLabel('Número de parcelas').fill('3');
  await page.getByLabel('1º vencimento').fill('2026-11-10');
  await expect(page.getByRole('region', { name: 'Parcelas que serão geradas' }).getByText('R$ 400,00')).toHaveCount(3);
  await page.getByRole('button', { name: 'Salvar despesa' }).click();

  await expect(page.getByRole('heading', { name: 'Notebook Ação' })).toBeVisible();
  await page.getByRole('button', { name: 'Marcar Parcela 1/3 como paga' }).click();
  await expect(page.getByRole('button', { name: 'Desfazer pagamento de Parcela 1/3' })).toBeVisible();

  await page.getByRole('link', { name: 'Ajustes' }).click();
  await page.getByRole('link', { name: 'Backup e importação' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  const arquivo = info.outputPath('backup.json');
  await (await download).saveAs(arquivo);
  expect(JSON.parse(readFileSync(arquivo, { encoding: 'utf-8' })).dados.despesas[0].descricao).toBe('Notebook Ação');

  await page.evaluate(
    () =>
      new Promise<void>((pronto) => {
        const r = indexedDB.deleteDatabase('julius');
        r.onsuccess = r.onerror = r.onblocked = () => pronto();
      }),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Boas-vindas ao Julius' })).toBeVisible();

  await page.getByLabel('Importar minhas contas').setInputFiles(arquivo);
  await page.getByRole('button', { name: 'Importar' }).click();
  await page.getByRole('link', { name: 'Despesas' }).click();
  await page.getByRole('tab', { name: 'Parceladas' }).click();
  await page.getByRole('link', { name: /Notebook Ação/ }).click();
  await expect(page.getByRole('button', { name: 'Desfazer pagamento de Parcela 1/3' })).toBeVisible();
});

test('deslizar uma linha para a esquerda marca como paga', async ({ page }) => {
  await comecarDoZero(page);

  await page.getByRole('link', { name: 'Nova despesa' }).click();
  await page.getByLabel('Descrição').fill('Conta teste');
  await page.getByLabel('Categoria').selectOption('cat-moradia');
  await page.getByLabel('Valor').fill('10,00');
  await page.getByLabel('Vencimento').fill('2030-01-10');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByRole('heading', { name: 'Conta teste' })).toBeVisible();

  await page.getByRole('link', { name: 'Lançamentos' }).click();
  await page.getByLabel('Mês').selectOption('');
  const linha = page.getByRole('listitem').filter({ hasText: 'Conta teste' });
  const caixa = (await linha.boundingBox())!;
  const y = caixa.y + caixa.height / 2;
  await page.mouse.move(caixa.x + caixa.width - 60, y);
  await page.mouse.down();
  await page.mouse.move(caixa.x + 20, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('Conta teste marcada como paga')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lançamentos' })).toBeVisible(); // não navegou
});
```

- [ ] **Step 5: Rodar**

Run: `npm run e2e`
Expected: 2 passed. Se o primeiro falhar em `setInputFiles` por o input estar visualmente oculto, use `page.locator('input[type=file]').setInputFiles(arquivo)`.

- [ ] **Step 6: Rodar o e2e também no CI**

Em `.github/workflows/publicar.yml`, no job `build`, troque a linha `- run: npm run build` por:

```yaml
      - run: npx playwright install --with-deps webkit
      - run: npm run e2e
```

(O `webServer` do Playwright já roda `npm run build`; o `dist/` gerado é o que segue para verificação e publicação.)

- [ ] **Step 7: Suíte completa e commit**

Run: `npm test && npm run e2e && node scripts/verificar-build.mjs` → Expected: tudo passa.

```bash
git add playwright.config.ts e2e package.json package-lock.json .github/workflows/publicar.yml
git commit -m "test(e2e): fluxo completo e gesto de deslizar no WebKit, também no CI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Etapa final (controlador, com o usuário — não é tarefa de subagente)

Ações externas e públicas: cada uma só com confirmação explícita do usuário na hora.

1. **Revisão final do branch** por um revisor novo (spec × código; suíte, e2e e verificação do build rodados por ele).
2. **Pedir ao usuário:** `gh auth login` (credencial dele).
3. **Com confirmação:** criar o repositório público e enviar:

   ```bash
   gh repo create julius-finance --public --source . --push
   ```

4. **Com confirmação:** ativar o GitHub Pages pelo Actions:

   ```bash
   gh api -X POST repos/{owner}/julius-finance/pages -f build_type=workflow
   ```

   Depois, acompanhar o workflow "Publicar" até o fim e abrir o endereço `https://<usuário>.github.io/julius-finance/`.
5. **Usuário no iPhone:** mandar `dados-locais/contas-iniciais.json` por AirDrop ou iCloud Drive → abrir o endereço no Safari → Compartilhar → Adicionar à Tela de Início → abrir pelo ícone → **Importar minhas contas**.
6. **Relatório final ao usuário:** o que foi implementado, como importar, onde ficam os dados, a lista do que segue "a confirmar" e as limitações (README).
