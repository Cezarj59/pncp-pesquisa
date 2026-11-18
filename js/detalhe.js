/* ====== Página de detalhe ====== */

const ROTULOS = {
    numeroControlePNCP: 'Número de controle PNCP',
    numeroControlePncpCompra: 'Controle PNCP da compra',
    numeroCompra: 'Número da compra',
    processo: 'Processo',
    objetoCompra: 'Objeto',
    objetoContrato: 'Objeto do contrato',
    objetoContratacao: 'Objeto',
    informacaoComplementar: 'Informação complementar',
    valorTotalEstimado: 'Valor total estimado',
    valorTotalHomologado: 'Valor total homologado',
    valorGlobal: 'Valor global',
    valorInicial: 'Valor inicial',
    valorAcumulado: 'Valor acumulado',
    valorParcela: 'Valor da parcela',
    numeroParcelas: 'Parcelas',
    dataPublicacaoPncp: 'Publicação no PNCP',
    dataAberturaProposta: 'Abertura de propostas',
    dataEncerramentoProposta: 'Encerramento de propostas',
    dataAssinatura: 'Assinatura',
    dataVigenciaInicio: 'Início da vigência',
    dataVigenciaFim: 'Fim da vigência',
    vigenciaInicio: 'Início da vigência',
    vigenciaFim: 'Fim da vigência',
    modalidadeNome: 'Modalidade',
    modoDisputaNome: 'Modo de disputa',
    situacaoCompraNome: 'Situação',
    criterioJulgamentoNome: 'Critério de julgamento',
    srp: 'Registro de preços',
    possibilidadeAdesao: 'Permite adesão',
    cancelado: 'Cancelado',
    tipoContrato: 'Tipo de contrato',
    numeroContratoEmpenho: 'Número do contrato',
    nomeRazaoSocialFornecedor: 'Fornecedor',
    niFornecedor: 'CNPJ/CPF do fornecedor',
    tipoPessoa: 'Tipo de pessoa',
    numeroAtaRegistroPreco: 'Número da ata',
    anoAta: 'Ano da ata',
    orgaoEntidade: 'Órgão',
    unidadeOrgao: 'Unidade',
    nomeUnidade: 'Unidade',
    municipioNome: 'Município',
    ufSigla: 'UF',
    razaoSocial: 'Razão social',
    cnpj: 'CNPJ'
};

function rotuloDe(chave) {
    return ROTULOS[chave] || chave
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, c => c.toUpperCase())
        .trim();
}

function ehObjeto(v) {
    return v !== null && typeof v === 'object';
}

