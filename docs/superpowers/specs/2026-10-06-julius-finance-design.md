# Julius Finance — design

Data: 06/10/2026 · Status: aguardando revisão do usuário

## 1. Objetivo

App pessoal de controle de gastos, de um único usuário, usado principalmente no iPhone (PWA instalado
na tela inicial) e eventualmente no navegador do PC. Gratuito, em pt-BR, sem login e sem enviar dados
financeiros a nenhum serviço externo.

Critérios de sucesso:

- Ver em segundos quanto falta pagar no mês, o que vence a seguir e o que está atrasado.
- Cadastrar uma despesa avulsa, parcelada ou recorrente em menos de 30 segundos no celular.
- Nunca duplicar parcela ou ocorrência, e nunca perder o que já foi pago ao editar.
- Backup completo em um arquivo, restaurável no mesmo ou em outro aparelho.

## 2. Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Uso | iPhone principal; PC eventual | Escolha do usuário |
| Armazenamento | IndexedDB no aparelho, sem servidor | Gratuito, offline, dados não saem do aparelho |
| Sincronização | Nenhuma; exportar/importar JSON | Única opção grátis que não envia dados para fora |
| Cartão | Meio de pagamento com dia de fechamento e de vencimento; subtotal por fatura | Usuário tem um só cartão; módulo de faturas seria excessivo |
| Hospedagem | GitHub Pages, repositório público | Grátis com HTTPS; o repositório não contém dados pessoais |
| Logos | Seleção do Simple Icons embutida + upload de imagem; ícone da categoria como reserva | Zero acesso à internet em tempo de uso |
| Stack | Vite + Preact + TypeScript + Dexie + vite-plugin-pwa | Leve, tipado, testável |

## 3. Arquitetura

SPA estática. Todo o código roda no navegador. Rotas por hash (`#/inicio`, `#/lancamentos`, ...),
para funcionar no GitHub Pages sem configuração de 404.

Camadas e responsabilidades:

```
src/
  dominio/            funções puras, sem I/O; 100% testadas
    dinheiro.ts       centavos <-> texto "1.234,56" e formatação R$
    datas.ts          datas ISO "AAAA-MM-DD": somar meses com ajuste de fim de mês, formato dd/mm/aaaa
    cartao.ts         vencimento sugerido a partir da data de cobrança + fechamento/vencimento
    parcelas.ts       gerar e regerar parcelas (preserva pagas)
    recorrencias.ts   materializar ocorrências até o horizonte (idempotente)
    situacao.ts       paga / pendente / atrasada / sem vencimento, dado "hoje"
    resumo.ts         totais do mês, por categoria, por fatura, próximos meses
    filtros.ts        busca e filtros sobre lançamentos
  dados/
    db.ts             esquema Dexie e migrações
    repositorio.ts    operações de escrita; toda alteração grava histórico numa transação
    backup.ts         exportar, validar, importar, snapshot e desfazer importação
    csv.ts            exportação CSV
  marcas/
    catalogo.ts       ~150 marcas comuns no Brasil (gerado do Simple Icons em build)
    identificar.ts    casar nome/apelidos com marca
  ui/                 componentes Preact por tela
  main.tsx
```

Regra de dependência: `ui` → `dados` → `dominio`. `dominio` não importa nada do projeto.

## 4. Modelo de dados

Valores sempre em **centavos inteiros**. Datas sempre como texto ISO `AAAA-MM-DD` (sem fuso).
Meses como `AAAA-MM`. IDs de cadastro são UUID; IDs de lançamento são determinísticos (ver 4.5).

### 4.1 Categoria

`{ id, nome, cor, icone, ordem }`

Iniciais (editáveis e removíveis): Moradia, Alimentação, Transporte, Saúde, Compras, Lazer,
Assinaturas, Telefone/Internet, Outros. Remover uma categoria em uso exige escolher outra para os itens.

### 4.2 Marca

`{ id, nome, apelidos: string[], cor?, icone?, logoSlug?, logoImagem? }`

