/* ====== Exportação de resultados ====== */

const Relatorio = (() => {

    /** Escapa um campo para CSV (aspas, ponto e vírgula e quebras de linha). */
    function campo(valor) {
        const texto = String(valor ?? '').replace(/"/g, '""');
        return `"${texto}"`;
    }

    /**
     * Gera e baixa um arquivo de texto qualquer.
     */
    function baixarArquivo(nomeArquivo, tipoConteudo, conteudo) {
        const blob = new Blob([conteudo], { type: tipoConteudo });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Gera e baixa um CSV compatível com Excel em português:
     * separador ponto e vírgula e BOM UTF-8 para os acentos.
     */
    function baixarCsv(nomeArquivo, cabecalhos, linhas) {
        const conteudo = [cabecalhos, ...linhas]
            .map(linha => linha.map(campo).join(';'))
            .join('\r\n');

        baixarArquivo(nomeArquivo, 'text/csv;charset=utf-8;', '\uFEFF' + conteudo);
    }

    function nomeArquivo(tipo, termo) {
        const data = new Date().toISOString().slice(0, 10);
        const limpo = (termo || 'pesquisa')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase()
            .slice(0, 40);

        return `pncp-${tipo}-${limpo}-${data}.csv`;
    }

    return { baixarArquivo, baixarCsv, nomeArquivo };

})();
