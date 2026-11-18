/**
 * Testes da cesta de itens (js/cesta.js).
 * Uso: node tests/cesta.test.js
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

eval(fs.readFileSync(path.join(RAIZ, 'js/cesta.js'), 'utf8') + '\n;globalThis.Cesta = Cesta;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('cesta de itens');

checar('começa vazia', Cesta.total() === 0);
checar('mínimo é 3', Cesta.MINIMO === 3);

const item = {
    itemUrl: '/compras/1/2026/1',
    numeroItem: 5,
    descricao: 'Merenda escolar',
    quantidade: 10,
    unidade: 'CX',
    valorEstimado: 100,
    valorHomologado: 90,
    fornecedor: 'Fornecedor A',
    orgao: 'Prefeitura de Colombo',
    uf: 'PR',
    link: 'https://pncp.gov.br/app/editais/1/2026/1'
};

const primeiro = Cesta.adicionar(item);
checar('adiciona item', primeiro.ok === true);
checar('total vira 1', Cesta.total() === 1);
checar('item fica na cesta', Cesta.contem('/compras/1/2026/1', 5) === true);

const repetido = Cesta.adicionar(item);
checar('não duplica o mesmo item', repetido.ok === false && repetido.motivo === 'repetido');
checar('total continua 1', Cesta.total() === 1);

// itens de contratações diferentes se acumulam
Cesta.adicionar({ ...item, itemUrl: '/compras/2/2026/9', numeroItem: 2, descricao: 'Gêneros' });
Cesta.adicionar({ ...item, itemUrl: '/compras/3/2026/4', numeroItem: 1, descricao: 'Limpeza' });

checar('acumula de pesquisas diferentes', Cesta.total() === 3, `(${Cesta.total()})`);

const lista = Cesta.ler();
checar('guarda a chave composta', lista[0].chave === '/compras/1/2026/1#5', lista[0].chave);
checar('guarda data de inclusão', typeof lista[0].adicionadoEm === 'string');
checar('preserva o preço homologado', lista[0].valorHomologado === 90);
checar('preserva o órgão', lista[0].orgao === 'Prefeitura de Colombo');

// o mesmo número de item em contratação diferente não é duplicado
checar('mesmo número em outra compra é permitido',
    Cesta.contem('/compras/2/2026/9', 2) === true);

// remoção
Cesta.remover('/compras/2/2026/9#2');
checar('remove pelo chave', Cesta.total() === 2, `(${Cesta.total()})`);
checar('item removido sai', Cesta.contem('/compras/2/2026/9', 2) === false);

// persistência: sobrevive a recarregar o módulo
const guardado = armazem.get('pncp:cesta');
checar('grava em localStorage', typeof guardado === 'string' && guardado.length > 10);

// limpeza
Cesta.limpar();
checar('limpar zera', Cesta.total() === 0);

// leitura tolerante a dado corrompido
armazem.set('pncp:cesta', 'isso não é json');
checar('dado corrompido vira lista vazia', Array.isArray(Cesta.ler()) && Cesta.ler().length === 0);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
