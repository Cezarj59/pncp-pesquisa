/**
 * Testes da seleção de registros na lista de resultados.
 * Uso: node tests/selecao.test.js
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
            title: '',
            checked: false,
            style: {},
            dataset: {},
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

globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.window = { location: { search: '' } };
globalThis.PNCP = { linkPortal: () => 'https://pncp.gov.br/app/editais/1/2026/1' };

eval(fs.readFileSync(path.join(RAIZ, 'js/resultados.js'), 'utf8')
    + '\n;globalThis.__estado = estado;'
    + '\n;globalThis.__sel = selecionados;'
    + '\n;globalThis.__render = renderizarTabela;'
    + '\n;globalThis.__atualizar = atualizarSelecao;'
    + '\n;globalThis.__daSelecao = itensDaSelecao;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('seleção de registros');

const itens = [
    { item_url: '/compras/1/2026/1', description: 'Merenda', orgao_nome: 'Prefeitura A', uf: 'PR', valor_total_estimado: 100 },
    { item_url: '/compras/2/2026/2', description: 'Gêneros', orgao_nome: 'Prefeitura B', uf: 'SP', valor_total_estimado: 200 },
    { item_url: '/compras/3/2026/3', description: 'Limpeza', orgao_nome: 'Prefeitura C', uf: 'PR', valor_total_estimado: 300 }
];

__estado.tipo = 'edital';
__estado.pagina = 1;
__estado.filtrados = itens;

// --- tabela traz caixas de marcar ---
__render();
checar('tabela tem caixas de seleção', el('tabela').innerHTML.includes('data-selecionar'));
checar('tabela tem "selecionar página"', el('tabela').innerHTML.includes('selecionar-pagina'));
checar('guarda os itens da página', __estado.itensPagina.length === 3, `(${__estado.itensPagina.length})`);

// --- nenhum selecionado ---
__atualizar();
checar('relatório começa desabilitado', el('btnRelatorio').disabled === true);
checar('dica no contador', el('contador-selecao').textContent.includes('Marque'));

// --- um selecionado ---
__sel.add('/compras/1/2026/1');
__atualizar();
checar('contador mostra 1', el('contador-selecao').textContent === '1 selecionado',
    el('contador-selecao').textContent);
checar('relatório habilitado', el('btnRelatorio').disabled === false);
checar('rótulo com contagem', el('btnRelatorio').textContent === 'Gerar relatório (1)',
    el('btnRelatorio').textContent);
checar('CSV também segue a seleção', el('btnExportar').textContent === 'Exportar CSV (1)');
checar('seleção devolve 1 registro', __daSelecao().length === 1);
checar('registro certo', __daSelecao()[0].description === 'Merenda');

// --- aviso de cesta com menos de 3 ---
checar('avisa com 1 selecionado', el('aviso-cesta').style.display !== 'none');
checar('aviso cita a exigência de 3', el('aviso-cesta').textContent.includes('3'),
    el('aviso-cesta').textContent);

// --- dois selecionados, plural ---
__sel.add('/compras/2/2026/2');
__atualizar();
checar('plural correto', el('contador-selecao').textContent === '2 selecionados',
    el('contador-selecao').textContent);
checar('aviso continua com 2', el('aviso-cesta').style.display !== 'none');

// --- três selecionados: aviso desaparece ---
__sel.add('/compras/3/2026/3');
__atualizar();
checar('aviso some com 3', el('aviso-cesta').style.display === 'none');
checar('contagem com 3', el('btnRelatorio').textContent === 'Gerar relatório (3)',
    el('btnRelatorio').textContent);

// --- limpar ---
__sel.clear();
__atualizar();
checar('limpar volta a desabilitar', el('btnRelatorio').disabled === true);
checar('limpar zera a seleção', __daSelecao().length === 0);
checar('limpar esconde o aviso', el('aviso-cesta').style.display === 'none');
checar('CSV volta ao rótulo simples', el('btnExportar').textContent === 'Exportar CSV');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
