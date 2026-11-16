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
| `resultados.html` | recebe os filtros e lista os registros |
| `detalhe.html` | dados completos, documentos e preços por item |

## Como funciona

```
editais.html  →  resultados.html?tipo=edital&q=merenda&uf=PR&...
                        ↓ (clique em "Detalhes")
                 detalhe.html?u=/compras/76105634000170/2026/44
```

Os dados vêm **ao vivo** do PNCP, buscados pelo navegador do usuário:

| Uso | Endpoint |
|---|---|
| busca textual | `pncp.gov.br/api/search/` |
| detalhe, itens, documentos | `pncp.gov.br/api/pncp/v1/...` |
| link para o portal | `pncp.gov.br/app` + `item_url` |

### Sobre os filtros

A API de busca do PNCP **só aplica a palavra-chave** (`q`). Todos os outros
filtros — UF, município, órgão, modalidade, situação, valores, período — são
aplicados **no navegador**, sobre os registros carregados.

Por isso existe o campo **Profundidade da busca**: ele define quantas páginas
de 50 registros serão lidas (1 a 12). Quanto maior, mais completa a filtragem
e mais demorada a consulta.

O rodapé de resultados sempre mostra: quantos passaram nos filtros, quantos
foram analisados e quantos existem no PNCP para o termo.

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
├── css/
│   └── estilo.css
└── js/
    ├── api.js         cliente da API do PNCP
    ├── filtros.js     configuração e renderização dos filtros
    ├── resultados.js  busca, filtragem e listagem
    └── detalhe.js     dados, documentos, itens e preços
```

## Créditos

Dados: [Portal Nacional de Contratações Públicas](https://pncp.gov.br).
Layout e sistema: Licit@Gov — Prefeitura Municipal de Colombo/PR.
