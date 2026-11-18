# Documentação

Documentos de avaliação da demonstração de pesquisa de preços no PNCP.

| Documento | Para quem | Conteúdo |
|---|---|---|
| `Documentacao-PNCP-Pesquisa.pdf` | apresentação | os dois documentos reunidos, com capa — **use este para imprimir ou enviar** |
| `Documentacao-PNCP-Pesquisa.docx` | edição | mesma versão em Word, caso precise ajustar texto |
| [01-apresentacao.md](01-apresentacao.md) | setor de licitações, gestão | problema, o que a demonstração faz, limites, riscos e decisões pendentes |
| [02-documentacao-tecnica.md](02-documentacao-tecnica.md) | equipe de desenvolvimento | arquitetura, motor de busca, filtros, falhas, testes e plano de integração |

O PDF tem 12 páginas: capa, Parte 1 (apresentação) e Parte 2 (documentação
técnica).

## Ordem de leitura sugerida

1. **Parte 1 — Apresentação** — para entender o que está sendo proposto e o que
   precisa ser decidido.
2. **Parte 2 — Documentação técnica** — para avaliar esforço, riscos e caminho
   de integração.

## Antes de integrar, é preciso decidir

1. O relatório atende ao formato que o processo exige?
2. Qual norma do município fixa o mínimo de preços e a metodologia?
3. Consulta direta ao PNCP (com as proteções atuais) ou base local?
4. Quem acessa, com qual autenticação e qual auditoria?

Ver seção 7 da apresentação.

## Regerar o PDF

O documento é montado a partir dos dois arquivos Markdown:

```bash
python docs/gerar-documento.py
```

Isso gera `Documentacao-PNCP-Pesquisa.docx`. Para o PDF, abra no Word ou no
LibreOffice e exporte (Arquivo → Salvar como → PDF).

Requisito: `python-docx`.
