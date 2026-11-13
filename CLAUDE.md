# Julius Finance

App pessoal de controle de gastos (PWA) para um único usuário: iPhone principal, PC eventual.
Dados só no aparelho (IndexedDB), sem servidor, sem login. Publicado no GitHub Pages (repo público).

- Spec: `docs/superpowers/specs/2026-10-06-julius-finance-design.md` (autoridade em caso de dúvida)
- Plano: `docs/superpowers/plans/2026-10-06-julius-finance.md`

## Comandos

```bash
npm run dev            # http://localhost:5173/julius-finance/
npm test               # Vitest (unitários + interface, jsdom)
npm run build          # tsc --noEmit + vite build
npm run e2e            # Playwright WebKit (motor do Safari)
node scripts/verificar-build.mjs   # confere CSP, manifest, SW e ícones no dist/
npm run marcas         # regenera src/marcas/catalogo.gerado.ts (simple-icons)
npm run dados-iniciais # dados-locais/definicao.json → dados-locais/contas-iniciais.json
npm run test:py        # testes do scripts/limpar_prints.py (Python 3.14, só biblioteca padrão)
npm run limpar-prints  # apaga falhas de print com mais de 7 dias e referências órfãs (--simular para ver antes)
```

## Matriz de layout (vale para toda mudança de interface)

`npm run e2e` inclui `e2e/layout.spec.ts`: cenários de dados (`e2e/layout/cenarios.ts`, sintéticos) × larguras
(320 a 1280) × claro/escuro × todas as telas (`e2e/layout/matriz.json`), cada combinação verificada pelas regras
genéricas de `e2e/layout/invariantes.ts` (rolagem lateral, conteúdo/texto fora da caixa, interativos sobrepostos,
alvo < 44 px, campo sem rótulo visível, faixa "preencher" com sobra, erro de JS) e por axe-core (WCAG 2.1 A/AA).

- Não escreva teste de layout para um caso: se um bug visual escapou, falta uma **regra** em `invariantes.ts`.
  Toda regra nova ganha a sua sabotagem em `e2e/layout-sabotagem.spec.ts` (o bug reintroduzido tem de reprovar).
- Tela ou estado novo: uma linha em `matriz.json` + o caminho em `TELAS` (`layout.spec.ts`); um teste confere os dois.
- Exceção é declarada no HTML, não no teste: `data-layout="preencher"` (faixa que deve ocupar a largura) e
  `data-layout="livre"` (decoração que pode sair da caixa).
- Prints: fora do repositório, em `C:\VBCODE\julius-finance-prints` (`referencia/` aprovados; `falhas/<execução>/`
  esperado/atual/diferença). Comparação só local (o CI é Linux, com outras fontes). Mudança visual intencional:
  conferir os `-diff.png` e aprovar com `npx playwright test e2e/layout.spec.ts --update-snapshots`.
- Dados e "hoje" dos testes são fixos (`HOJE`/`AGORA` em `cenarios.ts`, relógio congelado): print muda só se a tela mudar.

## Arquitetura

- `src/dominio` — funções puras (dinheiro, datas, cartão, parcelas, recorrências, resumo, filtros). Não importa nada de fora de `dominio`.
- `src/dados` — Dexie (`db.ts`), repositório com histórico em transação, backup JSON, CSV, dados iniciais.
- `src/marcas` — catálogo embutido (gerado, não editar à mão) e identificação de marca.
- `src/ui` — Preact, rotas por hash, uma tela por arquivo em `telas/`.
- Dependência: `ui` → `dados` → `dominio`.

## Regras que não podem quebrar

- **Privacidade:** `dados-locais/` tem dados financeiros reais e **nunca** é commitado. Nenhum valor real do usuário em código, testes, commits ou docs (o repo é público). Testes usam dados sintéticos.
- **Sem rede:** o app não chama nenhum serviço externo; a CSP de produção tem `connect-src 'self'`. Não adicionar fetch, analytics, fontes ou CDNs externos.
- **Dinheiro em centavos inteiros.** Nunca float. Exibição `R$\u00a01.234,56` via `formatarReais`.
- **Datas como texto `AAAA-MM-DD`**, meses `AAAA-MM`. Nunca `new Date('AAAA-MM-DD')` (é UTC; volta um dia no Brasil). Usar `src/dominio/datas.ts`.
- **IDs de lançamento determinísticos** (`despesa#n`, `despesa@periodo`): regerar nunca duplica; editar nunca toca lançamento pago.
- **Toda escrita passa pelo repositório** (`src/dados/repositorio.ts`), que grava o histórico na mesma transação.
- **Situação (paga/pendente/atrasada) é calculada**, nunca gravada.

## Convenções

- Código, textos de interface, mensagens de erro e commits em **pt-BR**. Sentence case; sem "por favor", "com sucesso" ou exclamação.
- Alvos de toque ≥ 44 px; todo campo com rótulo visível.
- Testes importam `describe/it/expect/vi` de `vitest` explicitamente; fuso dos testes é `America/Sao_Paulo` (`tests/setup.ts`).
- Persistência testada com round-trip contendo acentos e `⟦⟧`; CLI testada via `main(argv)` (código de saída + efeito em disco); arquivo ausente/corrompido com comportamento definido.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Ambiente (Windows)

- `core.autocrlf=true` na máquina; `.gitattributes` força LF. PNGs marcados como binários.
- Ler/gravar texto com `encoding: 'utf-8'` explícito.
- `npm install` e `npx playwright install` passam de 2 min: usar timeout longo ou segundo plano.
