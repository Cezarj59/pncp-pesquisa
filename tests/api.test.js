/**
 * Testes do cliente da API (js/api.js).
 * Uso: node tests/api.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

let chamadas = [];
let proximaResposta = () => [];

globalThis.fetch = async url => {
    chamadas.push(url);
    return { status: 200, ok: true, json: async () => proximaResposta(url) };
};

eval(fs.readFileSync(path.join(RAIZ, 'js/api.js'), 'utf8') + '\n;globalThis.PNCP = PNCP;');

let falhas = 0;

function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

(async () => {
    console.log('cliente da API');

    // --- conversão de item_url em caminho de API ---
    checar('compra',
        PNCP.apiPath('/compras/76105634000170/2026/44') === '/orgaos/76105634000170/compras/2026/44');

    checar('ata',
        PNCP.apiPath('/atas/75475038000110/2026/15/1') === '/orgaos/75475038000110/compras/2026/15/atas/1');

    checar('contrato',
        PNCP.apiPath('/contratos/76105634000170/2026/7') === '/orgaos/76105634000170/contratos/2026/7');

    checar('valor inválido devolve null', PNCP.apiPath('/outro/1') === null);

    // --- links para o portal ---
    checar('link de compra usa /app/editais',
        PNCP.linkPortal('/compras/123/2026/1') === 'https://pncp.gov.br/app/editais/123/2026/1');

    checar('link de ata',
        PNCP.linkPortal('/atas/123/2026/15/1') === 'https://pncp.gov.br/app/atas/123/2026/15/1');

    checar('link de contrato',
        PNCP.linkPortal('/contratos/123/2026/7') === 'https://pncp.gov.br/app/contratos/123/2026/7');

    // --- paginação completa: 50 na primeira, 10 na segunda ---
    chamadas = [];
    proximaResposta = url => {
        const m = url.match(/pagina=(\d+)/);
        const pagina = m ? Number(m[1]) : 1;
        const quantidade = pagina === 1 ? 50 : 10;
        return Array.from({ length: quantidade }, (_, i) => ({ numeroItem: i + 1 }));
    };

    const lista = await PNCP.itens('/compras/123/2026/1');
    checar('soma as duas páginas', lista.length === 60, `(${lista.length})`);
    checar('para quando a página vem incompleta', chamadas.length === 2, `(${chamadas.length})`);

    // --- busca: status vai para a URL quando informado ---
    chamadas = [];
    proximaResposta = () => ({ total: 1, items: [] });

    await PNCP.buscar({ termo: 'merenda', tipo: 'edital', status: 'encerradas' });
    checar('status na URL', chamadas[0].includes('status=encerradas'));

    await PNCP.buscar({ termo: 'merenda', tipo: 'edital' });
    checar('sem status não inclui o parâmetro', !chamadas[1].includes('status='));

    console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
    process.exit(falhas ? 1 : 0);
})();
