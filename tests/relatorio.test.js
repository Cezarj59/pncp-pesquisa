/**
 * Testes do relatório de pesquisa (js/relatorio-pesquisa.js).
 * Uso: node tests/relatorio.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

eval(fs.readFileSync(path.join(RAIZ, 'js/relatorio-pesquisa.js'), 'utf8')
    + '\n;globalThis.__R = RelatorioPesquisa;');

let falhas = 0;
function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

console.log('relatório de pesquisa');

// --- estatísticas ---
checar('sem valores devolve null', __R.estatisticas([]) === null);
checar('ignora zeros, nulos e negativos',
    __R.estatisticas([0, null, undefined, -5]) === null);

const tres = __R.estatisticas([10, 20, 30]);
checar('mediana de 3 valores', tres.mediana === 20, `(${tres.mediana})`);
checar('média de 3 valores', tres.media === 20, `(${tres.media})`);
checar('mínimo', tres.minimo === 10);
checar('máximo', tres.maximo === 30);

const quatro = __R.estatisticas([40, 10, 30, 20]);
checar('mediana de 4 valores (média dos centrais)', quatro.mediana === 25, `(${quatro.mediana})`);

const comZeros = __R.estatisticas([0, 100, 0, 200]);
checar('zeros não entram na conta', comZeros.quantidade === 2, `(${comZeros.quantidade})`);

checar('ordem de entrada não importa',
    __R.estatisticas([300, 100, 200]).mediana === 200);

// --- documento ---
const dados = {
    geradoEm: '2026-11-18T02:00:00.000Z',
    tipo: 'edital',
    termo: 'merenda',
    filtros: ['Palavra-chave: merenda', 'UF: PR, SP', 'Período: últimos 365 dias'],
    itens: [
        { objeto: 'Merenda escolar', orgao: 'Prefeitura de Colombo', municipio: 'Colombo',
          uf: 'PR', data: '2026-11-01T00:00:00Z', valorReferencia: 100,
          link: 'https://pncp.gov.br/app/editais/1/2026/1' },
        { objeto: 'Gêneros alimentícios', orgao: 'Prefeitura de Curitiba', municipio: 'Curitiba',
          uf: 'PR', data: '2026-11-02T00:00:00Z', valorReferencia: 300,
          link: 'https://pncp.gov.br/app/editais/2/2026/2' }
    ]
};

const html = __R.montar(dados);

checar('tem título', html.includes('Relatório de pesquisa de preços'));
checar('traz o termo', html.includes('merenda'));
checar('lista os filtros', html.includes('UF: PR, SP'));
checar('traz mediana calculada', html.includes('200,00'), 'mediana de 100 e 300');
checar('traz média calculada', html.includes('200,00'));
checar('traz as duas linhas da cesta', (html.match(/Prefeitura de/g) || []).length === 2);
checar('traz link do PNCP', html.includes('https://pncp.gov.br/app/editais/1/2026/1'));
checar('tem campo de metodologia', html.includes('Metodologia adotada'));
checar('tem assinatura', html.includes('Responsável pela pesquisa'));
checar('escapa HTML do objeto', !html.includes('<script'));
checar('avisa sobre o alcance', html.includes('Não representam a totalidade'));

// --- sem valores ---
const semValor = __R.montar({
    geradoEm: '2026-11-18T02:00:00.000Z', tipo: 'edital', termo: 'x',
    filtros: [], itens: [{ objeto: 'A', orgao: 'B', uf: 'PR', valorReferencia: 0, link: '' }]
});
checar('sem valor explica a ausência', semValor.includes('não há'));

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
process.exit(falhas ? 1 : 0);
