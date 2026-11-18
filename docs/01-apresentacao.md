# Pesquisa de preços no PNCP — documento de apresentação

**Demonstração funcional · versão para avaliação da equipe e do setor de licitações**

---

## 1. Resumo

Este documento apresenta uma demonstração de sistema para **pesquisa de preços
públicos** usando os dados do Portal Nacional de Contratações Públicas (PNCP).

A demonstração está publicada e funcional. Permite consultar contratações,
atas de registro de preços e contratos, aplicar filtros combinados que o portal
do PNCP não oferece, selecionar os registros que interessam e gerar um
relatório de pesquisa pronto para anexar ao processo.

Não é um sistema pronto para produção. É uma prova de conceito que permite
avaliar, com dados reais, se vale a pena integrá-la ao sistema do município —
e em que condições.

---

## 2. O problema hoje

O PNCP é a fonte oficial e obrigatória das contratações públicas. Mas a
consulta ao portal, para quem precisa pesquisar preços, apresenta limitações
práticas:

| Dificuldade | Consequência no dia a dia |
|---|---|
| A busca do portal aplica poucos filtros combinados | é preciso abrir contratação por contratação |
| Não há filtro por faixa de valor | comparar preços exige leitura manual |
| Não há seleção de registros | o técnico copia linha por linha para o Excel |
| Não há exportação | a memória de cálculo é montada à mão |
| Não há relatório | a coleta de preços é redigida do zero |

O resultado é um trabalho repetitivo, demorado e sujeito a erro de transcrição
— justamente na etapa que precisa de rastreabilidade.

---

## 3. O que a demonstração faz

| Funcionalidade | Situação |
|---|---|
| Pesquisa em contratações, atas e contratos | implementado |
| Filtros combinados (UF, município, órgão, modalidade, esfera, poder, situação, valores, período) | implementado |
| Seleção de múltiplos estados (ex.: PR e SP) | implementado |
| Ordenação por data, valor ou órgão | implementado |
| Painel de preços por item: valor estimado e todos os homologados | implementado |
| Coleta de itens: selecionar um item, pesquisar outra contratação e somar | implementado |
| Exportação em CSV da coleta | implementado |
| Relatório de pesquisa em PDF, com cálculos e campos de assinatura | implementado |
| Detalhe da contratação: documentos, itens e preços homologados | implementado |
| Link direto para o registro no portal do PNCP | implementado |
| Busca automática de profundidade, sem o usuário configurar | implementado |
| Verificação diária automática da API | implementado |

---

## 4. Como o técnico usa

1. **Escolhe o tipo de consulta** — editais, atas ou contratos.
2. **Informa a palavra-chave** e ajusta os filtros (estado, período,
   modalidade, faixa de valor).
3. **Pesquisa.** O sistema busca automaticamente quantas páginas forem
   necessárias, sem perguntar nada.
4. **Analisa os resultados** na tela, ordenados como preferir.
5. **Abre o detalhe** de uma contratação e clica em **Preços** no item: o painel
   mostra o **valor unitário estimado** e, para cada fornecedor, o
   **valor unitário homologado**.
6. **Adiciona à coleta** apenas os itens que interessam. Pode voltar, fazer
   outra pesquisa e somar mais itens — a coleta guarda tudo.
7. Na **Coleta**, revisa, remove o que não serve, e **gera o relatório** (PDF)
   ou exporta a planilha. A coleta exige no mínimo três itens.

---

## 5. O relatório de pesquisa

O documento gerado contém:

1. **Identificação** — data e hora, quantos itens compõem a coleta.
2. **Origem dos dados** — PNCP, dados públicos.
3. **Resumo dos valores unitários** — quantidade, menor valor,
   **mediana**, média e maior valor.
4. **Coleta de preços** — uma linha por item, com descrição, fornecedor,
   órgão, município/UF, data, quantidade, **valor unitário estimado**,
   **valor unitário homologado** e o endereço do registro de origem.
5. **Metodologia** — campos para o responsável assinalar média, mediana, menor
   preço ou outro, informar o valor de referência adotado e justificar.
6. **Observações** — declaração de que os registros correspondem ao retorno do
   PNCP no momento da consulta, e não à totalidade das contratações do período.
7. **Assinatura** — local, data e responsável.

O sistema **não decide a metodologia**. Ele calcula e apresenta os números; a
escolha e a justificativa permanecem com o servidor.

---

## 6. Limites da demonstração

É importante que a equipe saiba o que **não** está pronto:

