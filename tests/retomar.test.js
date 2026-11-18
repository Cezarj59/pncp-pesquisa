/**
 * Testes do "retomar pesquisa" (js/retomar.js).
 * Uso: node tests/retomar.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/* ---------- armazenamento ---------- */

const armazem = new Map();
globalThis.localStorage = {
    getItem: k => (armazem.has(k) ? armazem.get(k) : null),
    setItem: (k, v) => armazem.set(k, v),
    removeItem: k => armazem.delete(k)
};

/* ---------- DOM mínimo ---------- */

let removido = false;
let anexados = [];

function criarElemento(tag) {
    const elemento = {
        tagName: tag,
        className: '',
        innerHTML: '',
        textContent: '',
        href: '',
        filhos: [],
        handlers: {},
        addEventListener: (tipo, fn) => { elemento.handlers[tipo] = fn; },
        appendChild: filho => { elemento.filhos.push(filho); return filho; },
        remove: () => { removido = true; }
    };
    return elemento;
}

const linha = criarElemento('div');

const main = {
    firstChild: null,
    filhos: [],
    insertBefore: (elemento, referencia) => { main.filhos.unshift(elemento); anexados.push(elemento); return elemento; },
    querySelector: seletor => (seletor === '.card .linha' ? linha : null)
};

globalThis.document = {
    createElement: criarElemento,
    querySelector: seletor => (seletor === 'main' ? main : null),
    getElementById: () => null,
    addEventListener: () => {}
};

eval(fs.readFileSync(path.join(RAIZ, 'js/retomar.js'), 'utf8') + '\n;globalThis.Retomar = Retomar;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('retomar pesquisa\n');

/* ---------- ponteiro ---------- */

checar('sem pesquisa salva', Retomar.ler() === null);

Retomar.salvar({
    url: '?tipo=edital&q=merenda&uf=PR',
    termo: 'merenda',
    total: 87,
    tipo: 'edital'
});

const dados = Retomar.ler();

checar('guarda a pesquisa', Boolean(dados));
checar('guarda o endereço', dados.url === '?tipo=edital&q=merenda&uf=PR', dados.url);
checar('guarda o termo', dados.termo === 'merenda');

checar('descreve termo e total', Retomar.descrever(dados).includes('"merenda" · 87 resultados'),
    Retomar.descrever(dados));
checar('descreve tempo', Retomar.descrever(dados).includes('agora'));

checar('formata minutos', Retomar.desde(Date.now() - 5 * 60000) === 'há 5 min');
checar('formata horas', Retomar.desde(Date.now() - 2 * 3600000) === 'há 2 h');
checar('formata agora', Retomar.desde(Date.now()) === 'agora');

/* ---------- expiração ---------- */

armazem.set('pncp:ultima-pesquisa', JSON.stringify({
    url: '?velha=1', termo: 'x', total: 1, quando: Date.now() - 2 * 3600000
}));

checar('pesquisa velha é ignorada', Retomar.ler() === null);
checar('pesquisa velha é descartada', armazem.has('pncp:ultima-pesquisa') === false);

/* ---------- banner nas páginas de filtro ---------- */

Retomar.salvar({ url: '?tipo=edital&q=merenda', termo: 'merenda', total: 87 });

document.getElementById = id => (id === 'form-filtros' ? { id } : null);

Retomar.iniciar();

checar('insere o aviso na página de filtros', anexados.length === 1, `(${anexados.length})`);

const caixa = anexados[0];
checar('usa a classe do aviso', caixa.className === 'aviso retomar', caixa.className);
checar('mostra o termo', caixa.innerHTML.includes('merenda'));
checar('mostra o total', caixa.innerHTML.includes('87 resultados'));
checar('oferece continuar', caixa.innerHTML.includes('Continuar pesquisa'));
checar('link aponta para os resultados',
    caixa.innerHTML.includes('resultados.html?tipo=edital&amp;q=merenda')
    || caixa.innerHTML.includes('resultados.html?tipo=edital&q=merenda'),
    caixa.innerHTML.slice(0, 160));
checar('oferece descartar', caixa.innerHTML.includes('data-descartar'));

// descartar
caixa.handlers.click({ target: { closest: () => ({}) } });
checar('descartar remove o aviso', removido === true);
checar('descartar limpa o ponteiro', Retomar.ler() === null);

/* ---------- link na página da coleta ---------- */

Retomar.salvar({ url: '?tipo=edital&q=arroz', termo: 'arroz', total: 12 });

document.getElementById = id => (id === 'lista' ? { id } : null);   // página da coleta

Retomar.iniciar();

checar('adiciona link de volta na coleta', linha.filhos.length === 1, `(${linha.filhos.length})`);
checar('link curto', linha.filhos[0].textContent === '← Voltar à pesquisa',
    linha.filhos[0] && linha.filhos[0].textContent);
checar('link com a pesquisa',
    linha.filhos[0].href === 'resultados.html?tipo=edital&q=arroz',
    linha.filhos[0] && linha.filhos[0].href);

/* ---------- sem pesquisa, nada aparece ---------- */

Retomar.limpar();
const antes = anexados.length;
Retomar.iniciar();

checar('sem pesquisa não insere nada', anexados.length === antes);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
