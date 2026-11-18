/**
 * Testes da página da cesta (js/cesta-pagina.js).
 * Uso: node tests/cesta-pagina.test.js
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
    querySelectorAll: () => [],
    createElement: () => ({ click: () => {}, style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
};

const armazem = new Map();
globalThis.localStorage = {
    getItem: k => (armazem.has(k) ? armazem.get(k) : null),
    setItem: (k, v) => armazem.set(k, v),
    removeItem: k => armazem.delete(k)
};
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
globalThis.Blob = class {};

const itens = [
    { chave: '/compras/1/2026/1#1', itemUrl: '/compras/1/2026/1', numeroItem: 1, tipo: 'edital',
      descricao: 'Merenda escolar', quantidade: 10, unidade: 'CX',
      valorEstimado: 100, valorHomologado: 90, fornecedor: 'Fornecedor A',
      orgao: 'Prefeitura de Colombo', municipio: 'Colombo', uf: 'PR',
      data: '2026-11-01', link: 'https://pncp.gov.br/app/editais/1/2026/1' },
    { chave: '/compras/2/2026/2#3', itemUrl: '/compras/2/2026/2', numeroItem: 3, tipo: 'edital',
      descricao: 'Gêneros alimentícios', quantidade: 5, unidade: 'UN',
      valorEstimado: 200, valorHomologado: 180, fornecedor: 'Fornecedor B',
      orgao: 'Prefeitura de Curitiba', municipio: 'Curitiba', uf: 'PR',
      data: '2026-11-02', link: 'https://pncp.gov.br/app/editais/2/2026/2' },
    { chave: '/compras/3/2026/3#7', itemUrl: '/compras/3/2026/3', numeroItem: 7, tipo: 'edital',
      descricao: 'Material de limpeza', quantidade: 2, unidade: 'CX',
      valorEstimado: 300, valorHomologado: 300, fornecedor: 'Fornecedor C',
      orgao: 'Prefeitura de Pinhais', municipio: 'Pinhais', uf: 'PR',
      data: '2026-11-03', link: 'https://pncp.gov.br/app/editais/3/2026/3' }
];

armazem.set('pncp:cesta', JSON.stringify(itens));

eval(fs.readFileSync(path.join(RAIZ, 'js/relatorio.js'), 'utf8') + '\n;globalThis.Relatorio = Relatorio;');
eval(fs.readFileSync(path.join(RAIZ, 'js/relatorio-pesquisa.js'), 'utf8') + '\n;globalThis.RelatorioPesquisa = RelatorioPesquisa;');
eval(fs.readFileSync(path.join(RAIZ, 'js/cesta.js'), 'utf8') + '\n;globalThis.Cesta = Cesta;');
eval(fs.readFileSync(path.join(RAIZ, 'js/cesta-pagina.js'), 'utf8')
    + '\n;globalThis.__atualizar = atualizar;'
    + '\n;globalThis.__abrirRelatorio = abrirRelatorio;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('página da cesta');

__atualizar();

const lista = el('lista').innerHTML;
checar('lista os itens', (lista.match(/data-remover=/g) || []).length === 3);
checar('mostra a descrição', lista.includes('Merenda escolar'));
checar('mostra o órgão', lista.includes('Prefeitura de Colombo'));
checar('mostra os dois preços', lista.includes('100,00') && lista.includes('90,00'));
checar('mostra o fornecedor', lista.includes('Fornecedor A'));

checar('contador com 3 itens', el('contador-cesta').textContent === '3 itens',
    el('contador-cesta').textContent);
checar('relatório liberado com 3', el('btnRelatorio').disabled === false);
checar('rótulo com contagem', el('btnRelatorio').textContent === 'Gerar relatório (3)',
    el('btnRelatorio').textContent);
checar('CSV liberado', el('btnExportar').disabled === false);
checar('sem aviso com 3', el('aviso').innerHTML === '');

// resumo
const resumo = el('resumo').innerHTML;
checar('resumo aparece', el('bloco-resumo').style.display === '');
checar('resumo traz mediana', resumo.includes('180,00'), 'valores 90/180/300');
checar('resumo traz média', resumo.includes('190,00'));
checar('resumo traz menor e maior', resumo.includes('90,00') && resumo.includes('300,00'));

// com 2 itens: bloqueia
armazem.set('pncp:cesta', JSON.stringify(itens.slice(0, 2)));
__atualizar();

checar('com 2 itens o relatório bloqueia', el('btnRelatorio').disabled === true);
checar('aviso informa quanto falta', el('aviso').innerHTML.includes('Faltam 1'),
    el('aviso').innerHTML.replace(/\s+/g, ' ').slice(0, 90));

// sem itens
armazem.set('pncp:cesta', JSON.stringify([]));
__atualizar();

checar('cesta vazia mostra orientação', el('lista').innerHTML.includes('cesta está vazia'));
checar('relatório bloqueado sem itens', el('btnRelatorio').disabled === true);
checar('resumo some sem itens', el('bloco-resumo').style.display === 'none');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
