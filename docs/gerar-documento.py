"""Gera a documentação em DOCX a partir dos arquivos Markdown.

Uso:
    python docs/gerar-documento.py

Requer python-docx. Depois de gerar o DOCX, converta para PDF com o
LibreOffice ou com o Word (Arquivo > Salvar como > PDF).
"""

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

RAIZ = Path(__file__).resolve().parent
SAIDA = RAIZ / "Documentacao-PNCP-Pesquisa.docx"

VERDE = RGBColor(0x00, 0x70, 0x3A)
CINZA = RGBColor(0x55, 0x55, 0x55)
ESCURO = RGBColor(0x1B, 0x1B, 0x1B)


# ---------------------------------------------------------------- inline

PADRAO_INLINE = re.compile(r"(\*\*.+?\*\*|`[^`]+`|\*[^*]+?\*)")


def escrever_inline(paragrafo, texto, negrito=False, italico=False, tamanho=None):
    """Adiciona texto ao parágrafo interpretando **negrito**, *itálico* e `código`."""
    for pedaco in PADRAO_INLINE.split(texto):
        if not pedaco:
            continue

        if pedaco.startswith("**") and pedaco.endswith("**"):
            # recorre: o trecho em negrito pode conter `código`
            escrever_inline(paragrafo, pedaco[2:-2], True, italico, tamanho)

        elif pedaco.startswith("`") and pedaco.endswith("`"):
            run = paragrafo.add_run(pedaco[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt((tamanho or 10.5) - 1)
            if negrito:
                run.bold = True

        elif pedaco.startswith("*") and pedaco.endswith("*") and len(pedaco) > 2:
            escrever_inline(paragrafo, pedaco[1:-1], negrito, True, tamanho)

        else:
            run = paragrafo.add_run(pedaco)
            if negrito:
                run.bold = True
            if italico:
                run.italic = True
            if tamanho:
                run.font.size = Pt(tamanho)


# ---------------------------------------------------------------- blocos

def sombrear(celula, cor="F2F5F3"):
    xml = OxmlElement("w:shd")
    xml.set(qn("w:val"), "clear")
    xml.set(qn("w:fill"), cor)
    celula._tc.get_or_add_tcPr().append(xml)


def repetir_cabecalho(celula):
    """Repete a linha de cabeçalho quando a tabela atravessa páginas."""
    trPr = celula._tc.getparent().get_or_add_trPr()
    cabecalho = OxmlElement("w:tblHeader")
    cabecalho.set(qn("w:val"), "true")
    trPr.append(cabecalho)


def borda_inferior(paragrafo):
    pPr = paragrafo._p.get_or_add_pPr()
    bordas = OxmlElement("w:pBdr")
    baixo = OxmlElement("w:bottom")
    baixo.set(qn("w:val"), "single")
    baixo.set(qn("w:sz"), "6")
    baixo.set(qn("w:color"), "CCCCCC")
    bordas.append(baixo)
    pPr.append(bordas)


def bloco_codigo(documento, linhas):
    for indice, linha in enumerate(linhas):
        paragrafo = documento.add_paragraph()
        paragrafo.paragraph_format.space_after = Pt(0)
        paragrafo.paragraph_format.space_before = Pt(0)
        paragrafo.paragraph_format.left_indent = Cm(0.4)
        paragrafo.paragraph_format.line_spacing = 1.0

        # não deixa o bloco quebrar entre páginas
        paragrafo.paragraph_format.keep_together = True
        paragrafo.paragraph_format.keep_with_next = indice < len(linhas) - 1

        run = paragrafo.add_run(linha if linha else " ")
        run.font.name = "Consolas"
        run.font.size = Pt(8.5)

        if indice == 0:
            paragrafo.paragraph_format.space_before = Pt(6)
        if indice == len(linhas) - 1:
            paragrafo.paragraph_format.space_after = Pt(10)


def tabela(documento, linhas):
    linhas = [l for l in linhas if not re.match(r"^\|[\s:|-]+\|$", l)]
    if not linhas:
        return

    celulas = [[c.strip() for c in l.strip().strip("|").split("|")] for l in linhas]
    colunas = max(len(c) for c in celulas)

    tabela = documento.add_table(rows=0, cols=colunas)
    tabela.style = "Table Grid"
    tabela.alignment = WD_TABLE_ALIGNMENT.CENTER

    for indice, linha in enumerate(celulas):
        linha_doc = tabela.add_row().cells

        for posicao in range(colunas):
            texto = linha[posicao] if posicao < len(linha) else ""
            paragrafo = linha_doc[posicao].paragraphs[0]
            paragrafo.paragraph_format.space_after = Pt(2)
            paragrafo.paragraph_format.space_before = Pt(2)

            escrever_inline(paragrafo, texto, negrito=(indice == 0), tamanho=9)

            if indice == 0:
                sombrear(linha_doc[posicao])
                repetir_cabecalho(linha_doc[posicao])

    # espaço depois da tabela
    documento.add_paragraph().paragraph_format.space_after = Pt(2)


def pode_continuar(linha):
    """Diz se a linha anterior aceita continuação de parágrafo."""
    if not linha:
        return False
    if linha.startswith(("#", "|", "```", ">")):
        return False
    if linha.strip() == "---":
        return False
    return True


def juntar_linhas(linhas):
    """
    O Markdown está quebrado em ~80 colunas. Junta as continuações para que
    cada bloco lógico ocupe uma única linha — necessário para o **negrito**
    que atravessa a quebra não virar asterisco literal.
    """
    saida = []
    em_codigo = False

    for linha in linhas:
        limpa = linha.rstrip()

        if limpa.startswith("```"):
            em_codigo = not em_codigo
            saida.append(limpa)
            continue

        if em_codigo:
            saida.append(limpa)
            continue

        if not limpa.strip():
            saida.append("")
            continue

        novo_bloco = (
            limpa.startswith(("#", "|", ">"))
            or limpa.strip() == "---"
            or re.match(r"^\s*[-*] ", limpa)
            or re.match(r"^\s*\d+\. ", limpa)
        )

        anterior = saida[-1] if saida else ""

        if not novo_bloco and pode_continuar(anterior):
            saida[-1] = anterior + " " + limpa.strip()
        else:
            saida.append(limpa)

    return saida


def converter_markdown(documento, caminho, pular_titulo=True):
    linhas = juntar_linhas(caminho.read_text(encoding="utf-8").splitlines())

    em_codigo = False
    codigo = []
    tabela_atual = []
    pulou = False

    for linha in linhas:
        limpa = linha.rstrip()

        # --- blocos de código ---
        if limpa.startswith("```"):
            if em_codigo:
                bloco_codigo(documento, codigo)
                codigo = []
                em_codigo = False
            else:
                em_codigo = True
            continue

        if em_codigo:
            codigo.append(limpa)
            continue

        # --- tabelas ---
        if limpa.startswith("|"):
            tabela_atual.append(limpa)
            continue
        elif tabela_atual:
            tabela(documento, tabela_atual)
            tabela_atual = []

        if not limpa.strip():
            continue

        if limpa.strip() == "---":
            borda_inferior(documento.add_paragraph())
            continue

        # --- títulos ---
        if limpa.startswith("# "):
            if pular_titulo and not pulou:
                pulou = True
                continue
            documento.add_heading(limpa[2:].strip().replace("`", ""), level=1)

        elif limpa.startswith("## "):
            documento.add_heading(limpa[3:].strip().replace("`", ""), level=2)

        elif limpa.startswith("### "):
            documento.add_heading(limpa[4:].strip().replace("`", ""), level=3)

        # --- citação ---
        elif limpa.startswith(">"):
            texto = limpa.lstrip("> ").strip()
            paragrafo = documento.add_paragraph()
            paragrafo.paragraph_format.left_indent = Cm(0.6)
            paragrafo.paragraph_format.space_before = Pt(6)
            paragrafo.paragraph_format.space_after = Pt(8)
            escrever_inline(paragrafo, texto, italico=True, tamanho=10)
            borda_esquerda(paragrafo)

        # --- listas ---
        elif re.match(r"^\s*[-*] ", limpa):
            nivel = 2 if limpa.startswith("  ") else 1
            texto = re.sub(r"^\s*[-*] ", "", limpa)
            paragrafo = documento.add_paragraph(style=f"List Bullet {nivel}" if nivel > 1 else "List Bullet")
            paragrafo.paragraph_format.space_after = Pt(2)
            escrever_inline(paragrafo, texto)

        elif re.match(r"^\s*\d+\. ", limpa):
            # numeração preservada literalmente, como no documento original
            texto = limpa.strip()
            paragrafo = documento.add_paragraph()
            paragrafo.paragraph_format.left_indent = Cm(0.8)
            paragrafo.paragraph_format.first_line_indent = Cm(-0.45)
            paragrafo.paragraph_format.space_after = Pt(3)
            escrever_inline(paragrafo, texto)

        # --- parágrafo comum ---
        else:
            paragrafo = documento.add_paragraph()
            escrever_inline(paragrafo, limpa.strip())

    if em_codigo and codigo:
        bloco_codigo(documento, codigo)

    if tabela_atual:
        tabela(documento, tabela_atual)


def borda_esquerda(paragrafo):
    pPr = paragrafo._p.get_or_add_pPr()
    bordas = OxmlElement("w:pBdr")
    esquerda = OxmlElement("w:left")
    esquerda.set(qn("w:val"), "single")
    esquerda.set(qn("w:sz"), "18")
    esquerda.set(qn("w:space"), "8")
    esquerda.set(qn("w:color"), "C9A227")
    bordas.append(esquerda)
    pPr.append(bordas)


# ---------------------------------------------------------------- capa e rodapé

def numero_de_pagina(paragrafo):
    run = paragrafo.add_run()
    inicio = OxmlElement("w:fldChar")
    inicio.set(qn("w:fldCharType"), "begin")
    instrucao = OxmlElement("w:instrText")
    instrucao.set(qn("xml:space"), "preserve")
    instrucao.text = "PAGE"
    fim = OxmlElement("w:fldChar")
    fim.set(qn("w:fldCharType"), "end")
    run._r.append(inicio)
    run._r.append(instrucao)
    run._r.append(fim)


def capa(documento, data):
    for _ in range(4):
        documento.add_paragraph()

    titulo = documento.add_paragraph()
    titulo.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = titulo.add_run("Pesquisa de preços\nno PNCP")
    run.font.size = Pt(34)
    run.bold = True
    run.font.color.rgb = VERDE
    run.font.name = "Calibri"

    documento.add_paragraph()

    subtitulo = documento.add_paragraph()
    run = subtitulo.add_run("Documentação da demonstração\npara avaliação do setor de licitações e da equipe técnica")
    run.font.size = Pt(14)
    run.font.color.rgb = CINZA

    for _ in range(6):
        documento.add_paragraph()

    for rotulo, valor in [
        ("Versão", "1.0"),
        ("Data", data),
        ("Demonstração", "https://cezarj59.github.io/pncp-pesquisa/"),
        ("Situação", "Prova de conceito funcional, não homologada para produção"),
    ]:
        paragrafo = documento.add_paragraph()
        paragrafo.paragraph_format.space_after = Pt(4)

        run = paragrafo.add_run(f"{rotulo}: ")
        run.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = CINZA

        run = paragrafo.add_run(valor)
        run.font.size = Pt(10)

    documento.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def configurar(documento):
    secao = documento.sections[0]
    secao.page_width = Cm(21)
    secao.page_height = Cm(29.7)
    secao.left_margin = Cm(2.2)
    secao.right_margin = Cm(2.2)
    secao.top_margin = Cm(2.2)
    secao.bottom_margin = Cm(2.0)

    normal = documento.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = ESCURO
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15

    for nome, tamanho in [("Heading 1", 17), ("Heading 2", 13), ("Heading 3", 11.5)]:
        estilo = documento.styles[nome]
        estilo.font.name = "Calibri"
        estilo.font.size = Pt(tamanho)
        estilo.font.bold = True
        estilo.font.color.rgb = VERDE if nome != "Heading 3" else RGBColor(0x33, 0x33, 0x33)
        estilo.paragraph_format.space_before = Pt(16 if nome == "Heading 1" else 12)
        estilo.paragraph_format.space_after = Pt(6)
        estilo.paragraph_format.keep_with_next = True

    rodape = secao.footer.paragraphs[0]
    rodape.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    run = rodape.add_run("Pesquisa de preços no PNCP — demonstração   ·   página ")
    run.font.size = Pt(8)
    run.font.color.rgb = CINZA

    numero_de_pagina(rodape)
    for run in rodape.runs:
        run.font.size = Pt(8)
        run.font.color.rgb = CINZA


def principal():
    documento = Document()
    configurar(documento)

    capa(documento, "18 de novembro de 2026")

    documento.add_heading("Parte 1 · Apresentação", level=1)
    converter_markdown(documento, RAIZ / "01-apresentacao.md")

    documento.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    documento.add_heading("Parte 2 · Documentação técnica", level=1)
    converter_markdown(documento, RAIZ / "02-documentacao-tecnica.md")

    documento.save(SAIDA)
    print(f"gerado: {SAIDA}")


if __name__ == "__main__":
    principal()
