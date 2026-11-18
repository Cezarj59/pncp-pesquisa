/**
 * Testes da tabela de itens no detalhe: preço estimado x homologado e cesta.
 * Uso: node tests/itens.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/* ---------- DOM mínimo ---------- */

const elementos = {};
function el(id) {
    if (!elementos[id]) {
        elementos[id] = {
            id,
            innerHTML: '',
            textContent: '',
            disabled: false,
            style: {},
            dataset: {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {} },
            addEventListener: () => {},
            querySelectorAll: () => []
        };
    }
    return elementos[id];
}

globalThis.document = {
    getElementById: el,
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
};

const sessao = new Map();
globalThis.sessionStorage = {
    getItem: k => (sessao.has(k) ? sessao.get(k) : null),
    setItem: (k, v) => sessao.set(k, v),
    removeItem: k => sessao.delete(k)
};
globalThis.window = { location: { search: '' } };

let naCesta = false;
globalThis.Cesta = {
    contem: () => naCesta,
    adicionar: () => ({ ok: true }),
    total: () => (naCesta ? 1 : 0),
    MINIMO: 3
};

let chamadasResultados = 0;
let respostaResultados = [];

globalThis.PNCP = {
    apiPath: () => '/orgaos/1/compras/2026/2',
    linkPortal: () => 'https://pncp.gov.br/app/editais/1/2026/2',
    detalhe: async () => ({}),
    resultados: async () => {
        chamadasResultados++;
        return respostaResultados;
    }
};

eval(fs.readFileSync(path.join(RAIZ, 'js/detalhe.js'), 'utf8')
    + '\n;globalThis.__renderItens = renderItens;'
    + '\n;globalThis.__definirContexto = definirContexto;'
    + '\n;globalThis.__precos = precosPorItem;'
    + '\n;globalThis.__carregarPrecos = carregarPrecos;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

const itens = [
    { numeroItem: 1, descricao: 'Merenda escolar', quantidade: 10, unidadeMedida: 'CX',
      valorUnitarioEstimado: 100, orcamentoSigiloso: false, temResultado: true },
    { numeroItem: 2, descricao: 'Material de limpeza', quantidade: 5, unidadeMedida: 'UN',
      valorUnitarioEstimado: 40, orcamentoSigiloso: false, temResultado: false },
    { numeroItem: 3, descricao: 'Item sigiloso', quantidade: 1, unidadeMedida: 'UN',
      valorUnitarioEstimado: 0, orcamentoSigiloso: true, temResultado: false }
];

(async () => {
    console.log('itens do detalhe\n');
    console.log('tabela');

    __renderItens(itens, '/compras/1/2026/2');
    const html = el('itens').innerHTML;

    checar('tem coluna de estimado', html.includes('Unit. estimado'));
    checar('tem coluna de homologado', html.includes('Unit. homologado'));
    checar('marca a célula do homologado', html.includes('data-homologado="1"'));
    checar('mostra os preços', html.includes('100,00') && html.includes('40,00'));
    checar('botão Adicionar presente', html.includes('data-adicionar="1"'));
    checar('botão Preços no item com resultado', html.includes('data-precos="1"'));
    checar('item sem resultado não tem Preços',
        (html.match(/data-precos="1"/g) || []).length === 1);
    checar('item sigiloso não pode ser adicionado',
        html.includes('data-item="3"') && html.split('data-item="3"')[1].includes('disabled'));

    naCesta = true;
    __renderItens(itens, '/compras/1/2026/2');
    checar('item na cesta mostra "Na cesta"', el('itens').innerHTML.includes('Na cesta'));
    naCesta = false;

    __definirContexto({ orgao_nome: 'Prefeitura de Colombo', municipio_nome: 'Colombo',
                        uf: 'PR', data_publicacao_pncp: '2026-11-01' });
    checar('contexto definido', el('itens').innerHTML.length > 0);

    /* ---------- menor homologado entre fornecedores ---------- */

    console.log('\npreço homologado');

    respostaResultados = [
        { nomeRazaoSocialFornecedor: 'Fornecedor A', valorUnitarioHomologado: 120 },
        { nomeRazaoSocialFornecedor: 'Fornecedor B', valorUnitarioHomologado: 95.5 },
        { nomeRazaoSocialFornecedor: 'Fornecedor C', valorUnitarioHomologado: 140 }
    ];

    const registro = await __carregarPrecos('/compras/1/2026/2', 1);

    checar('pega o menor valor', registro.valor === 95.5, `(${registro.valor})`);
    checar('guarda o fornecedor do menor', registro.fornecedor === 'Fornecedor B', registro.fornecedor);
    checar('conta os fornecedores', registro.fornecedores === 3, `(${registro.fornecedores})`);
    checar('uma requisição', chamadasResultados === 1, `(${chamadasResultados})`);

    await __carregarPrecos('/compras/1/2026/2', 1);
    checar('não repete a requisição', chamadasResultados === 1, `(${chamadasResultados})`);

    __renderItens(itens, '/compras/1/2026/2');
    checar('coluna avisa quando há vários fornecedores',
        el('itens').innerHTML.includes('3 fornecedores'));

    // cache em sessionStorage: recarregar a página não rebusca
    __precos.clear();
    sessao.set('pncp:item:/compras/1/2026/2#1', JSON.stringify({
        quando: Date.now(), resultados: respostaResultados
    }));

    const doCache = await __carregarPrecos('/compras/1/2026/2', 1);
    checar('usa o cache entre recarregamentos', chamadasResultados === 1, `(${chamadasResultados})`);
    checar('cache devolve o mesmo valor', doCache.valor === 95.5);

    console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
    process.exit(falhas ? 1 : 0);
})();
