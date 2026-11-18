# Documentação técnica — demonstração de pesquisa de preços no PNCP

**Público:** equipe de desenvolvimento
**Objetivo:** permitir avaliar, manter e integrar a demonstração ao sistema do município

---

## 1. Arquitetura

Aplicação **estática**, sem backend, sem etapa de build e sem dependências
externas. Os arquivos são servidos como estão (GitHub Pages) e o navegador
conversa **diretamente** com as APIs do PNCP.

| Origem | Comunicação | Destino |
|---|---|---|
| **Navegador** — HTML, CSS e JavaScript estáticos | HTTPS, requisições JSON | **pncp.gov.br** — `/api/search/`, `/api/consulta/v1/`, `/api/pncp/v1/` |
| **Navegador** — memória e `sessionStorage` | cache de página, cache de detalhe, última busca | — |

### Vantagens desse desenho

- nenhum servidor para manter;
- nenhum dado sensível trafega por infraestrutura própria;
- publicação imediata (um `git push`).

### Desvantagens — relevantes para a integração

- **cada usuário consome a cota do próprio IP** junto ao PNCP;
- **não há cache compartilhado**: dois servidores fazendo a mesma consulta
  gastam duas vezes;
- **não há controle de acesso nem auditoria**;
- **a lógica fica no cliente**, visível e alterável.

> **Recomendação para o sistema definitivo:** mover as chamadas para o backend
> (padrão *Backend for Frontend*). O navegador conversa com a API do município,
> que consulta o PNCP, aplica cache compartilhado e limita a taxa. Isso resolve
> os quatro pontos acima de uma vez.

---

## 2. Fluxo de uma consulta

```
1. editais.html → formulário de filtros
        │  (submit)
        ▼
2. resultados.html?tipo=edital&q=merenda&uf=PR,SP&...
        │
        ▼
3. MotorBusca.executar()
        │
        ├─► PNCP.buscar() ──► /api/search/ (1 requisição por página)
        │        │
        │        └─ cache de página (5 min)
        │
        ├─ aplicarFiltros()  ← filtros locais
        ├─ critério de parada? (alvo | tempo | fim | teto)
        │
        ▼
4. renderizarTabela()  → 20 por página, com seleção
        │
        ├─ marcar registros → selecionados (Set)
        ▼
5. Gerar relatório  → sessionStorage → relatorio.html → janela de impressão
```

---

## 3. Motor de busca (`js/busca.js`)

É o componente central. Não conhece a interface: recebe parâmetros, devolve
dados e reporta progresso por *callback*.

### 3.1 Política

| Constante | Valor | Função |
|---|---|---|
| `alvoResultados` | 100 | para quando já houver isso filtrado |
| `orcamentoMs` | 8 000 | para quando o tempo estourar |
| `maxPaginas` | 10 | teto duro (500 registros) |
| `intervaloMs` | 400 | pausa entre páginas |
| `tentativasPorPagina` | 2 | retentativas por página |
| `falhasSeguidasParaParar` | 2 | disjuntor |
| `timeoutMs` | 15 000 | tempo máximo por requisição |
| `cacheTtlMs` | 300 000 | validade do cache de página |
| `tamanhoPagina` | 50 | tamanho fixo da API |

A ordem de avaliação é: **alvo → tempo → fim dos registros → teto**.

### 3.2 Proteções

| Proteção | Implementação |
|---|---|
| Cache | `Map` com expiração por página |
| Retentativa | espera exponencial com variação aleatória (300 ms × 2ⁿ + até 200 ms) |
| Timeout | `AbortController` por tentativa |
| Disjuntor | duas falhas seguidas encerram a busca |
| Parcial preservado | erro no meio devolve o que já foi lido, com `completou: false` |
| Cancelamento | sinal externo interrompe requisição e espera |
| Página inicial | permite continuar de onde parou (botão "Buscar mais") |

### 3.3 Contrato de retorno

