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
