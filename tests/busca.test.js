/**
 * Testes do motor de busca (js/busca.js).
 * Uso: node tests/busca.test.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

let chamadas = 0;
let falharNaPagina = null;
let paginas = [];
let totalFalso = 500;

globalThis.PNCP = {
    async buscar({ pagina }) {
        chamadas++;
        if (falharNaPagina === pagina) throw new Error('HTTP 429');
        return { items: paginas[pagina - 1] || [], total: totalFalso };
    }
};

eval(fs.readFileSync(path.join(RAIZ, 'js/busca.js'), 'utf8') + '\n;globalThis.MotorBusca = MotorBusca;');

const RAPIDA = {
    ...MotorBusca.POLITICA,
    intervaloMs: 0,
    tentativasPorPagina: 0,
    falhasSeguidasParaParar: 1,
    timeoutMs: 2000
};

function criarItens(quantidade, marcados = 0) {
    return Array.from({ length: quantidade }, (_, i) => ({ n: i, ok: i < marcados }));
}

let falhas = 0;

function checar(rotulo, condicao, extra) {
    console.log(`  ${condicao ? 'PASS ' : 'FALHA'} ${rotulo}`, extra || '');
    if (!condicao) falhas++;
}

(async () => {
    console.log('motor de busca');

    // 1. para ao atingir o alvo
    MotorBusca.limparCache();
    chamadas = 0;
    paginas = [criarItens(50, 15), criarItens(50, 15), criarItens(50, 15)];

    let r = await MotorBusca.executar({
        termo: 'alvo', tipo: 'edital',
        politica: { ...RAPIDA, alvoResultados: 20 },
        aplicarFiltros: itens => itens.filter(i => i.ok)
    });

    checar('para ao atingir o alvo', r.parouPor === 'alvo', r.parouPor);
    checar('lê 2 páginas', r.paginasLidas === 2, `(${r.paginasLidas})`);
    checar('retorna 100 registros', r.itens.length === 100, `(${r.itens.length})`);

    // 2. respeita o teto
    MotorBusca.limparCache();
    chamadas = 0;
    paginas = Array.from({ length: 20 }, () => criarItens(50, 0));

    r = await MotorBusca.executar({
        termo: 'teto', tipo: 'edital',
        politica: { ...RAPIDA, maxPaginas: 3 },
        aplicarFiltros: () => []
    });

    checar('para no teto', r.parouPor === 'teto', r.parouPor);
    checar('lê exatamente 3 páginas', r.paginasLidas === 3, `(${r.paginasLidas})`);
    checar('não faz requisição extra', chamadas === 3, `(${chamadas})`);

    // 3. falha no meio preserva o parcial
    MotorBusca.limparCache();
    chamadas = 0;
    paginas = [criarItens(50, 10), criarItens(50, 10)];
    falharNaPagina = 2;

    r = await MotorBusca.executar({
        termo: 'falha', tipo: 'edital',
        politica: RAPIDA,
        aplicarFiltros: itens => itens.filter(i => i.ok)
    });

    checar('não lança exceção', r && r.itens.length === 50, `(${r && r.itens.length})`);
    checar('marca como incompleto', r.completou === false);
    checar('informa falha', r.parouPor === 'falha', r.parouPor);

    falharNaPagina = null;

    // 4. cache evita repetição
    MotorBusca.limparCache();
    chamadas = 0;
    paginas = [criarItens(50, 5)];

    await MotorBusca.executar({ termo: 'cache', tipo: 'edital', politica: { ...RAPIDA, maxPaginas: 2 } });
    const aposPrimeira = chamadas;
    await MotorBusca.executar({ termo: 'cache', tipo: 'edital', politica: { ...RAPIDA, maxPaginas: 2 } });

    checar('segunda busca usa cache', chamadas === aposPrimeira, `(${aposPrimeira} -> ${chamadas})`);

    // 5. cancelamento
    MotorBusca.limparCache();
    const controle = new AbortController();
    controle.abort();

    r = await MotorBusca.executar({
        termo: 'cancela', tipo: 'edital', politica: RAPIDA, sinal: controle.signal
    });

    checar('cancelamento encerra sem erro', r.parouPor === 'cancelada', r.parouPor);
    checar('cancelamento não traz itens', r.itens.length === 0);

    // 6. página inicial (usada pelo "buscar mais")
    MotorBusca.limparCache();
    chamadas = 0;
    paginas = [criarItens(50, 0), criarItens(50, 0), criarItens(50, 3)];

    r = await MotorBusca.executar({
        termo: 'continua', tipo: 'edital',
        paginaInicial: 3,
        politica: { ...RAPIDA, maxPaginas: 1 }
    });

    checar('começa na página pedida', r.paginasLidas === 1 && r.itens.length === 50, `(${r.itens.length})`);

    console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo passou');
    process.exit(falhas ? 1 : 0);
})();