```javascript
{
  itens: [...],        // registros lidos
  total: 20672,        // total informado pelo PNCP para o termo
  paginasLidas: 4,
  parouPor: 'alvo' | 'tempo' | 'fim' | 'teto' | 'falha' | 'cancelada',
  completou: true      // false quando houve falha ou cancelamento
}
```

Nenhuma exceção chega à interface: o motor sempre devolve um resultado, no pior
caso vazio e com `completou: false`.

---

## 4. Filtros: nativos e locais

| Filtro | Onde é aplicado | Observação |
|---|---|---|
| Palavra-chave (`q`) | **PNCP** | busca textual do portal |
| `status` | **PNCP** | apenas `encerradas` e `recebendo_proposta` |
| UF (múltipla) | local | compara lista separada por vírgula |
| Município, órgão | local | comparação sem acento e sem caixa |
| Esfera, poder | local | — |
| Modalidade | local | quando não há palavra-chave, o nome da modalidade vira a consulta |
| Situação | local | — |
| Situação da disputa | local | deduzida das datas de recebimento de propostas |
| Com resultado homologado | local | `tem_resultado === true` |
| Faixa de valor | local | campo vazio vira `null`, nunca `0` |
| Período | local | `data_publicacao_pncp` ou `data_assinatura` |
| SRP, adesão, cancelada | local | — |
| Fornecedor, tipo de contrato | local | — |

**Consequência importante:** filtros locais só alcançam o que foi carregado.
Por isso existe a profundidade automática — e por isso a busca é uma amostra,
não um censo.

### 4.1 Detalhes que já causaram defeito

- **Campo vazio virando zero.** `Number('')` é `0`; sem tratamento, o filtro de
  valor máximo excluía todo registro com valor. Hoje há conversão explícita
  para `null`.
- **Modalidade não é filtro da API.** Precisa ser aplicada depois, sobre o
  nome.
- **`valor_global` é sempre nulo nos editais.** A exibição usa
  `valor_total_estimado` e `valor_total_homologado`; em contratos, usa
  `valor_global`.
- **Orçamento sigiloso** devolve `valorUnitarioEstimado: 0` — é o dado
  publicado (art. 24 da Lei 14.133/2021), não falha de leitura.

---

## 5. Tratamento de falhas da API

| Situação | Resposta do sistema |
|---|---|
| `301` com nova rota | segue o redirecionamento automaticamente |
| `301` com URL contendo `{cnpj}` | descarta a URL e troca a base `/api/pncp/` → `/api/consulta/` |
| `404` no detalhe | registro recém-publicado ainda não indexado; exibe o resumo e permite nova tentativa |
| `429` | limite de consultas; mensagem específica e botão de nova tentativa |
| erro de rede / CORS | mensagem genérica; o motor preserva o parcial |
| `204` | tratado como lista vazia |

### 5.1 Por que o 429 aparece como falha de rede

O PNCP responde `429` **sem os cabeçalhos de CORS**. O navegador, por segurança,
não expõe o status ao JavaScript — o `fetch` simplesmente rejeita. Por isso a
mensagem é deduzida, não lida.

### 5.2 Comportamento do limite

Observações durante o desenvolvimento:

- 40 requisições sequenciais passaram sem bloqueio em um momento;
- em outro momento, 2 requisições foram bloqueadas;
- a recuperação levou cerca de 5 minutos.

O comportamento sugere **cota acumulada com reabastecimento lento**, não limite
fixo por minuto. Daí a política conservadora.

---

## 6. Regras de negócio

### 6.1 A unidade é o item

A pesquisa de preços não é sobre a contratação inteira: é sobre o item. O
técnico costuma aproveitar um item de uma compra e outro de outra.

Por isso a seleção saiu da lista de resultados e foi para o detalhe, no nível
do item:

- `js/coleta.js` guarda a coleta em `localStorage`, com chave
  `itemUrl#numeroItem` — o mesmo item em contratações diferentes não colide;
- a coleta **sobrevive** a novas pesquisas, recarregar a página e fechar a aba;
- um item já adicionado não duplica: a segunda tentativa é recusada com
  `motivo: 'repetido'`;
