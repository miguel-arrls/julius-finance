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
```

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