| Limite | Explicação |
|---|---|
| As coletas ficam no navegador | não há servidor; limpar os dados de navegação apaga tudo. O **backup em arquivo** preserva e permite levar para outro computador |
| Não tem usuários nem perfis | qualquer pessoa com o endereço acessa |
| Não tem base de dados própria | depende inteiramente do PNCP responder |
| A busca é uma amostra | traz até 100 resultados (ou até 500 no limite máximo), não o universo do período |
| Não substitui o processo | gera um documento de apoio, não um ato administrativo |
| Depende de um endereço não documentado | ver seção 7 |

---

## 7. Riscos e pontos de decisão

### 7.1 O risco principal: a busca textual

A busca por palavra-chave usa um endereço do próprio portal do PNCP que **não
está na documentação oficial**. É o mesmo que o portal usa para exibir os
resultados ao público.

Consequências:

- **pode mudar sem aviso** — já ocorreu durante o desenvolvimento, quando o
  endereço de detalhe passou a responder com redirecionamento;
- **há limite de consultas por endereço de rede** — quando excedido, o PNCP
  recusa temporariamente, e a recuperação leva minutos;
- **a adaptação é possível**, mas é sempre reativa: alguém precisa corrigir.

O sistema já contém proteções (ver seção 8) e uma **verificação automática
diária** que avisa quando o endereço muda.

### 7.2 O caminho definitivo

A alternativa que elimina esse risco é manter uma **base local** com os dados
do PNCP, atualizada periodicamente, com busca própria.

| Aspecto | Consulta direta (atual) | Base local |
|---|---|---|
| Dependência do PNCP | total | só na sincronização |
| Risco de mudança | alto | baixo |
| Custo de infraestrutura | nenhum | servidor e armazenamento |
| Volume estimado | — | cerca de 3 GB (Paraná) |
| Esforço inicial | pronto | 2 a 4 semanas |
| Busca por texto | limitada ao que o portal oferece | livre, com ranking próprio |

### 7.3 Decisões necessárias antes de integrar

1. **Consulta formal ao PNCP** sobre o uso do endereço de busca do portal.
2. **Definição da fonte normativa** da pesquisa de preços no município —
   qual norma fixa o mínimo de preços e a metodologia aceita.
3. **Escolha do caminho técnico** — consulta direta ou base local.
4. **Definição de acesso** — quem usa, com qual autenticação e qual registro
   de auditoria.
5. **Persistência** — se as pesquisas devem ficar salvas e recuperáveis.

---

## 8. O que já está resolvido tecnicamente

Estas proteções existem na demonstração e podem ser reaproveitadas na
integração:

- **Profundidade automática** — o sistema decide quantas páginas ler, parando
  quando já tem resultado suficiente, quando o tempo estoura ou quando atinge
  o teto de segurança.
- **Cache** — consultas repetidas em até 5 minutos não consomem requisições.
- **Retentativa com espera crescente** — falhas passageiras são absorvidas.
- **Disjuntor** — após duas falhas seguidas, a busca para em vez de insistir.
- **Resultado parcial preservado** — se o PNCP falhar no meio, o que já veio é
  exibido.
- **Cancelamento** — nova busca interrompe a anterior.
- **Mensagens claras** — o usuário entende o que aconteceu e pode tentar de
  novo sem recarregar a página.
- **Verificação diária** — rotina automática confere se a API continua
  respondendo no formato esperado e abre um alerta quando não.

---

## 9. Qualidade e testes

| Item | Número |
|---|---|
| Verificações automatizadas | 142 |
| Suítes de teste | 7 |
| Verificação diária da API | 1 (GitHub Actions) |
| Telas | 8 |
| Linhas de código | cerca de 3900 |

As suítes cobrem as decisões do motor de busca, a conversão de endereços, o
comportamento em falha, os cálculos do relatório e a seleção de registros.

---

## 10. Próximos passos sugeridos

1. **Apresentar ao setor de licitações** e colher três informações:
   - o relatório atende ao formato que o processo exige?
   - qual a norma que fixa o mínimo de preços?
   - quais filtros faltam para o uso real?
2. **Apresentar à equipe técnica** com o documento técnico anexo.
3. **Decidir o caminho** — consulta direta com as proteções atuais ou base
   local.
4. **Estimar a integração** ao sistema atual: as regras, o motor de busca e o
   relatório já estão prontos e são reaproveitáveis.

---

*Demonstração publicada em: https://cezarj59.github.io/pncp-pesquisa/*
