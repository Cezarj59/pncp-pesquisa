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

globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = { location: { search: '' } };

let naCesta = false;
globalThis.Cesta = {
    contem: () => naCesta,
    adicionar: () => ({ ok: true }),
    total: () => (naCesta ? 1 : 0),
    MINIMO: 3
};

globalThis.PNCP = {
    apiPath: () => '/orgaos/1/compras/2026/2',
    linkPortal: () => 'https://pncp.gov.br/app/editais/1/2026/2',
    detalhe: async () => ({}),
    resultados: async () => []
};

eval(fs.readFileSync(path.join(RAIZ, 'js/detalhe.js'), 'utf8')
    + '\n;globalThis.__renderItens = renderItens;'
    + '\n;globalThis.__definirContexto = definirContexto;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('itens do detalhe');

const itens = [
    { numeroItem: 1, descricao: 'Merenda escolar', quantidade: 10, unidadeMedida: 'CX',
      valorUnitarioEstimado: 100, orcamentoSigiloso: false, temResultado: true },
    { numeroItem: 2, descricao: 'Material de limpeza', quantidade: 5, unidadeMedida: 'UN',
      valorUnitarioEstimado: 40, orcamentoSigiloso: false, temResultado: false },
    { numeroItem: 3, descricao: 'Item sigiloso', quantidade: 1, unidadeMedida: 'UN',
      valorUnitarioEstimado: 0, orcamentoSigiloso: true, temResultado: false }
];

__renderItens(itens, '/compras/1/2026/2');
const html = el('itens').innerHTML;

checar('tem coluna de estimado', html.includes('Unit. estimado'));
checar('tem coluna de homologado', html.includes('Unit. homologado'));
checar('marca a célula do homologado', html.includes('data-homologado="1"'));
checar('mostra os dois preços quando existem',
    html.includes('100,00') && html.includes('40,00'));
checar('botão Adicionar presente', html.includes('data-adicionar="1"'));
checar('botão Preços no item com resultado', html.includes('data-precos="1"'));
checar('item sem resultado não tem Preços',
    (html.match(/data-precos="1"/g) || []).length === 1);
checar('item sigiloso não pode ser adicionado',
    html.includes('data-item="3"') && html.split('data-item="3"')[1].includes('disabled'));

// item já na cesta
naCesta = true;
__renderItens(itens, '/compras/1/2026/2');
checar('item na cesta mostra "Na cesta"', el('itens').innerHTML.includes('Na cesta'));

// contexto para o registro da cesta
__definirContexto({ orgao_nome: 'Prefeitura de Colombo', municipio_nome: 'Colombo',
                    uf: 'PR', data_publicacao_pncp: '2026-11-01' });
checar('contexto definido', el('itens').innerHTML.length > 0);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
