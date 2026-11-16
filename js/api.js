/* ====== Cliente da API do PNCP (executa no navegador) ====== */

const PNCP = (() => {

    const BASE_BUSCA = 'https://pncp.gov.br/api/search/';
    const BASE_API   = 'https://pncp.gov.br/api/pncp/v1';
    const BASE_CONSULTA = 'https://pncp.gov.br/api/consulta/v1';
    const BASE_APP   = 'https://pncp.gov.br/app';

    const TENTATIVAS = 3;
    const ESPERA = 1200;

    function dormir(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /**
     * O PNCP às vezes move um endpoint e responde 301 com a nova rota
     * dentro do campo `message`. Aqui a nova rota é extraída e seguida
     * uma única vez, mantendo o mesmo host.
     */
    async function seguirMudancaDeRota(resposta) {
        try {
            const corpo = await resposta.clone().json();
            const achado = String(corpo && corpo.message || '').match(/https?:\/\/[^\s",]+/);

            if (!achado) return null;

            const destino = new URL(achado[0]);
            return `${destino.origin.replace(/:\d+$/, '')}${destino.pathname}${destino.search}`;

        } catch (_) {
            return null;
        }
    }

    async function buscarJson(url, tentativas = TENTATIVAS, podeSegirRota = true) {
        let ultimoErro = null;

        for (let i = 0; i < tentativas; i++) {
            try {
                const resposta = await fetch(url, { headers: { 'Accept': 'application/json' } });

                if (resposta.status === 204) return null;

                if (resposta.status === 301 || resposta.status === 302 || resposta.status === 308) {
                    if (podeSegirRota) {
                        const novaRota = await seguirMudancaDeRota(resposta);
                        if (novaRota) {
                            return buscarJson(novaRota, tentativas, false);
                        }
                    }

                    // Segunda tentativa: troca a base antiga pela nova
                    if (url.includes('/api/pncp/')) {
                        const alternativa = url.replace('/api/pncp/', '/api/consulta/');
                        return buscarJson(alternativa, tentativas, false);
                    }

                    throw new Error('endpoint movido pelo PNCP');
                }

                if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

                return await resposta.json();

            } catch (erro) {
                ultimoErro = erro;
                if (i < tentativas - 1) await dormir(ESPERA * (i + 1));
            }
        }

        throw ultimoErro;
    }

    /** Busca textual por tipo de documento (edital, ata, contrato). */
    async function buscar({ termo, tipo = 'edital', pagina = 1, tamPagina = 50 }) {
        const params = new URLSearchParams({
            q: termo || '',
            tipos_documento: tipo,
            pagina: String(pagina),
            tam_pagina: String(tamPagina),
            ordenacao: '-data'
        });

        return buscarJson(`${BASE_BUSCA}?${params.toString()}`);
    }

    /**
     * Converte o item_url do portal no caminho da API.
     *   /compras/{cnpj}/{ano}/{seq}              -> /orgaos/{cnpj}/compras/{ano}/{seq}
     *   /atas/{cnpj}/{ano}/{seqCompra}/{seqAta}  -> /orgaos/{cnpj}/compras/{ano}/{seqCompra}/atas/{seqAta}
     *   /contratos/{cnpj}/{ano}/{seq}            -> /orgaos/{cnpj}/contratos/{ano}/{seq}
     */
    function apiPath(itemUrl) {
        if (!itemUrl) return null;

        const p = itemUrl.split('/').filter(Boolean);
        const [tipo, cnpj, ano, a, b] = p;

        if (!cnpj || !ano) return null;

        if (tipo === 'compras') return `/orgaos/${cnpj}/compras/${ano}/${a}`;
        if (tipo === 'atas')    return `/orgaos/${cnpj}/compras/${ano}/${a}/atas/${b}`;
        if (tipo === 'contratos') return `/orgaos/${cnpj}/contratos/${ano}/${a}`;

        return null;
    }

    function linkPortal(itemUrl) {
        return itemUrl ? `${BASE_APP}${itemUrl}` : null;
    }

    async function detalhe(itemUrl) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return null;

        // O detalhe da contratação passou a responder em /api/consulta.
        try {
            return await buscarJson(`${BASE_CONSULTA}${caminho}`, 2, false);
        } catch (_) {
            return buscarJson(`${BASE_API}${caminho}`);
        }
    }

    async function arquivos(itemUrl) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return [];
        const dados = await buscarJson(`${BASE_API}${caminho}/arquivos?pagina=1&tamanhoPagina=50`);
        if (!dados) return [];
        return Array.isArray(dados) ? dados : (dados.data || dados.resultado || []);
    }

    /** Itens de uma contratação (só existe para /compras). */
    async function itens(itemUrl) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return [];
        const dados = await buscarJson(`${BASE_API}${caminho}/itens?pagina=1&tamanhoPagina=50`);
        if (!dados) return [];
        return Array.isArray(dados) ? dados : (dados.data || dados.resultado || []);
    }

    /** Preços homologados de um item. */
    async function resultados(itemUrl, numeroItem) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return [];
        const dados = await buscarJson(`${BASE_API}${caminho}/itens/${numeroItem}/resultados`);
        if (!dados) return [];
        return Array.isArray(dados) ? dados : (dados.data || dados.resultado || []);
    }

    /** Termos e empenhos de um contrato. */
    async function termos(itemUrl) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return [];
        const dados = await buscarJson(`${BASE_API}${caminho}/termos?pagina=1&tamanhoPagina=50`);
        if (!dados) return [];
        return Array.isArray(dados) ? dados : (dados.data || dados.resultado || []);
    }

    async function empenhos(itemUrl) {
        const caminho = apiPath(itemUrl);
        if (!caminho) return [];
        const dados = await buscarJson(`${BASE_API}${caminho}/empenhos?pagina=1&tamanhoPagina=50`);
        if (!dados) return [];
        return Array.isArray(dados) ? dados : (dados.data || dados.resultado || []);
    }

    return {
        buscar, detalhe, arquivos, itens, resultados, termos, empenhos,
        apiPath, linkPortal
    };

})();