- `logoSlug`: chave do catálogo embutido.
- `logoImagem`: imagem enviada pelo usuário, redimensionada no aparelho para 128×128 e guardada como data URL.
- Exibição: logoImagem → logoSlug → ícone/cor da marca → ícone/cor da categoria.
- Ao digitar a loja/marca numa despesa, o app sugere a marca existente (nome ou apelido,
  comparação sem acento e sem caixa) ou do catálogo.

### 4.3 Meio de pagamento

`{ id, nome, tipo: 'credito'|'debito'|'pix'|'boleto'|'dinheiro'|'outro', diaFechamento?, diaVencimento? }`

`diaFechamento`/`diaVencimento` só para crédito.

### 4.4 Despesa

Campos comuns: `{ id, tipo: 'avulsa'|'parcelada'|'recorrente', descricao, categoriaId, marcaId?,
meioPagamentoId?, dataCompra?, observacoes, aConfirmar: string[], criadaEm, atualizadaEm }`

- **Avulsa:** `valor`, `vencimento?`, `mes`. Gera 1 lançamento.
- **Parcelada:** `valorTotal`, `numParcelas`, `valorParcela`, `primeiroVencimento?`, `mesPrimeira`,
  `comecaNaParcela` (padrão 1).
  - Sem `valorParcela` informado: `valorTotal / numParcelas`, centavos restantes na 1ª parcela.
  - Com `valorTotal` e `valorParcela` inconsistentes: vale `valorParcela`; a tela mostra a diferença.
  - `comecaNaParcela = k`: gera só as parcelas k..n. As anteriores não existem no app (nada inventado).
- **Recorrente:** `valor`, `valorVariavel`, `frequencia: 'mensal'|'semanal'|'anual'`, `inicio`,
  `diaCobranca`, `fim?`, `pausadaDesde?`.
  - `valorVariavel`: ocorrências futuras usam `valor` como estimativa e ficam marcadas `estimado`
    até o usuário informar o valor real daquele mês.
  - Cada ocorrência tem `dataCobranca` (calculada por `diaCobranca`). O `vencimento` é igual à
    `dataCobranca`, exceto no cartão de crédito, onde segue a regra 5.1.

`aConfirmar` lista os campos pendentes (ex.: `['vencimento', 'loja']`). Some quando o campo é preenchido.

### 4.5 Lançamento

Cada parcela ou ocorrência:

`{ id, despesaId, numero?, chavePeriodo?, mes, dataCobranca?, vencimento?, valor, estimado, pagoEm?, valorPago? }`

- IDs determinísticos: parcela `"{despesaId}#{numero}"`; ocorrência `"{despesaId}@{chavePeriodo}"`,
  com `chavePeriodo` = `AAAA-MM` (mensal), `AAAA-MM-DD` (semanal) ou `AAAA` (anual).
  Gerar de novo usa `put` com o mesmo ID: **impossível duplicar**.
- `mes`: mês em que o lançamento conta nos totais. É o mês do `vencimento` quando ele existe;
  sem vencimento, é o mês informado/inferido.
- **Situação calculada, nunca gravada**:
  `paga` se `pagoEm`; senão `sem vencimento` se não há `vencimento`; senão `atrasada` se
  `vencimento < hoje`; senão `pendente`. "Sem vencimento" nunca conta como atrasada.

### 4.6 Histórico

`{ id, despesaId, lancamentoId?, quando, acao, mudancas: [{ campo, de, para }] }`

`acao`: criada, editada, paga, pagamento desfeito, pausada, retomada, encerrada, importada.
Gravado na mesma transação da alteração. Mostrado na tela da despesa, mais recente primeiro.

### 4.7 Configuração

`{ ultimoBackupEm?, versaoEsquema }`

## 5. Regras de negócio

### 5.1 Vencimento sugerido no cartão

Dada `dataCobranca` com dia `d` no mês `M`, fechamento `F` e vencimento `V`:

- `d < F` → a fatura fecha em F/M e vence no primeiro dia `V` depois de F/M.
- `d ≥ F` → a fatura fecha em F/(M+1) e vence no primeiro dia `V` depois disso.
- **Cobrança no próprio dia do fechamento vai para a fatura seguinte** (confirmado pelo usuário).

