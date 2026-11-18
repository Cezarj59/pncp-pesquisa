/**
 * Testes do botão voltar ao topo (js/topo.js).
 * Uso: node tests/topo.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/* ---------- DOM e window mínimos ---------- */

let anexado = null;
const ouvintes = {};
let scrollPara = null;

globalThis.window = {
    scrollY: 0,
    addEventListener: (tipo, fn) => { ouvintes[tipo] = fn; },
    scrollTo: opcoes => { scrollPara = opcoes; },
    matchMedia: () => ({ matches: false })
};

function criarElemento() {
    const classes = new Set();

    const elemento = {
        type: '',
        className: '',
        textContent: '',
        title: '',
        tabIndex: 0,
        atributos: {},
        classList: {
            add: c => classes.add(c),
            remove: c => classes.delete(c),
            toggle: (c, ativo) => { if (ativo) classes.add(c); else classes.delete(c); },
            contains: c => classes.has(c)
        },
        setAttribute: (chave, valor) => { elemento.atributos[chave] = valor; },
        addEventListener: (tipo, fn) => {
            elemento.handlers = elemento.handlers || {};
            elemento.handlers[tipo] = fn;
        }
    };

    return elemento;
}

globalThis.document = {
    body: { appendChild: elemento => { anexado = elemento; } },
    createElement: criarElemento,
    addEventListener: () => {}
};

eval(fs.readFileSync(path.join(RAIZ, 'js/topo.js'), 'utf8') + '\n;globalThis.BotaoTopo = BotaoTopo;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('botão voltar ao topo\n');

const botao = BotaoTopo.iniciar();

checar('cria o botão', Boolean(botao));
checar('anexa ao corpo da página', anexado === botao);
checar('registra o scroll', typeof ouvintes.scroll === 'function');
checar('começa escondido', !botao.classList.contains('visivel'));
checar('começa fora da tabulação', botao.tabIndex === -1);
checar('aria-hidden inicial', botao.atributos['aria-hidden'] === 'true');

/* ---------- aparece ao rolar ---------- */

window.scrollY = 500;
ouvintes.scroll();

checar('aparece depois do limite', botao.classList.contains('visivel'));
checar('entra na tabulação', botao.tabIndex === 0);
checar('aria-hidden liberado', botao.atributos['aria-hidden'] === 'false');

/* ---------- clique volta ao topo ---------- */

botao.handlers.click();

checar('rola para o topo', scrollPara && scrollPara.top === 0, JSON.stringify(scrollPara));
checar('usa rolagem suave', scrollPara && scrollPara.behavior === 'smooth');

/* ---------- some ao voltar ---------- */

window.scrollY = 120;
ouvintes.scroll();

checar('some perto do topo', !botao.classList.contains('visivel'));
checar('sai da tabulação de novo', botao.tabIndex === -1);

/* ---------- chamada repetida não duplica ---------- */

const segundo = BotaoTopo.iniciar();
checar('não cria outro botão', segundo === botao);

/* ---------- respeita quem prefere menos animação ---------- */

window.matchMedia = () => ({ matches: true });
window.scrollY = 800;
ouvintes.scroll();
botao.handlers.click();

checar('sem animação quando o sistema pede', scrollPara.behavior === 'auto', scrollPara.behavior);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