- a leitura é tolerante a dado corrompido (retorna lista vazia).

#### Preço estimado e preço homologado

O botão **Preços** de cada item abre uma tabela com quatro colunas: fornecedor,
**valor unitário estimado** (do item, repetido em cada linha), **valor unitário
homologado** (do fornecedor) e quantidade homologada.

| Coluna | Origem |
|---|---|
| Valor unitário estimado | `valorUnitarioEstimado` do item |
| Valor unitário homologado | `valorUnitarioHomologado` de **cada fornecedor** |

O estimado fica na mesma linha do homologado para a comparação ser direta. O
painel lista **todos** os fornecedores homologados — não resume em um único
número. Quando há mais de um (cota reservada, desempate), o servidor vê todos.

A tabela de itens mantém apenas o `Unit. estimado`; o homologado vive no
painel, para não alargar a tabela com um valor que depende de consulta.

Para a coleta, usa-se o **menor** `valorUnitarioHomologado` positivo do item,
com registro do fornecedor correspondente. É heurística, não adjudicação: o
menor preço coincide com o vencedor na maioria dos casos, mas não em cota
reservada nem em desempate — daí o painel completo ao lado.

A consulta é sob demanda e fica em cache por 5 minutos, em memória e em
`sessionStorage`: adicionar, remover e adicionar de novo não repete a consulta.

### 6.2 Nome, histórico e backup

O nome da coleta vem do contexto, para o usuário reconhecê-la depois:

- primeiro item adicionado a uma coleta de nome padrão → renomeia para
  `{termo da busca} · {dd/mm}`, ou `{descrição do item}` quando não houver termo;
- nome escolhido pelo usuário (`Renomear`) **nunca** é sobrescrito;
- o termo da busca chega ao detalhe pelo parâmetro `q` no link de resultados.

Várias coletas convivem em `localStorage`, sob a chave `pncp:coletas`, e a
ativa em `pncp:coleta-ativa`. Gerar o relatório marca a coleta como encerrada
(`pncp:nova-coleta`), e o próximo item adicionado abre uma nova — sem criar
listas vazias.

**Backup:** `Coleta.exportarJson()` devolve todas as coletas em JSON;
`Coleta.importarJson(texto)` junta as do arquivo às existentes **sem
sobrescrever nem duplicar** (a chave é o `id` da coleta). É a forma de
preservar o trabalho quando o navegador é limpo ou trocado.

### 6.3 Mínimo da coleta

`Coleta.MINIMO = 3` em `js/coleta.js`.

- com 1 ou 2 itens, o relatório fica bloqueado;
- o sistema informa quantos faltam;
- o CSV é liberado com qualquer quantidade (inclusive vazia, para o caso de
  exportação parcial);
- a página da coleta valida o mínimo antes de abrir o documento.

O número **não cita norma**. A fonte normativa varia por órgão e deve ser
definida pelo setor de licitações antes da integração.

### 6.4 Relatório

Montado em `js/relatorio-pesquisa.js` a partir de um objeto preparado em
`js/coleta-pagina.js` e transportado por `sessionStorage`. A referência de valor
é o **unitário homologado**, com queda para o estimado quando não houver.

```
mediana = valor central (ímpar) ou média dos dois centrais (par)
média   = soma / quantidade
```

Apenas valores maiores que zero entram na conta.

---

## 7. Estrutura de arquivos

| Arquivo | Linhas | Responsabilidade |
|---|---:|---|
| `js/api.js` | 223 | cliente do PNCP: URLs, conversão de `item_url`, redirecionamento |
| `js/busca.js` | 258 | motor: política, cache, retentativa, disjuntor |
| `js/filtros.js` | 290 | configuração e renderização dos filtros |
| `js/resultados.js` | 544 | orquestração, filtros locais, ordenação, listagem |
| `js/detalhe.js` | 734 | dados, documentos, itens, dois preços e adição à coleta |
| `js/coleta.js` | 87 | armazenamento da coleta em `localStorage` |
| `js/coleta-pagina.js` | 258 | página da coleta: lista, resumo, CSV e relatório |
| `js/relatorio.js` | 52 | geração do CSV |
| `js/relatorio-pesquisa.js` | 213 | documento imprimível |
| `css/estilo.css` | 377 | interface |
| `css/relatorio.css` | 143 | documento e regras de impressão |