O vencimento sugerido é editável. Se o usuário editar, vale o valor dele.

### 5.2 Datas em fim de mês

Somar meses mantém o dia original e ajusta para o último dia quando o mês é mais curto
(31/01 → 28/02 ou 29/02 → 31/03). Anual em 29/02 cai em 28/02 nos anos não bissextos.

### 5.3 Editar parcelada

- Recalcula apenas as parcelas **não pagas** (valor, vencimento). Pagas ficam intactas.
- Aumentar `numParcelas` cria as novas; reduzir remove só as não pagas excedentes.
- Reduzir para menos que a maior parcela paga é bloqueado com mensagem explicando o motivo.

### 5.4 Materializar recorrências

- Horizonte: do `inicio` até o fim do mês atual + 12 meses. Roda ao abrir o app e após cada edição.
- Idempotente: rodar duas vezes produz exatamente o mesmo conjunto.
- Editar valor ou dia pergunta "a partir de qual mês". Só afeta ocorrências não pagas desse mês em diante.
- Pausar: remove ocorrências não pagas com `dataCobranca ≥ pausadaDesde` e não gera novas. Retomar volta a gerar.
- Encerrar: define `fim`. Remove ocorrências não pagas posteriores.
- Ocorrências pagas nunca são removidas nem alteradas pela recorrência.

### 5.5 Pagamento

- Marcar como paga grava `pagoEm` (hoje, editável) e `valorPago` (padrão = valor).
- Desfazer pagamento é possível, inclusive pelo botão "Desfazer" por 5 s após marcar.
- "Marcar fatura como paga": marca de uma vez todos os lançamentos do cartão com o mesmo vencimento.

### 5.6 Excluir

Excluir despesa pede confirmação informando quantos lançamentos (e quantos pagos) serão removidos.

## 6. Telas

Barra inferior no iPhone: Início, Lançamentos, botão central **+** (nova despesa), Despesas, Ajustes.
No PC (≥ 768 px): barra lateral e Início em duas colunas.

- **Início:** seletor de mês (setas); total do mês; pago e pendente; aviso de itens a confirmar
  (atalho para completar); aviso de backup se passaram 30 dias; **próximos vencimentos em destaque,
  atrasados no topo em vermelho**; fatura do cartão com subtotal e "Marcar fatura como paga";
  gastos por categoria (barras); próximos 3 meses.
- **Lançamentos:** busca por descrição, loja ou marca; filtros por mês, categoria, situação,
  recorrência (avulsa/parcelada/recorrente) e meio de pagamento; deslizar para marcar como paga;
  grupo "Sem vencimento — a confirmar".
- **Nova/editar despesa:** seletor avulsa/parcelada/recorrente; prévia das parcelas ou ocorrências
  antes de salvar; vencimento sugerido pelo cartão; teclado numérico nos valores; data nativa do iOS.
- **Despesas:** listas de recorrentes, parceladas e avulsas; detalhe com lançamentos, ações
  (editar, pausar, retomar, encerrar, excluir) e histórico.
- **Ajustes:** categorias, marcas e logos, meios de pagamento, exportar JSON, importar JSON,
  exportar CSV, "Onde ficam meus dados".
- **Boas-vindas** (banco vazio): "Importar minhas contas" ou "Começar do zero".
- **Estados vazios:** cada lista vazia explica o que fazer e oferece o botão de ação.

UX: alvos de toque ≥ 44 px; campos com rótulo visível; contraste AA; situação sempre com texto, além da cor;
`safe-area-inset` respeitado; tema claro e escuro conforme o sistema; textos em pt-BR,
valores em R$ e datas dd/mm/aaaa.

## 7. Dados, backup e privacidade

- Dados no IndexedDB da origem do app. Pede `navigator.storage.persist()`.
- CSP com `connect-src 'self'` (e `img-src 'self' data: blob:` para os logos enviados):
  o app não consegue enviar dados para fora.
