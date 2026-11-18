/**
 * Testes das coletas de preços (js/coleta.js).
 * Uso: node tests/coleta.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const armazem = new Map();
globalThis.localStorage = {
    getItem: k => (armazem.has(k) ? armazem.get(k) : null),
    setItem: (k, v) => armazem.set(k, v),
    removeItem: k => armazem.delete(k)
};

eval(fs.readFileSync(path.join(RAIZ, 'js/coleta.js'), 'utf8') + '\n;globalThis.Coleta = Coleta;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

function item(numero, url, valores = {}) {
    return {
        itemUrl: url || '/compras/1/2026/1',
        numeroItem: numero,
        descricao: `Item ${numero}`,
        quantidade: 10,
        unidade: 'UN',
        valorEstimado: 100,
        valorHomologado: 90,
        fornecedor: 'Fornecedor A',
        orgao: 'Prefeitura',
        uf: 'PR',
        ...valores
    };
}

console.log('coletas de preços\n');
console.log('estrutura');

checar('começa sem coletas', Coleta.listar().length === 0);
checar('sem coleta ativa', Coleta.ativa() === null);
checar('mínimo é 3', Coleta.MINIMO === 3);

const primeira = Coleta.criar('Primeira coleta');

checar('cria coleta com nome', primeira.nome === 'Primeira coleta');
checar('vira a ativa', Coleta.ativa().id === primeira.id);
checar('lista tem uma', Coleta.listar().length === 1);

checar('nome padrão é descritivo', Coleta.criar().nome.startsWith('Coleta de'));

/* ---------- itens ---------- */

console.log('\nitens');

Coleta.definirAtiva(primeira.id);

const r1 = Coleta.adicionar(item(1));
checar('adiciona item', r1.ok === true);
checar('total da ativa', Coleta.total() === 1);
checar('sabe que o item está na ativa', Coleta.contem('/compras/1/2026/1', 1) === true);

const repetido = Coleta.adicionar(item(1));
checar('não duplica', repetido.ok === false && repetido.motivo === 'repetido');
checar('total continua 1', Coleta.total() === 1);

checar('mesmo número em outra compra é permitido',
    Coleta.adicionar(item(1, '/compras/9/2026/9')).ok === true);

/* ---------- histórico ---------- */

console.log('\nhistórico');

const segunda = Coleta.criar('Segunda coleta');

checar('duas coletas guardadas', Coleta.listar().length === 3, `(${Coleta.listar().length})`);
checar('a nova começa vazia', Coleta.total() === 0);
checar('a primeira continua com 2 itens',
    Coleta.listar().find(c => c.id === primeira.id).itens.length === 2);

Coleta.adicionar(item(5, '/compras/5/2026/5'));
checar('item vai para a ativa', Coleta.total() === 1);

/* ---------- encerrar após relatório ---------- */

console.log('\nseparação automática');

Coleta.encerrarAtiva();
checar('pedido de nova coleta registrado', Coleta.deveNovaColeta() === true);

Coleta.adicionar(item(7, '/compras/7/2026/7'));
checar('cria coleta nova ao adicionar', Coleta.listar().length === 4, `(${Coleta.listar().length})`);
checar('pedido foi consumido', Coleta.deveNovaColeta() === false);
checar('item entrou na nova', Coleta.total() === 1);
checar('a segunda continua com 1 item',
    Coleta.listar().find(c => c.id === segunda.id).itens.length === 1);

/* ---------- edição ---------- */

console.log('\nedição');

checar('renomeia', Coleta.renomear(primeira.id, 'Merenda 2027') === true);
checar('nome novo aplicado',
    Coleta.listar().find(c => c.id === primeira.id).nome === 'Merenda 2027');
checar('recusa nome vazio', Coleta.renomear(primeira.id, '   ') === false);

const chavePrimeiro = Coleta.listar().find(c => c.id === primeira.id).itens[0].chave;
Coleta.removerItem(primeira.id, chavePrimeiro);
checar('remove item',
    Coleta.listar().find(c => c.id === primeira.id).itens.length === 1);

const antes = Coleta.listar().length;
Coleta.remover(segunda.id);
checar('remove coleta', Coleta.listar().length === antes - 1);

/* ---------- nome a partir da pesquisa ---------- */

console.log('\nnome da coleta');

armazem.clear();
Coleta.criar();

Coleta.adicionar({ ...item(1), busca: 'merenda escolar' });
const nomeSugerido = Coleta.ativa().nome;

checar('usa o termo da busca', nomeSugerido.startsWith('merenda escolar'), nomeSugerido);
checar('acrescenta a data curta', /·\s*\d{2}\/\d{2}$/.test(nomeSugerido), nomeSugerido);

Coleta.adicionar(item(2));
checar('não renomeia ao adicionar mais itens',
    Coleta.ativa().nome === nomeSugerido);

armazem.clear();
Coleta.criar('Minha coleta');
Coleta.adicionar({ ...item(1), busca: 'merenda' });
checar('respeita nome escolhido pelo usuário', Coleta.ativa().nome === 'Minha coleta');

armazem.clear();
Coleta.criar();
Coleta.adicionar(item(1));
checar('sem busca usa a descrição do item',
    Coleta.ativa().nome.startsWith('Item 1'), Coleta.ativa().nome);

/* ---------- backup ---------- */

console.log('\nbackup');

const conteudo = Coleta.exportarJson();
checar('gera JSON válido', (() => {
    try {
        const dados = JSON.parse(conteudo);
        return dados.versao === 1 && Array.isArray(dados.coletas) && dados.coletas.length === 1;
    } catch (_) {
        return false;
    }
})());

armazem.clear();
const importadas = Coleta.importarJson(conteudo);

checar('importa as coletas', importadas === 1, `(${importadas})`);
checar('restaura os itens', Coleta.listar()[0].itens.length === 1);
checar('não duplica ao importar de novo', Coleta.importarJson(conteudo) === 0);

let mensagemErro = '';
try {
    Coleta.importarJson('isso não é json');
} catch (erro) {
    mensagemErro = erro.message;
}
checar('recusa arquivo inválido', /JSON/.test(mensagemErro), mensagemErro);

/* ---------- migração do formato antigo ---------- */

console.log('\nmigração');

armazem.clear();
armazem.set('pncp:cesta', JSON.stringify([item(1), item(2)]));

const migradas = Coleta.listar();
checar('converte a cesta antiga em coleta', migradas.length === 1, `(${migradas.length})`);
checar('nomeia como "Coleta anterior"', migradas[0].nome === 'Coleta anterior', migradas[0].nome);
checar('traz os 2 itens', migradas[0].itens.length === 2);
checar('remove a chave antiga', armazem.has('pncp:cesta') === false);

/* ---------- tolerância a dado inválido ---------- */

armazem.set('pncp:coletas', 'isso não é json');
checar('dado corrompido vira lista vazia',
    Array.isArray(Coleta.listar()) && Coleta.listar().length === 0);
checar('não quebra ao ler a ativa', Coleta.ativa() === null);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
