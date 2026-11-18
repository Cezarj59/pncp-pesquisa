/* ====== Exportação de resultados ====== */

const Relatorio = (() => {

    /** Escapa um campo para CSV (aspas, ponto e vírgula e quebras de linha). */
    function campo(valor) {
        const texto = String(valor ?? '').replace(/"/g, '""');
        return `"${texto}"`;
    }

    /**
     * Gera e baixa um CSV compatível com Excel em português:
     * separador ponto e vírgula e BOM UTF-8 para os acentos.
     */
    function baixarCsv(nomeArquivo, cabecalhos, linhas) {
        const conteudo = [cabecalhos, ...linhas]
            .map(linha => linha.map(campo).join(';'))
            .join('\r\n');

        const blob = new Blob(['\uFEFF' + conteudo], {
            type: 'text/csv;charset=utf-8;'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libera a memória do blob
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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

    return { baixarCsv, nomeArquivo };

})();