- Nenhuma chamada de rede além do próprio app (cacheado pelo service worker para uso offline).
- **Exportar JSON:** `{ app: 'julius-finance', versao, exportadoEm, dados: { categorias, marcas,
  meiosPagamento, despesas, lancamentos, historico, configuracao } }`. No iPhone usa a folha de
  compartilhar (Web Share API com arquivo), com download como alternativa. Atualiza `ultimoBackupEm`.
- **Importar JSON:** substitui tudo após confirmação.
  - Antes de substituir, guarda um snapshot interno e oferece "Desfazer importação".
  - Rejeita sem alterar nada: JSON inválido, `app` diferente, `versao` maior que a suportada,
    campos obrigatórios ausentes ou de tipo errado (mensagem diz o que falhou).
  - Versões antigas passam pelas migrações.
- **Exportar CSV:** lançamentos filtrados; UTF-8 com BOM, separador `;`, vírgula decimal,
  datas dd/mm/aaaa. Colunas: Descrição, Loja/marca, Categoria, Tipo, Parcela, Mês, Vencimento,
  Valor, Situação, Pago em, Meio de pagamento, Observações.
- Tela "Onde ficam meus dados" explica as limitações:
  app instalado e Safari têm armazenamentos separados; apagar o app ou os dados do Safari apaga
  as despesas; mudar o endereço do app abre vazio; não há sincronização entre aparelhos.

## 8. Dados iniciais

- Fonte: `dados-locais/contas-extraidas.md` (fora do Git, contém dados pessoais).
- Saída: `dados-locais/contas-iniciais.json`, no formato de backup, com `aConfirmar` preenchido.
  Gerado por um script do projeto a partir de uma definição em TypeScript também em `dados-locais/`.
- `dados-locais/` está no `.gitignore`. O repositório público não contém dados pessoais.
- Importado pelo usuário na tela de boas-vindas.

## 9. PWA e publicação

- `vite-plugin-pwa`: manifest (nome "Julius", `display: standalone`, ícones incl. apple-touch-icon 180 px),
  service worker com precache e atualização automática na abertura seguinte.
- `base` do Vite = `/julius-finance/`.
- GitHub Actions em push na `main`: `npm ci` → testes → build → deploy no Pages.
  Teste falhando impede a publicação.

## 10. Testes

- **Vitest, domínio:** dinheiro (parse/format, distribuição de centavos, soma exata); datas
  (fim de mês, bissexto, virada de ano); cartão (antes, no dia e depois do fechamento); parcelas
  (geração, começa na parcela k, edição preserva pagas, sem duplicar, bloqueio de redução);
  recorrências (idempotência, mensal/semanal/anual, pausar/retomar/encerrar, editar "a partir de",
  valor variável estimado); situação com "hoje" fixo; resumo e filtros.
- **Vitest + fake-indexeddb, persistência:** round-trip gravar → exportar → importar → comparar
  com dados contendo acento e caracteres especiais (`Açaí & Cia — ção ⟦⟧`); histórico gravado na
  mesma transação; arquivo inválido, de outro app, de versão futura e com campo faltando
  rejeitados com banco intacto; desfazer importação.
- **CSV:** comparação exata do texto gerado.
- **Testing Library (Preact):** validação do formulário, estados vazios.
- **Playwright (WebKit):** cadastrar parcelada → conferir parcelas → marcar paga → exportar →
  limpar → importar → conferir igualdade.
- Revisão de cada tarefa confirma que os testes falhariam com o comportamento errado.

## 11. Fora de escopo

Sincronização entre aparelhos, notificações push, importação de CSV ou extrato bancário,
orçamento/metas, múltiplas moedas, anexos de comprovante, múltiplos usuários.

## 12. Pendências do usuário

- Completar os itens "a confirmar" dos dados iniciais pela interface.
- Lançar manualmente, como despesas avulsas no cartão, os itens de faturas anteriores à fatura
  aberta (ex.: a que vence em 07/10/2026). Os dados iniciais não incluem esses itens.
