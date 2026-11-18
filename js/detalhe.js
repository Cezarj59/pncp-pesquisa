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

/** Converte para número sem transformar vazio em zero. */
function numeroOuNulo(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/* ---------- estado da página ---------- */

let itemUrlAtual = '';
const jaCarregado = { documentos: false, itens: false, termos: false };

// Contexto da contratação, usado ao adicionar itens à coleta
let contextoAtual = { orgao: '', uf: '', municipio: '', data: '', link: '' };

// Termo da pesquisa que levou até esta contratação (nomeia a coleta)
let termoBusca = '';

// Itens exibidos e preços já consultados (por número do item)
let itensCarregados = [];
const precosPorItem = new Map();

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

/**
 * Guarda órgão, UF, município e data para o registro da coleta.
 * Aceita tanto o formato da listagem quanto o do detalhe.
 */
function definirContexto(fonte) {
    if (!fonte) return;

    const unidade = fonte.unidadeOrgao || {};

    const orgao = fonte.orgao_nome
        || (fonte.orgaoEntidade && fonte.orgaoEntidade.razaoSocial)
        || '';

    const uf = fonte.uf || unidade.ufSigla || '';
    const municipio = fonte.municipio_nome || unidade.municipioNome || '';
    const data = fonte.data_publicacao_pncp || fonte.dataPublicacaoPncp || fonte.data_assinatura || '';

    contextoAtual = {
        orgao: orgao || contextoAtual.orgao,
        uf: uf || contextoAtual.uf,
        municipio: municipio || contextoAtual.municipio,
        data: data || contextoAtual.data,
        link: PNCP.linkPortal(itemUrlAtual) || contextoAtual.link
    };
}

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

    definirContexto(entidade);
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

/** Valor unitário homologado, se o próprio item já trouxer. */
function homologadoDoItem(item) {
    return numeroOuNulo(item.valorUnitarioHomologado)
        ?? numeroOuNulo(item.valor_unitario_homologado)
        ?? numeroOuNulo(item.valorHomologado);
}

/** Menor preço homologado entre os fornecedores do item. */
function melhorPreco(resultados) {
    let melhor = null;
    let fornecedores = 0;

    (resultados || []).forEach(registro => {
        const valor = numeroOuNulo(registro.valorUnitarioHomologado);
        if (valor === null || valor <= 0) return;

        fornecedores++;

        if (!melhor || valor < melhor.valor) {
            melhor = {
                valor,
                fornecedor: registro.nomeRazaoSocialFornecedor || '',
                quantidade: registro.quantidadeHomologada ?? null
            };
        }
    });

    if (melhor) melhor.fornecedores = fornecedores;
    return melhor;
}

function renderItens(itens, itemUrl) {
    const area = document.getElementById('itens');

    if (!itens.length) {
        area.innerHTML = '<p class="mudo">Nenhum item publicado.</p>';
        return;
    }

    itensCarregados = itens;

    const comResultado = itens.filter(i => i.temResultado).length;

    const coletaAtiva = Coleta.ativa();
    const destino = coletaAtiva
        ? `<strong>${escapar(coletaAtiva.nome)}</strong> (${coletaAtiva.itens.length} ${
            coletaAtiva.itens.length === 1 ? 'item' : 'itens'})`
        : 'uma nova coleta';

    const avisoColeta = `<p class="mudo" style="margin-bottom: 10px">
        Os itens adicionados vão para: ${destino}.
        <a class="link" href="coleta.html">Ver coletas</a>
    </p>`;

    let html = avisoColeta + `<div class="tabela-wrap"><table>
        <thead><tr>
            <th scope="col">#</th>
            <th scope="col">Descrição</th>
            <th scope="col">Qtd.</th>
            <th scope="col">Unit. estimado</th>
            <th scope="col">Resultado</th>
            <th scope="col">Ações</th>
        </tr></thead><tbody>`;

    itens.forEach(item => {
        const sigiloso = item.orcamentoSigiloso === true;
        const numeroItem = Number(item.numeroItem);

        const estimado = sigiloso
            ? '<span class="tag">sigiloso</span>'
            : moeda(item.valorUnitarioEstimado);

        const situacao = item.temResultado
            ? '<span class="tag">homologado</span>'
            : '<span class="mudo">sem resultado</span>';

        const naColeta = Coleta.contem(itemUrl, numeroItem);
        const podeAdicionar = item.temResultado || (!sigiloso && numeroOuNulo(item.valorUnitarioEstimado) > 0);

        html += `<tr>
            <td>${escapar(item.numeroItem)}</td>
            <td>${escapar(item.descricao || '')}</td>
            <td class="num">${escapar(item.quantidade ?? '')} ${escapar(item.unidadeMedida || '')}</td>
            <td class="num">${estimado}</td>
            <td>${situacao}</td>
            <td class="acoes-item">
                ${item.temResultado
                    ? `<button class="mini" data-precos="1" data-url="${escapar(itemUrl)}" data-item="${numeroItem}">Preços</button>`
                    : ''}
                <button class="mini" data-adicionar="1"
                        data-url="${escapar(itemUrl)}"
                        data-item="${numeroItem}"
                        ${naColeta || !podeAdicionar ? 'disabled' : ''}>
                    ${naColeta ? 'Na coleta ✓' : 'Adicionar'}
                </button>
            </td>
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
    atualizarLinkColeta();
}

/** Consulta os preços homologados do item e preenche a coluna. */
async function carregarPrecos(itemUrl, numeroItem) {
    const jaTem = precosPorItem.get(numeroItem);
    if (jaTem) return jaTem;

    const chaveCache = `pncp:item:${itemUrl}#${numeroItem}`;
    let resultados = lerCacheItem(chaveCache);

    if (!resultados) {
        resultados = await PNCP.resultados(itemUrl, numeroItem);
        gravarCacheItem(chaveCache, resultados);
    }

    const melhor = melhorPreco(resultados);
    const registro = { resultados, ...(melhor || { valor: null, fornecedor: '', fornecedores: 0 }) };

    precosPorItem.set(numeroItem, registro);
    return registro;
}

/* ---------- cache dos preços por item ---------- */

const CACHE_ITEM_TTL = 5 * 60 * 1000;

function lerCacheItem(chave) {
    try {
        const bruto = sessionStorage.getItem(chave);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (Date.now() - dados.quando > CACHE_ITEM_TTL) return null;

        return dados.resultados;
    } catch (_) {
        return null;
    }
}

function gravarCacheItem(chave, resultados) {
    try {
        sessionStorage.setItem(chave, JSON.stringify({
            quando: Date.now(),
            resultados
        }));
    } catch (_) {
        // Cota do sessionStorage: seguir sem cache
    }
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
        const registro = await carregarPrecos(itemUrl, numeroItem);
        const resultados = registro.resultados || [];

        if (!resultados.length) {
            celula.innerHTML = '<span class="mudo">Nenhum fornecedor homologado para este item.</span>';
            return;
        }

        const item = itensCarregados.find(i => Number(i.numeroItem) === Number(numeroItem));
        const sigiloso = item && item.orcamentoSigiloso === true;
        const estimado = sigiloso ? null : numeroOuNulo(item && item.valorUnitarioEstimado);

        const linhas = resultados.map(r => `<tr>
            <td>${escapar(r.nomeRazaoSocialFornecedor || '')}
                <br><span class="mudo">${escapar(r.niFornecedor || '')}</span></td>
            <td class="num">${moeda(r.valorUnitarioHomologado)}</td>
            <td class="num">${escapar(r.quantidadeHomologada ?? '—')}</td>
        </tr>`).join('');

        celula.innerHTML = `
            <div class="precos-contexto">
                <span class="mudo">Valor unitário estimado deste item</span>
                <strong>${estimado === null ? '<span class="tag">sigiloso</span>' : moeda(estimado)}</strong>
            </div>
            <div class="tabela-wrap">
                <table class="precos-tabela">
                    <thead><tr>
                        <th scope="col">Fornecedor</th>
                        <th scope="col">Valor unitário homologado</th>
                        <th scope="col">Qtd. homologada</th>
                    </tr></thead>
                    <tbody>${linhas}</tbody>
                </table>
            </div>`;

    } catch (erro) {
        celula.innerHTML = `<span class="mudo">${escapar(mensagemErro(erro))}</span>`;
    } finally {
        botao.disabled = false;
    }
}

/** Adiciona o item à coleta de preços. */
async function adicionarItem(botao) {
    const itemUrl = botao.dataset.url;
    const numeroItem = Number(botao.dataset.item);

    const item = itensCarregados.find(i => Number(i.numeroItem) === numeroItem);
    if (!item) return;

    const textoOriginal = botao.textContent.trim();
    botao.disabled = true;
    botao.textContent = 'Adicionando...';

    try {
        // Só consulta fornecedores quando o item tem resultado; sem resultado
        // não há preço homologado a buscar.
        const registro = item.temResultado
            ? await carregarPrecos(itemUrl, numeroItem)
            : null;

        const estimado = numeroOuNulo(item.valorUnitarioEstimado);
        const homologado = registro && registro.valor ? registro.valor : homologadoDoItem(item);

        const resultado = Coleta.adicionar({
            itemUrl,
            numeroItem,
            tipo: itemUrl.startsWith('/atas/') ? 'ata'
                : itemUrl.startsWith('/contratos/') ? 'contrato' : 'edital',
            busca: termoBusca,
            descricao: item.descricao || '',
            unidade: item.unidadeMedida || '',
            quantidade: numeroOuNulo(item.quantidade),
            valorEstimado: estimado,
            valorHomologado: homologado,
            fornecedor: registro ? registro.fornecedor : '',
            orgao: contextoAtual.orgao,
            uf: contextoAtual.uf,
            municipio: contextoAtual.municipio,
            data: contextoAtual.data,
            link: contextoAtual.link
        });

        if (resultado.ok || resultado.motivo === 'repetido') {
            botao.textContent = 'Na coleta ✓';
            botao.disabled = true;
        } else {
            botao.textContent = textoOriginal;
            botao.disabled = false;
            alert('Não foi possível guardar o item: o armazenamento do navegador está cheio.');
        }

    } catch (erro) {
        botao.textContent = textoOriginal;
        botao.disabled = false;
        alert(`Não foi possível buscar o preço homologado deste item.\n\n${mensagemErro(erro)}\n\nO item não foi adicionado à coleta.`);
    }

    atualizarLinkColeta();
}

/** Mostra a quantidade de itens da coleta no topo da página. */
function atualizarLinkColeta() {
    if (typeof atualizarNavColeta === 'function') atualizarNavColeta();
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

    definirContexto(item);
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
    termoBusca = (params.get('q') || '').trim();

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

    // Delegação: os botões nascem depois, junto com a tabela de itens
    const areaItens = document.getElementById('itens');
    if (areaItens) {
        areaItens.addEventListener('click', evento => {
            const precos = evento.target.closest('button[data-precos]');
            if (precos) {
                verPrecos(precos, precos.dataset.url, Number(precos.dataset.item));
                return;
            }

            const adicionar = evento.target.closest('button[data-adicionar]');
            if (adicionar && !adicionar.disabled) {
                adicionarItem(adicionar);
            }
        });
    }

    atualizarLinkColeta();

    carregar();
});
