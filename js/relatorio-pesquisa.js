/* ====== Página do relatório de pesquisa de preços ====== */

const RelatorioPesquisa = (() => {

    const ROTULO_TIPO = {
        edital: 'Editais (contratações publicadas)',
        ata: 'Atas de registro de preços',
        contrato: 'Contratos',
        coleta: 'Coleta de preços (itens selecionados)'
    };

    /* ---------- cálculos ---------- */

    function estatisticas(valores) {
        const lista = valores
            .filter(v => Number.isFinite(v) && v > 0)
            .sort((a, b) => a - b);

        if (!lista.length) return null;

        const soma = lista.reduce((total, v) => total + v, 0);
        const meio = Math.floor(lista.length / 2);

        const mediana = lista.length % 2
            ? lista[meio]
            : (lista[meio - 1] + lista[meio]) / 2;

        return {
            quantidade: lista.length,
            media: soma / lista.length,
            mediana,
            minimo: lista[0],
            maximo: lista[lista.length - 1]
        };
    }

    /* ---------- formatação ---------- */

    function moeda(valor) {
        if (!Number.isFinite(valor)) return '—';
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function data(valor) {
        if (!valor) return '—';
        const d = new Date(valor);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    function dataHora(valor) {
        const d = valor ? new Date(valor) : new Date();
        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    /* ---------- montagem ---------- */

    function montar(dados) {
        const estat = estatisticas(dados.itens.map(i => i.valorReferencia));

        const linhas = dados.itens.map((item, indice) => `
            <tr>
                <td class="num">${indice + 1}</td>
                <td>${escapar(item.objeto).slice(0, 300)}${
                    item.fornecedor ? `<br><span class="mudo">${escapar(item.fornecedor)}</span>` : ''
                }</td>
                <td>${escapar(item.orgao)}<br><span class="mudo">${escapar(item.municipio)}</span></td>
                <td class="centro">${escapar(item.uf)}</td>
                <td class="centro">${data(item.data)}</td>
                <td class="num">${item.quantidade ?? '—'} ${escapar(item.unidade || '')}</td>
                <td class="num">${moeda(item.valorEstimado)}</td>
                <td class="num">${moeda(item.valorHomologado)}</td>
                <td class="centro">${item.link
                    ? `<a href="${escapar(item.link)}" target="_blank" rel="noopener">PNCP</a>`
                    : '—'}</td>
            </tr>`).join('');

        const resumo = estat ? `
            <table class="valores">
                <tr><th>Itens na coleta</th><td>${dados.itens.length}</td></tr>
                <tr><th>Itens com valor publicado</th><td>${estat.quantidade}</td></tr>
                <tr><th>Menor valor unitário</th><td>${moeda(estat.minimo)}</td></tr>
                <tr><th>Mediana dos valores unitários</th><td><strong>${moeda(estat.mediana)}</strong></td></tr>
                <tr><th>Média dos valores unitários</th><td>${moeda(estat.media)}</td></tr>
                <tr><th>Maior valor unitário</th><td>${moeda(estat.maximo)}</td></tr>
            </table>` : `
            <p class="mudo">Nenhum item da seleção tem valor publicado — não há
            estatística a calcular. Os valores podem estar sob sigilo (art. 24 da
            Lei 14.133/2021) ou o resultado ainda não ter sido divulgado.</p>`;

        return `
            <header class="cabecalho">
                <h1>Relatório de pesquisa de preços</h1>
                <p class="sub">Consulta ao Portal Nacional de Contratações Públicas (PNCP)</p>
            </header>

            <section>
                <h2>1. Identificação</h2>
                <table class="identificacao">
                    <tr><th>Tipo de consulta</th><td>${escapar(ROTULO_TIPO[dados.tipo] || dados.tipo)}</td></tr>
                    ${dados.termo ? `<tr><th>Termo pesquisado</th><td>${escapar(dados.termo)}</td></tr>` : ''}
                    <tr><th>Data e hora</th><td>${dataHora(dados.geradoEm)}</td></tr>
                    <tr><th>${dados.tipo === 'coleta' ? 'Itens na coleta' : 'Registros selecionados'}</th><td>${dados.selecionados ?? dados.itens.length}${
                        dados.encontrados && dados.encontrados !== dados.selecionados
                            ? ` de ${dados.encontrados} encontrados` : ''
                    }</td></tr>
                    <tr><th>Fonte</th><td>pncp.gov.br — dados públicos</td></tr>
                </table>
            </section>

            <section>
                <h2>2. Filtros utilizados</h2>
                <ul class="filtros">
                    ${dados.filtros.map(f => `<li>${escapar(f)}</li>`).join('')}
                </ul>
            </section>

            <section>
                <h2>3. Resumo dos valores</h2>
                ${resumo}
            </section>

            <section>
                <h2>4. Coleta de preços</h2>
                <table class="coleta">
                    <thead>
                        <tr>
                            <th>#</th><th>Item</th><th>Órgão</th><th>UF</th>
                            <th>Data</th><th>Qtd.</th>
                            <th>Unit. estimado</th><th>Unit. homologado</th><th>Fonte</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>
            </section>

            <section>
                <h2>5. Metodologia e valor de referência</h2>
                <p>Metodologia adotada (assinalar):</p>
                <ul class="metodologia">
                    <li>☐ Média aritmética dos valores</li>
                    <li>☐ Mediana dos valores</li>
                    <li>☐ Menor preço</li>
                    <li>☐ Outro: ______________________________________</li>
                </ul>
                <p class="linha-preenchimento">Valor de referência adotado: R$ ______________________</p>
                <p>Justificativa da escolha:</p>
                <div class="pauta"></div>
            </section>

            <section class="observacao">
                <h2>6. Observações</h2>
                ${dados.itens.length < 3 ? `
                <p class="alerta"><strong>Atenção:</strong> a coleta reúne
                ${dados.itens.length} registro(s). A maioria dos processos exige
                pelo menos três preços para a pesquisa.</p>` : ''}
                <p>Os registros acima correspondem ao que o PNCP retornou no momento da
                consulta, dentro dos filtros informados. Não representam a totalidade
                das contratações do período. Cada linha indica o endereço do registro
                de origem, para conferência.</p>
            </section>

            <div class="assinatura">
                <p>Local e data: ______________________________, ______/______/________</p>
                <p>Responsável pela pesquisa: _______________________________________</p>
            </div>

            <div class="acoes nao-imprimir">
                <button onclick="window.print()">Imprimir ou salvar em PDF</button>
                <a class="link" href="javascript:window.close()">Fechar</a>
            </div>`;
    }

    /* ---------- carga ---------- */

    function carregar() {
        const folha = document.getElementById('folha');
        if (!folha) return;

        let dados;

        try {
            const bruto = sessionStorage.getItem('pncp:relatorio');
            dados = bruto ? JSON.parse(bruto) : null;
        } catch (_) {
            dados = null;
        }

        if (!dados || !Array.isArray(dados.itens) || !dados.itens.length) {
            folha.innerHTML = `<div class="aviso">
                <strong>Nenhuma pesquisa para relatar.</strong><br>
                Volte à lista de resultados, faça uma busca e use
                <em>Gerar relatório</em>.
            </div>`;
            return;
        }

        folha.innerHTML = montar(dados);
    }

    return { estatisticas, montar, carregar };

})();

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => RelatorioPesquisa.carregar());
}
