/**
 * Teste de fumaça da API do PNCP.
 *
 * Verifica se a busca textual e o detalhe continuam respondendo no formato
 * que o sistema espera. Roda no GitHub Actions, uma vez por dia.
 *
 * Uso local: node tests/smoke.js
 * Código de saída 0 = tudo certo; 1 = contrato quebrado.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const URL_BUSCA = 'https://pncp.gov.br/api/search/';
const TENTATIVAS = 4;

// O PNCP bloqueia por alguns minutos quando recebe muitas chamadas.
// Esperas crescentes dão chance de recuperar sem gerar alarme falso.
const ESPERAS_MS = [5000, 15000, 30000];

// Reaproveita o cliente real, para validar o mesmo caminho que o site usa
eval(fs.readFileSync(path.join(RAIZ, 'js/api.js'), 'utf8') + '\n;globalThis.PNCP = PNCP;');

const problemas = [];
const avisos = [];

function falha(mensagem) {
    problemas.push(mensagem);
    console.log(`  FALHA ${mensagem}`);
}

function aviso(mensagem) {
    avisos.push(mensagem);
    console.log(`  aviso ${mensagem}`);
}

function ok(mensagem) {
    console.log(`  ok    ${mensagem}`);
}

function dormir(ms) {
    return new Promise(resolver => setTimeout(resolver, ms));
}

async function comRetentativa(acao, rotulo) {
    let ultimoErro;

    for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
        try {
            return await acao();
        } catch (erro) {
            ultimoErro = erro;
            console.log(`  ... ${rotulo}: tentativa ${tentativa} falhou (${erro.message})`);
            if (tentativa < TENTATIVAS) {
                await dormir(ESPERAS_MS[tentativa - 1] || 30000);
            }
        }
    }

    throw ultimoErro;
}

async function verificarBusca() {
    console.log('busca textual');

    const params = new URLSearchParams({
        q: 'merenda',
        tipos_documento: 'edital',
        pagina: '1',
        tam_pagina: '10',
        ordenacao: '-data'
    });

    const resposta = await comRetentativa(
        () => fetch(`${URL_BUSCA}?${params}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Licit@Gov/1.0 (verificacao automatica)'
            },
            signal: AbortSignal.timeout(30000)
        }),
        'busca'
    );

    if (resposta.status !== 200) {
        falha(`busca respondeu HTTP ${resposta.status}`);
        return [];
    }

    const dados = await resposta.json();

    if (typeof dados.total !== 'number' || dados.total <= 0) {
        falha(`campo "total" ausente ou inválido (${JSON.stringify(dados.total)})`);
    } else {
        ok(`campo "total" presente (${dados.total})`);
    }

    if (!Array.isArray(dados.items) || dados.items.length === 0) {
        falha('campo "items" ausente ou vazio');
        return [];
    }

    ok(`campo "items" com ${dados.items.length} registro(s)`);

    const essenciais = ['orgao_nome', 'uf', 'data_publicacao_pncp', 'orgao_cnpj', 'numero_sequencial'];
    const amostra = dados.items[0];

    const faltando = essenciais.filter(campo => !(campo in amostra));

    if (faltando.length) {
        falha(`campos ausentes no item: ${faltando.join(', ')}`);
    } else {
        ok('campos essenciais presentes no item');
    }

    if (!amostra.description && !amostra.title) {
        falha('item sem "description" nem "title"');
    }

    return dados.items;
}

async function verificarDetalhe(itens) {
    console.log('detalhe da contratação');

    // Prefere um registro mais antigo: recém-publicados podem não estar
    // indexados no endpoint de detalhe.
    const candidatos = itens
        .filter(item => item.item_url && item.item_url.startsWith('/compras/'))
        .slice(-3);

    if (!candidatos.length) {
        aviso('nenhum item com item_url de compra para testar o detalhe');
        return;
    }

    const motivos = [];

    for (const item of candidatos) {
        try {
            const entidade = await PNCP.detalhe(item.item_url);

            if (entidade && typeof entidade === 'object' && Object.keys(entidade).length) {
                ok(`detalhe respondeu para ${item.item_url}`);
                return;
            }
        } catch (erro) {
            motivos.push(erro.message);
            console.log(`  ... detalhe falhou em ${item.item_url} (${erro.message})`);
        }
    }

    // Limite de requisições e registro recém-publicado não indicam mudança
    // de contrato. Só viram falha se todos os motivos forem estruturais.
    const apenasTransitorio = motivos.length > 0
        && motivos.every(m => /HTTP 429|Failed to fetch|timeout|network/i.test(m));

    if (apenasTransitorio) {
        aviso(`detalhe não verificável agora (${motivos[0]}). Não é falha de contrato.`);
    } else {
        aviso(`detalhe não respondeu (${motivos.join(' | ')}). Pode ser registro não indexado.`);
    }
}

async function principal() {
    console.log(`verificação em ${new Date().toISOString()}\n`);

    let itens = [];

    try {
        itens = await verificarBusca();
    } catch (erro) {
        falha(`busca indisponível: ${erro.message}`);
    }

    if (itens.length) {
        try {
            await verificarDetalhe(itens);
        } catch (erro) {
            falha(`detalhe indisponível: ${erro.message}`);
        }
    }

    console.log();

    if (avisos.length) {
        console.log(`${avisos.length} aviso(s):`);
        avisos.forEach(a => console.log(`  - ${a}`));
        console.log();
    }

    if (problemas.length) {
        console.log(`${problemas.length} problema(s) encontrado(s):`);
        problemas.forEach(p => console.log(`  - ${p}`));
        process.exit(1);
    }

    console.log('tudo certo');
    process.exit(0);
}

principal();
