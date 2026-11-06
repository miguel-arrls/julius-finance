# Julius Finance — adendo: visual, insights e banco/cartão

Data: 05/11/2026 · Status: aprovado em 05/11/2026 · Branch: `melhorias/visual-insights-bancos`

Este adendo acrescenta decisões à spec `2026-10-06-julius-finance-design.md`, que continua sendo a
autoridade para todo o resto (privacidade, sem rede, centavos inteiros, datas em texto, IDs
determinísticos, histórico em transação).

## 1. Objetivo

Deixar o app mais bonito, mais clicável e com mais leitura dos gastos, e permitir marcar em qual banco
ou cartão cada despesa está.

Critérios de sucesso:

- Escolher o cartão de uma despesa tocando no logo do banco, e cadastrar um cartão novo sem sair do
  formulário.
- Do Início, chegar com um toque à lista já filtrada (categoria, situação, cartão).
- Ver a variação contra o mês anterior, o gasto por cartão, a evolução dos últimos meses e os
  compromissos futuros (parcelas e fixos).
- Nenhuma dependência nova de interface, nenhum gráfico por biblioteca, nenhum acesso à rede.

## 2. Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Banco do meio de pagamento | `MeioPagamento` ganha `bancoSlug?` (chave do catálogo embutido) e `cor?` | Mostrar o logo do banco; campos não indexados, sem nova versão do Dexie |
| Banco sem logo no catálogo | Iniciais do nome na cor escolhida | O catálogo não tem todos os bancos |
| Cadastro de cartão | Editor de meio reaproveitado dentro do formulário de despesa; o novo meio já fica selecionado | Não interromper o cadastro da despesa |
| Insights | Comparação com o mês anterior, gasto por meio, evolução de 6 meses e compromissos futuros, em `src/dominio/insights.ts` | Pedido do usuário: todos |
| Gráficos | SVG inline e CSS, com texto alternativo e os valores também em lista | CSP e "sem rede" intactos; acessível |
| Lista filtrada por rota | `#/lancamentos?mes=…&situacao=…&categoria=…&meio=…&tipo=…`; valor inválido é ignorado | O resumo e os gráficos viram links |
| Filtros | Chips (radiogroup) no lugar dos `<select>` | Mais rápido de tocar no celular |
| Ações na linha | Deslizar para a esquerda revela Pagar, Editar e Duplicar; tocar e segurar abre o mesmo menu | Evita pagar sem querer, que o deslize direto permitia |
| Duplicar | `#/nova?de=<id>` pré-preenche o formulário com id novo e datas limpas | Repetir compra parecida em poucos toques |
| Direção visual | Redesign A, "Carteira de cartões" (escolhido em 05/11/2026 na prévia) | Escolha do usuário entre três direções |

## 3. Direção visual: Carteira de cartões

- Início abre com o total do mês e a variação contra o mês anterior, seguidos dos cartões de crédito
  em carrossel horizontal, cada um na cor do banco, com fatura aberta, fechamento e vencimento.
- Abaixo: três indicadores curtos (variação, quantidade de compras, maior categoria), os lançamentos da
  fatura e os gastos fora dos cartões (Pix, boleto, débito).
- Lançamentos: cartões como avatares redondos no topo para filtrar, situação em controle segmentado,
  cartão-resumo do filtro com "Pagar fatura" quando o filtro é um cartão de crédito.
- Formulário: valor em destaque, seletor de cartão em miniaturas coloridas com "Novo", campos
  agrupados em lista.
- Claro e escuro, contraste AA nos dois temas, transições curtas que respeitam
  `prefers-reduced-motion`.

### 3.1 Detalhamento aprovado em 06/11/2026

- **Navegação:** abas Início, Lançamentos, Despesas e Análise; botão redondo flutuante para nova despesa;
  Ajustes numa engrenagem no topo do Início (no PC, Ajustes continua também na barra lateral). A aba
  "Cartões" da prévia ficou de fora: os cartões aparecem no carrossel do Início e o cadastro continua em
  Ajustes → Meios de pagamento.
- **Alerta de conta atrasada no Início** (veio da direção Painel): até 2 atrasadas, um alerta por conta
  com o botão Pagar; a partir de 3, um alerta só com a quantidade e o total, que leva à lista filtrada
  por atrasadas em todos os meses (`#/lancamentos?mes=todos&situacao=atrasada`).
- **Carrossel:** cada cartão de crédito mostra a fatura que vence no mês (a do dia de vencimento do cartão
  tem prioridade sobre vencimentos digitados à mão), fechamento, vencimento e "Pagar fatura".
- **Nada sai do Início:** Pago, Pendente, atrasadas, próximos vencimentos, gastos por categoria, próximos
  meses e os avisos continuam; o bloco "Fatura do cartão" passou para dentro do carrossel.
- **Formulário:** o valor fica em destaque no topo; o tipo continua "Recorrente" (a prévia dizia "Fixa").