function valorFormatado(chave, valor) {
    if (valor === null || valor === undefined || valor === '') return '<span class="mudo">—</span>';
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';

    const baixa = chave.toLowerCase();

    if (baixa.startsWith('data') || baixa.startsWith('vigencia')) {
        const d = new Date(valor);
        if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    if (baixa.startsWith('valor') || baixa === 'preco' || baixa.includes('unitario')) {
        const n = Number(valor);
        if (Number.isFinite(n)) return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    return escapar(valor);
}

function escapar(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function moeda(v) {
    const n = Number(v);
    return Number.isFinite(n)
        ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '<span class="mudo">—</span>';
}

/* ---------- estado da página ---------- */

let itemUrlAtual = '';
const jaCarregado = { documentos: false, itens: false, termos: false };

/* ---------- cache do detalhe ---------- */

const CACHE_DETALHE_TTL = 5 * 60 * 1000;

function lerCacheDetalhe(itemUrl) {
    try {
        const bruto = sessionStorage.getItem(`pncp:detalhe:${itemUrl}`);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (Date.now() - dados.quando > CACHE_DETALHE_TTL) return null;

        return dados.entidade;
    } catch (_) {
        return null;
    }
}

function gravarCacheDetalhe(itemUrl, entidade) {
    try {
        sessionStorage.setItem(`pncp:detalhe:${itemUrl}`, JSON.stringify({
            quando: Date.now(),
            entidade
        }));
    } catch (_) {
        // Cota do sessionStorage: seguir sem cache
    }
}

/* ---------- blocos ---------- */

function renderDados(entidade) {
    const area = document.getElementById('dados');
    if (!entidade) {
        area.innerHTML = '<div class="aviso erro">Não foi possível carregar os dados.</div>';
        return;
    }

    const linhas = Object.entries(entidade)
        .filter(([chave, valor]) => !ehObjeto(valor) && chave !== 'id')
        .filter(([, valor]) => valor !== null && valor !== '')
        .map(([chave, valor]) => `
            <div class="dado">
                <div class="rotulo">${escapar(rotuloDe(chave))}</div>
                <div class="valor">${valorFormatado(chave, valor)}</div>
            </div>`);

    const objetos = Object.entries(entidade)
        .filter(([, valor]) => ehObjeto(valor) && !Array.isArray(valor))
        .flatMap(([chave, obj]) => Object.entries(obj)
            .filter(([, v]) => !ehObjeto(v) && v !== null && v !== '')
            .map(([k, v]) => `
                <div class="dado">
                    <div class="rotulo">${escapar(rotuloDe(k))}</div>
                    <div class="valor">${valorFormatado(k, v)}</div>
                </div>`));

    area.innerHTML = `<div class="dados">${linhas.concat(objetos).join('')}</div>`;
}

/**
 * Monta o endereço de download do documento.
 * O campo `url` da API aponta para /pncp-api/..., que costuma falhar;
 * o caminho /api/pncp/.../arquivos/{n} é o que responde de fato.
 */
function linkDocumento(itemUrl, doc) {
    const caminho = PNCP.apiPath(itemUrl);
    const sequencial = doc.sequencialDocumento;

    if (caminho && sequencial) {
        return `https://pncp.gov.br/api/pncp/v1${caminho}/arquivos/${sequencial}`;
    }

    return doc.url || doc.uri || '#';
}

function renderArquivos(lista, itemUrl) {
    const area = document.getElementById('arquivos');

    if (!lista.length) {
        area.innerHTML = '<p class="mudo">Nenhum documento publicado.</p>';
        return;
    }

    area.innerHTML = `<ul class="docs">${lista.map(doc => {
        const link = linkDocumento(itemUrl, doc);
        const titulo = doc.titulo || 'Documento';
        const tipo = doc.tipoDocumentoNome || '';
        return `<li>
            <a class="link" href="${escapar(link)}" target="_blank" rel="noopener">${escapar(titulo)}</a>
            ${tipo ? `<br><span class="mudo">${escapar(tipo)}</span>` : ''}
        </li>`;
    }).join('')}</ul>`;
}

function renderItens(itens, itemUrl) {
    const area = document.getElementById('itens');

    if (!itens.length) {
        area.innerHTML = '<p class="mudo">Nenhum item publicado.</p>';
        return;
    }

    const comResultado = itens.filter(i => i.temResultado).length;

    let html = `<div class="tabela-wrap"><table>
        <thead><tr>
            <th scope="col">#</th><th scope="col">Descrição</th><th scope="col">Qtd.</th>
            <th scope="col">Unit. estimado</th><th scope="col">Resultado</th><th scope="col"></th>
        </tr></thead><tbody>`;

    itens.forEach(item => {
        const sigiloso = item.orcamentoSigiloso === true;

        const estimado = sigiloso
            ? '<span class="tag">sigiloso</span>'
            : moeda(item.valorUnitarioEstimado);

        const situacao = item.temResultado
            ? '<span class="tag">homologado</span>'
            : '<span class="mudo">sem resultado</span>';

        html += `<tr>
            <td>${escapar(item.numeroItem)}</td>
            <td>${escapar(item.descricao || '')}</td>
            <td class="num">${escapar(item.quantidade ?? '')} ${escapar(item.unidadeMedida || '')}</td>
            <td class="num">${estimado}</td>
            <td>${situacao}</td>
            <td>${item.temResultado
                ? `<button class="mini" data-precos="1" data-url="${escapar(itemUrl)}" data-item="${Number(item.numeroItem)}">Preços</button>`
                : ''}</td>
        </tr>`;

        // Linha oculta logo abaixo do item; os preços aparecem aqui,
        // sem espremer as colunas da tabela.
        if (item.temResultado) {
            html += `<tr class="linha-precos" style="display: none;">
                <td colspan="6"></td>
            </tr>`;
        }
    });

    html += '</tbody></table></div>';

    if (comResultado === 0) {
        html += `<p class="mudo" style="margin-top: 12px">
            Esta contratação ainda não teve o resultado divulgado.
        </p>`;
    }

    if (itens.some(i => i.orcamentoSigiloso === true)) {
        html += `<p class="mudo" style="margin-top: 8px">
            Os valores estimados desta contratação não foram divulgados.
        </p>`;
    }

    area.innerHTML = html;
}

async function verPrecos(botao, itemUrl, numeroItem) {
    const linha = botao.closest('tr') ? botao.closest('tr').nextElementSibling : null;
    if (!linha) return;

    const celula = linha.firstElementChild;

    // Clicar de novo esconde
    if (linha.style.display !== 'none') {
        linha.style.display = 'none';
        return;
    }

    linha.style.display = '';
    botao.disabled = true;
    celula.innerHTML = '<span class="carregando"></span> Buscando preços...';

    try {
        const resultados = await PNCP.resultados(itemUrl, numeroItem);

        if (!resultados.length) {
            celula.innerHTML = '<span class="mudo">Nenhum fornecedor homologado para este item.</span>';
            return;
        }

        celula.innerHTML = `<ul class="precos-lista">${resultados.map(r => `<li>
            <strong>${escapar(r.nomeRazaoSocialFornecedor || '')}</strong>
            <br><span class="mudo">${escapar(r.niFornecedor || '')} · ${moeda(r.valorUnitarioHomologado)} · qtd ${escapar(r.quantidadeHomologada ?? '')}</span>
        </li>`).join('')}</ul>`;

    } catch (erro) {
        celula.innerHTML = `<span class="mudo">${escapar(mensagemErro(erro))}</span>`;
    } finally {
        botao.disabled = false;
    }
}

function renderTermos(termos) {
    const area = document.getElementById('termos');
    if (!area) return;

    if (!termos.length) {
        area.innerHTML = '<p class="mudo">Nenhum termo registrado.</p>';
        return;
    }

    area.innerHTML = `<ul class="docs">${termos.map(t => `<li>
        <strong>${escapar(t.numeroTermoContrato || t.sequencialTermoContrato || 'Termo')}</strong>
        <br><span class="mudo">${escapar(t.tipoTermoContratoNome || '')} · ${escapar(t.dataAssinatura || '')}</span>
    </li>`).join('')}</ul>`;
}

/* ---------- resumo a partir da listagem ---------- */

function lerCache(itemUrl) {
    try {
        const bruto = sessionStorage.getItem(`pncp:${itemUrl}`);
        return bruto ? JSON.parse(bruto) : null;
    } catch (_) {
        return null;
    }
}

function mensagemErro(erro) {
    const texto = String((erro && erro.message) || erro || '');

    if (/HTTP (404|400)/.test(texto)) {
        return 'Os detalhes desta contratação ainda não estão disponíveis no PNCP.';
    }

    if (/HTTP 429/.test(texto)) {
        return 'O PNCP limitou as consultas por alguns minutos.';
    }

    if (/failed to fetch|networkerror|load failed|network request failed/i.test(texto)) {
        return 'O PNCP não respondeu agora.';
    }

    return 'Não foi possível carregar as informações agora.';
}

function renderResumo(item) {
    const linhas = [
        ['Objeto', item.description || item.title],
        ['Órgão', item.orgao_nome],
        ['Unidade', item.unidade_nome],
        ['Município / UF', [item.municipio_nome, item.uf].filter(Boolean).join(' / ')],
        ['Esfera', item.esfera_nome],
        ['Poder', item.poder_nome],
        ['Modalidade', item.modalidade_licitacao_nome],
        ['Situação', item.situacao_nome],
        ['Valor estimado', item.valor_total_estimado],
        ['Valor homologado', item.valor_total_homologado],
        ['Valor global', item.valor_global],
        ['Publicação no PNCP', item.data_publicacao_pncp],
        ['Assinatura', item.data_assinatura],
        ['Controle PNCP', item.numero_controle_pncp]
    ].filter(([, valor]) => valor !== null && valor !== undefined && valor !== '');

    const html = linhas.map(([rotulo, valor]) => `
        <div class="dado">
            <div class="rotulo">${escapar(rotulo)}</div>
            <div class="valor">${valorFormatado(String(rotulo), valor)}</div>
        </div>`).join('');

    document.getElementById('dados').innerHTML = `<div class="dados">${html}</div>`;
}

/* ---------- carga dos dados completos ---------- */

let temResumoAtual = false;

async function carregarDados() {
    const status = document.getElementById('status');

    const anterior = document.getElementById('btnTentarNovamente');
    if (anterior) anterior.remove();

    const emCache = lerCacheDetalhe(itemUrlAtual);
    if (emCache) {
        renderDados(emCache);
        status.innerHTML = '';
        return;
    }

    status.innerHTML = '<div class="aviso"><span class="carregando"></span> Buscando os dados completos...</div>';

    try {
        const entidade = await PNCP.detalhe(itemUrlAtual);
        gravarCacheDetalhe(itemUrlAtual, entidade);
        renderDados(entidade);
        status.innerHTML = '';

    } catch (erro) {
        if (erro && erro.name === 'AbortError') return;

        status.innerHTML = `<div class="aviso${temResumoAtual ? '' : ' erro'}">
            ${escapar(mensagemErro(erro))}
            <button class="mini" id="btnTentarNovamente" style="margin-left: 10px;">Tentar novamente</button>
        </div>`;

        const botao = document.getElementById('btnTentarNovamente');
        if (botao) botao.addEventListener('click', carregarDados);
    }
}

/* ---------- carga ---------- */

async function carregar() {
    const params = new URLSearchParams(window.location.search);
    const itemUrl = params.get('u') || '';

    itemUrlAtual = itemUrl;

    const status = document.getElementById('status');

    if (!itemUrl) {
        status.innerHTML = '<div class="aviso erro">Parâmetro ausente.</div>';
        return;
    }

    document.getElementById('linkPortal').href = PNCP.linkPortal(itemUrl);

    // 1. Resumo imediato, vindo da listagem (não depende de rede)
    const resumo = lerCache(itemUrl);
    temResumoAtual = Boolean(resumo);
    if (resumo) renderResumo(resumo);

    // 2. Dados completos, com cache e possibilidade de nova tentativa
    await carregarDados();

    // 3. Blocos sob demanda: só aparecem os que fazem sentido para o tipo
    const tipo = itemUrl.split('/').filter(Boolean)[0];

    const blocoItens = document.getElementById('bloco-itens');
    const blocoTermos = document.getElementById('bloco-termos');

    if (blocoItens) blocoItens.style.display = tipo === 'compras' ? '' : 'none';
    if (blocoTermos) blocoTermos.style.display = tipo === 'contratos' ? '' : 'none';
}

/* ---------- carga sob demanda ---------- */

/**
 * Primeiro clique: carrega e mostra.
 * Cliques seguintes: apenas alternam entre mostrar e ocultar.
 */

async function alternarConteudo({ botaoId, areaId, marcador, rotulo, carregar, render }) {
    const botao = document.getElementById(botaoId);
    const area = document.getElementById(areaId);
    if (!botao || !area) return;

    const oculto = area.style.display === 'none';

    if (jaCarregado[marcador]) {
        area.style.display = oculto ? '' : 'none';
        botao.textContent = oculto ? `Ocultar ${rotulo}` : `Ver ${rotulo}`;
        return;
    }

    botao.disabled = true;
    area.style.display = '';
    area.innerHTML = `<p><span class="carregando"></span> Carregando ${rotulo}...</p>`;

    try {
        render(await carregar());
        jaCarregado[marcador] = true;
        botao.textContent = `Ocultar ${rotulo}`;
    } catch (erro) {
        area.innerHTML = `<div class="aviso erro">${escapar(mensagemErro(erro))}</div>`;
        botao.textContent = `Ver ${rotulo}`;
    } finally {
        botao.disabled = false;
    }
}

function alternarDocumentos() {
    return alternarConteudo({
        botaoId: 'btnDocumentos',
        areaId: 'arquivos',
        marcador: 'documentos',
        rotulo: 'documentos',
        carregar: () => PNCP.arquivos(itemUrlAtual),
        render: lista => renderArquivos(lista, itemUrlAtual)
    });
}

function alternarItens() {
    return alternarConteudo({
        botaoId: 'btnItens',
        areaId: 'itens',
        marcador: 'itens',
        rotulo: 'itens e preços',
        carregar: () => PNCP.itens(itemUrlAtual),
        render: lista => renderItens(lista, itemUrlAtual)
    });
}

function alternarTermos() {
    return alternarConteudo({
        botaoId: 'btnTermos',
        areaId: 'termos',
        marcador: 'termos',
        rotulo: 'termos',
        carregar: () => PNCP.termos(itemUrlAtual),
        render: renderTermos
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('ativo'));

    // Conteúdo pesado começa oculto e só carrega no clique
    ['arquivos', 'itens', 'termos'].forEach(id => {
        const area = document.getElementById(id);
        if (area) area.style.display = 'none';
    });

    const botoes = [
        ['btnDocumentos', alternarDocumentos],
        ['btnItens', alternarItens],
        ['btnTermos', alternarTermos]
    ];

    botoes.forEach(([id, acao]) => {
        const botao = document.getElementById(id);
        if (botao) botao.addEventListener('click', acao);
    });

    // Delegação: os botões de preço nascem depois, junto com a tabela
    const areaItens = document.getElementById('itens');
    if (areaItens) {
        areaItens.addEventListener('click', evento => {
            const botao = evento.target.closest('button[data-precos]');
            if (!botao) return;
            verPrecos(botao, botao.dataset.url, Number(botao.dataset.item));
        });
    }

    carregar();
});
