# Licit@Gov — Pesquisa PNCP (demonstração)

Clone funcional das telas de consulta do Portal Nacional de Contratações
Públicas (PNCP), no visual do sistema Licit@Gov.

Projeto **100% estático** — HTML, CSS e JavaScript puro. Sem backend, sem build.
Pronto para GitHub Pages.

---

## O que tem

| Página | Conteúdo |
|---|---|
| `index.html` | página inicial com os três módulos |
| `editais.html` | filtros de contratações publicadas |
| `atas.html` | filtros de atas de registro de preços |
| `contratos.html` | filtros de contratos e empenhos |
| `resultados.html` | lista os registros, com ordenação e "buscar mais" |
| `detalhe.html` | dados completos, documentos, itens e preços por item |
| `coleta.html` | histórico de coletas, itens, CSV e relatório |

## Como funciona

```
editais.html  →  resultados.html?tipo=edital&q=merenda&uf=PR&...
                        ↓ (clique em "Detalhes")
                 detalhe.html?u=/compras/76105634000170/2026/44
                        ↓ ("Adicionar" nos itens)
                 coleta.html  →  relatório em PDF
```

Os dados vêm **ao vivo** do PNCP, buscados pelo navegador do usuário:

| Uso | Endpoint |
|---|---|
| busca textual | `pncp.gov.br/api/search/` |
| detalhe, itens, documentos | `pncp.gov.br/api/pncp/v1/...` |
| link para o portal | `pncp.gov.br/app` + `item_url` |

### Sobre os filtros

A API de busca do PNCP **só aplica a palavra-chave** (`q`) e o campo `status`
(`encerradas` / `recebendo_proposta`). Os demais filtros — UF, município,
órgão, modalidade, situação, valores, período — são aplicados **no navegador**,
sobre os registros carregados.

### Profundidade automática

O usuário **não escolhe** quantas páginas ler. O motor (`js/busca.js`) decide,
parando no primeiro destes critérios:

| Condição | Efeito |
|---|---|
| 100 resultados filtrados | para — já há o suficiente |
| 8 segundos de busca | para — respeita o tempo do usuário |
| menos de 50 itens na página | para — acabaram os registros |
| 10 páginas | teto duro de segurança |

Além disso o motor aplica:

- **cache de 5 minutos** por página, então repetir buscas ou trocar só os
  filtros não consome requisições novas;
- **retentativa com espera crescente e variação aleatória** em falhas;
- **timeout de 15 s por requisição**, para nenhuma chamada travar a tela;
- **disjuntor**: duas falhas seguidas encerram a busca;
- **preservação do parcial**: se o PNCP falhar no meio, o que já veio é exibido;
- **cancelamento**: nova busca aborta a anterior em andamento.

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub.
2. Envie o conteúdo desta pasta (não a pasta em si):

   ```bash
   git init
   git add .
   git commit -m "feat: demo de pesquisa no PNCP"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```

3. No repositório: **Settings → Pages**
4. Em *Source*, escolha **Deploy from a branch**
5. Branch `main`, pasta `/ (root)` → **Save**
6. Em 1 a 2 minutos o site estará em:

   ```
   https://SEU-USUARIO.github.io/SEU-REPO/
   ```

Não precisa de configuração extra: todos os caminhos são relativos.

## Visualizar localmente

Basta abrir `index.html` no navegador. Ou, para simular o Pages:

```bash
python -m http.server 5500
```

Depois acesse `http://localhost:5500`.

## Limitações conhecidas

1. **A API de busca do PNCP não é documentada.** Pode mudar sem aviso.
2. **Bloqueio por excesso de chamadas.** Se aparecer erro, aguarde alguns
   minutos — o bloqueio é temporário e por IP.
3. **Filtros pós-busca.** Como o PNCP não os aplica, o resultado depende da
   profundidade escolhida. Um termo muito específico pode não aparecer entre
   os primeiros registros de um período longo.
4. **Sem paginação remota.** A navegação entre páginas percorre apenas os
   registros já carregados.

## Estrutura

```
pncp-demo/
├── index.html
├── editais.html
├── atas.html
├── contratos.html
├── resultados.html
├── detalhe.html
├── coleta.html
├── relatorio.html
├── css/
│   ├── estilo.css
│   └── relatorio.css
├── js/
│   ├── api.js                cliente da API do PNCP
│   ├── busca.js              motor: paginação, cache, retentativa, disjuntor
│   ├── filtros.js            configuração e renderização dos filtros
│   ├── coleta.js              armazenamento dos itens selecionados
│   ├── relatorio.js          geração do CSV
│   ├── relatorio-pesquisa.js documento imprimível de pesquisa de preços
│   ├── resultados.js         orquestra busca, filtros, ordenação e listagem
│   ├── coleta-pagina.js       página da coleta: lista, resumo, CSV e relatório
│   └── detalhe.js            dados, documentos, itens, preços e coleta
└── tests/
    ├── api.test.js
    ├── busca.test.js
    ├── detalhe.test.js
    ├── itens.test.js
    ├── coleta.test.js
    ├── coleta-pagina.test.js
    └── relatorio.test.js
```

