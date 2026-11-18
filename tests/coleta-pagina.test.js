/**
 * Testes da página das coletas (js/coleta-pagina.js).
 * Uso: node tests/coleta-pagina.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

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
    querySelectorAll: () => []
};

const armazem = new Map();
globalThis.localStorage = {
    getItem: k => (armazem.has(k) ? armazem.get(k) : null),
    setItem: (k, v) => armazem.set(k, v),
    removeItem: k => armazem.delete(k)
};

const sessao = new Map();
globalThis.sessionStorage = {
    getItem: k => (sessao.has(k) ? sessao.get(k) : null),
    setItem: (k, v) => sessao.set(k, v),
    removeItem: k => sessao.delete(k)
};

globalThis.window = { open: () => ({}) };
globalThis.alert = () => {};
globalThis.confirm = () => true;
globalThis.prompt = () => null;

eval(fs.readFileSync(path.join(RAIZ, 'js/coleta.js'), 'utf8') + '\n;globalThis.Coleta = Coleta;');
eval(fs.readFileSync(path.join(RAIZ, 'js/coleta-pagina.js'), 'utf8')
    + '\n;globalThis.__renderizar = renderizar;'
    + '\n;globalThis.__gerarRelatorio = gerarRelatorio;'
    + '\n;globalThis.__removerItem = removerItem;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

function item(numero, url) {
    return {
        itemUrl: url, numeroItem: numero, descricao: `Item ${numero}`,
        quantidade: 10, unidade: 'UN', valorEstimado: 100, valorHomologado: 90,
        fornecedor: 'Fornecedor A', orgao: 'Prefeitura de Colombo',
        municipio: 'Colombo', uf: 'PR', data: '2026-11-01', link: 'https://pncp.gov.br/x'
    };
}

console.log('página das coletas\n');

/* ---------- estado vazio ---------- */

__renderizar();
checar('sem coletas mostra orientação',
    el('lista').innerHTML.includes('Nenhuma coleta ainda'));

/* ---------- duas coletas ---------- */

const primeira = Coleta.criar('Merenda 2027');
Coleta.adicionar(item(1, '/compras/1/2026/1'));
Coleta.adicionar(item(2, '/compras/2/2026/2'));
Coleta.adicionar(item(3, '/compras/3/2026/3'));

const segunda = Coleta.criar('Limpeza 2027');
Coleta.adicionar(item(4, '/compras/4/2026/4'));

Coleta.definirAtiva(segunda.id);
__renderizar();

const html = el('lista').innerHTML;

checar('mostra as duas coletas', (html.match(/<details/g) || []).length === 2,
    `(${(html.match(/<details/g) || []).length})`);
checar('mostra o nome da primeira', html.includes('Merenda 2027'));
checar('mostra o nome da segunda', html.includes('Limpeza 2027'));
checar('marca a coleta ativa', html.includes('coleta ativa'));
checar('resumo geral com totais',
    el('resumo-geral').textContent === '2 coletas · 4 itens',
    el('resumo-geral').textContent);

/* ---------- estado dos botões por coleta ---------- */

const blocoPrimeira = html.split('Merenda 2027')[1].split('<details')[0];
const blocoSegunda = html.split('Limpeza 2027')[1].split('<details')[0];

checar('coleta com 3 itens libera relatório',
    !blocoPrimeira.split('data-acao="relatorio"')[1].startsWith(' disabled'));
checar('coleta com 1 item bloqueia relatório',
    blocoSegunda.split('data-acao="relatorio"')[1].includes('disabled'));

checar('coleta com 1 item avisa quanto falta', blocoSegunda.includes('Faltam 2'));
checar('coleta com 3 itens não avisa', !blocoPrimeira.includes('Faltam'));

checar('coleta não ativa oferece "Usar esta"', blocoPrimeira.includes('data-acao="usar"'));
checar('coleta ativa não oferece "Usar esta"', !blocoSegunda.includes('data-acao="usar"'));

/* ---------- ações ---------- */

console.log('\nações');

const chave = Coleta.listar().find(c => c.id === segunda.id).itens[0].chave;
__removerItem(segunda.id, chave);
checar('remove item da coleta',
    Coleta.listar().find(c => c.id === segunda.id).itens.length === 0);

// relatório exige o mínimo
sessao.clear();
__gerarRelatorio(segunda.id);
checar('não gera relatório com menos de 3', !sessao.has('pncp:relatorio'));
checar('não encerra a coleta', Coleta.deveNovaColeta() === false);

__gerarRelatorio(primeira.id);
checar('gera relatório com 3 itens', sessao.has('pncp:relatorio'));

const payload = JSON.parse(sessao.get('pncp:relatorio'));
checar('payload tem os 3 itens', payload.itens.length === 3);
checar('payload identifica a coleta', payload.tipo === 'coleta', payload.tipo);
checar('payload traz o nome da coleta', payload.termo === 'Merenda 2027', payload.termo);
checar('payload traz os dois valores',
    payload.itens[0].valorEstimado === 100 && payload.itens[0].valorHomologado === 90);

checar('encerra a coleta depois do relatório', Coleta.deveNovaColeta() === true);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