---

## 8. Testes e monitoramento

### 8.1 Suítes (execução local, sem dependências)

```bash
node tests/busca.test.js          # 13 verificações
node tests/api.test.js            # 11
node tests/detalhe.test.js        #  8
node tests/itens.test.js          # 22
node tests/coleta.test.js         # 43
node tests/coleta-pagina.test.js  # 21
node tests/relatorio.test.js      # 24
```

**Total: 142 verificações.** Os arquivos usam `eval` sobre o código-fonte, com
`fetch` simulado — testam o código real, não uma cópia.

### 8.2 Verificação diária

`.github/workflows/smoke-pncp.yml` executa `tests/smoke.js` todo dia às 06:17
(Brasília):

- confere `HTTP 200`, `total` numérico, `items` como lista;
- confere os campos essenciais do item;
- confere se o detalhe responde;
- em caso de falha, **abre uma issue** (sem duplicar).

O detalhe é tratado como aviso quando o motivo é `429` ou registro não
indexado — para não gerar alarme falso.

---

## 9. Integração ao sistema atual

### 9.1 O que é reaproveitável

| Componente | Reaproveitamento |
|---|---|
| Regras de filtro (`aplicarFiltros`) | direto, inclusive em Python |
| Política do motor de busca | direto — é só configuração |
| Regra do mínimo de 3 | direto |
| Cálculos do relatório | direto |
| Estrutura do documento | direto, como template |
| Mensagens ao usuário | direto |

### 9.2 O que precisa mudar

| Item | Motivo |
|---|---|
| Chamadas no backend | evitar cota por IP do usuário e permitir cache compartilhado |
| Cache em servidor | hoje é `Map` no navegador; deve ser Redis ou similar |
| Autenticação e perfis | hoje não existe |
| Persistência das pesquisas | hoje se perdem ao fechar a aba |
| Auditoria | registrar quem pesquisou o quê e quando |
| Fila ou limite por usuário | proteger a cota do município |

### 9.3 Esforço estimado

| Etapa | Estimativa |
|---|---|
| Portar filtros e motor para o backend | 1 semana |
| Endpoint único com cache e limite | 3 a 5 dias |
| Relatório no servidor (PDF) | 3 a 5 dias |
| Autenticação, perfis e auditoria | depende do sistema atual |
| Base local (se for o caminho escolhido) | 2 a 4 semanas |

---

## 10. Limitações conhecidas

1. **Dependência de endereço não documentado** — risco central, ver documento
   de apresentação, seção 7.
2. **Amostra, não censo** — a busca cobre até 100 resultados por padrão.
3. **Sem índice próprio** — ordenação e filtros só operam sobre o carregado.
4. **Sem histórico** — cada consulta é ao vivo.
5. **Sem controle de acesso.**
6. **Sigilo de valores** — quando o órgão publica orçamento sigiloso, o valor
   não existe, e o sistema informa isso em vez de exibir zero.
7. **Registros recém-publicados** podem não ter detalhe disponível por algumas
   horas (defasagem de indexação do próprio PNCP).

---

## 11. Glossário

| Termo | Significado |
|---|---|
| **PNCP** | Portal Nacional de Contratações Públicas |
| **Coleta de preços** | conjunto de preços coletados que fundamenta o valor estimado |
| **Profundidade** | quantidade de páginas lidas em uma busca (hoje automática) |
| **Disjuntor** | mecanismo que interrompe tentativas após falhas repetidas |
| **Cache** | armazenamento temporário para evitar consulta repetida |
| **BFF** | *Backend for Frontend*, camada de servidor dedicada ao front |
| **429** | código HTTP de "requisições excessivas" |