## Testes

Sem dependências — basta o Node instalado:

```bash
node tests/busca.test.js
node tests/api.test.js
node tests/detalhe.test.js
node tests/itens.test.js
node tests/coleta.test.js
node tests/coleta-pagina.test.js
node tests/relatorio.test.js
```

Cobrem as decisões do motor (alvo, teto, falha parcial, cache, cancelamento,
página inicial), a conversão de `item_url` em endpoint e link do portal, o
comportamento da página de detalhe quando o PNCP recusa (mensagem clara, nova
tentativa e cache), a tabela de itens com os dois preços, o armazenamento da
coleta, os cálculos do relatório e a página da coleta.

## Coletas de preços

A unidade da pesquisa é o **item**, não a contratação. Muitas vezes o técnico
aproveita um único item de uma compra.

1. Na lista de resultados, abra o **detalhe** de uma contratação.
2. Em **Itens e preços**, clique em **Adicionar** no item desejado. O botão
   vira **Remover da coleta** — clique de novo para desfazer, sem sair da tela.
3. Pode voltar, fazer **outra pesquisa** e adicionar mais itens — tudo fica em
   `localStorage`, então sobrevive a recarregar a página e a fechar a aba.
4. Em **Coleta** (no topo), revise, remova o que não serve e gere o documento.

### Histórico

O sistema guarda **várias coletas**, não uma só. Cada uma tem nome, data e os
seus itens, e nenhuma é apagada ao iniciar outra.

O nome é sugerido a partir da pesquisa: o **termo buscado** mais a data curta
(`merenda escolar · 18/11`). Se não houver termo, usa a descrição do primeiro
item. Nome escolhido pelo usuário nunca é sobrescrito.

| Ação | Efeito |
|---|---|
| **Nova coleta** | abre uma lista nova; as anteriores continuam guardadas |
| **Usar esta** | passa a adicionar itens nessa coleta |
| **Renomear** | troca o nome |
| **Gerar relatório** | emite o documento e **encerra** a coleta |
| **Excluir** | remove a coleta e seus itens |
| **Baixar backup** | salva todas as coletas em um `.json` |
| **Importar backup** | junta as coletas do arquivo às existentes, sem duplicar |

Depois de gerar o relatório, os próximos itens adicionados vão automaticamente
para uma coleta nova — a que foi relatada fica intacta no histórico.

As coletas ficam no **armazenamento do navegador** (`localStorage`), não em
servidor. Limpar os dados de navegação apaga tudo; o backup é a forma de
preservar e de levar para outro computador.

O botão **Preços** de cada item abre um painel com o **valor unitário estimado**
do item e, para cada fornecedor homologado, o **valor unitário homologado** e a
quantidade homologada. É ali que se compara o previsto com o contratado.

Para a coleta, o sistema usa o **menor** valor homologado do item e guarda o
fornecedor correspondente.

A coleta exige **no mínimo 3 itens**. Abaixo disso, os botões ficam bloqueados e
o sistema informa quantos faltam.

## Relatório de pesquisa

A partir da coleta, **Gerar relatório** abre um documento pronto para impressão
ou para salvar em PDF, contendo:

1. identificação (data e hora, quantos itens na coleta);
2. origem dos dados;
3. resumo dos valores **unitários**: quantidade, menor, **mediana**, média e maior;
4. a coleta de preços, com item, fornecedor, órgão, quantidade, os dois valores
   unitários e o link do registro de origem;
5. campos para o responsável assinalar a metodologia adotada e o valor de
   referência;
6. espaço para assinatura.

O documento deixa explícito que os registros correspondem ao que o PNCP
retornou no momento da consulta, e não à totalidade das contratações do
período — informação necessária quando o relatório vai ao processo.

**Exportar CSV** gera a mesma coleta em planilha, com uma coluna para cada preço.

## Verificação automática da API

O repositório inclui um teste de fumaça que roda **todo dia às 06:17 (Brasília)**
no GitHub Actions:

```bash
node tests/smoke.js     # também roda localmente
```

Ele confere se:

- a busca responde HTTP 200;
- o campo `total` continua numérico e maior que zero;
- `items` continua sendo lista com registros;
- os campos essenciais seguem presentes (`orgao_nome`, `uf`, `data_publicacao_pncp`, `orgao_cnpj`, `numero_sequencial`);
- o detalhe de uma contratação ainda responde.

Se falhar, o workflow **abre uma issue automaticamente** (sem duplicar se já
existir uma aberta). O detalhe é tratado como aviso quando o motivo é limite de
requisições ou registro recém-publicado — nesses casos não é mudança de contrato.

Se a issue aparecer, **reexecute antes de investigar**: o PNCP bloqueia
temporariamente endereços com muitas chamadas.

## Créditos

Dados: [Portal Nacional de Contratações Públicas](https://pncp.gov.br).
Layout e sistema: Licit@Gov — Prefeitura Municipal de Colombo/PR.
