/**
 * Testes da página de detalhe: cache e nova tentativa.
 * Uso: node tests/detalhe.test.js
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
            hidden: true,
            style: {},
            dataset: {},
            addEventListener: () => {},
            remove: () => {},
            classList: { add: () => {}, remove: () => {}, toggle: () => {} }
        };
    }
    return elementos[id];
}

globalThis.document = {
    getElementById: el,
    addEventListener: () => {},
    querySelectorAll: () => []
};

const armazem = new Map();
globalThis.sessionStorage = {
    getItem: k => (armazem.has(k) ? armazem.get(k) : null),
    setItem: (k, v) => armazem.set(k, v),
    removeItem: k => armazem.delete(k)
};

/* ---------- PNCP simulado ---------- */

let chamadas = 0;
let comportamento = 'falha';

globalThis.PNCP = {
    apiPath: () => '/orgaos/1/compras/2026/2',
    linkPortal: () => 'https://pncp.gov.br/app/editais/1/2026/2',
    detalhe: async () => {
        chamadas++;
        if (comportamento === 'falha') throw new Error('HTTP 429');
        return { objetoCompra: 'Merenda escolar', valorTotalEstimado: 1000 };
    }
};

eval(fs.readFileSync(path.join(RAIZ, 'js/detalhe.js'), 'utf8')
    + '\n;globalThis.__carregarDados = carregarDados;'
    + '\n;globalThis.__setUrl = u => { itemUrlAtual = u; };');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

(async () => {
    console.log('detalhe');

    __setUrl('/compras/1/2026/2');

    // 1. falha: mensagem clara e botão de nova tentativa
    await __carregarDados();

    const aviso = el('status').innerHTML;
    checar('explica o limite', aviso.includes('limitou as consultas'));
    checar('oferece nova tentativa', aviso.includes('Tentar novamente'));
    checar('uma chamada até aqui', chamadas === 1, `(${chamadas})`);

    // 2. usuário tenta de novo e dá certo
    comportamento = 'ok';
    await __carregarDados();

    checar('renderiza os dados', el('dados').innerHTML.includes('Objeto'));
    checar('limpa o aviso', el('status').innerHTML === '');
    checar('segunda chamada feita', chamadas === 2, `(${chamadas})`);

    // 3. terceira abertura usa cache, sem nova requisição
    el('dados').innerHTML = '';
    await __carregarDados();

    checar('cache evita nova chamada', chamadas === 2, `(${chamadas})`);
    checar('cache renderiza os dados', el('dados').innerHTML.includes('Objeto'));

    console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
    process.exit(falhas ? 1 : 0);
})();
