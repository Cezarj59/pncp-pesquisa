/* ====== Página de resultados ====== */

const POR_PAGINA = 20;
const CHAVE_CACHE = 'pncp:ultima-busca';
const CACHE_TTL = 5 * 60 * 1000;

let estado = {
    tipo: 'edital',
    params: new URLSearchParams(),
    todos: [],
    filtrados: [],
    pagina: 1,
    ordenacao: 'data',
    proximaPagina: 1,
    parouPor: 'inicio',
    completou: true
};

let controladorBusca = null;

/* ---------- utilidades ---------- */

function normalizar(v) {
    return String(v ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function contem(valor, termo) {
    return normalizar(valor).includes(normalizar(termo));
}

function numero(v) {
    // Campo vazio precisa virar null, não 0 — senão o filtro de valor
    // máximo exclui todo registro que tenha valor.
    if (v === null || v === undefined || v === '') return null;

    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function moeda(v) {
    const n = numero(v);
    if (n === null) return '<span class="mudo">—</span>';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function data(v) {
    if (!v) return '<span class="mudo">—</span>';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '<span class="mudo">—</span>';
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function escapar(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function dataEmMs(item) {
    const v = item.data_publicacao_pncp || item.data_assinatura;
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}

/** Valor usado para exibir e ordenar. */
function valorPrincipal(item) {
    const estimado = numero(item.valor_total_estimado) || 0;
    const homologado = numero(item.valor_total_homologado) || 0;
    const global = numero(item.valor_global) || 0;

    return estado.tipo === 'contrato'
        ? (global || homologado)
        : (estimado || homologado);
}

/* ---------- filtros sobre os registros carregados ---------- */

function situacaoOk(situacao, item) {
    if (!situacao) return true;
    return contem(item.situacao_nome, situacao);
}

/**
 * Situação da disputa, deduzida das datas de recebimento de propostas.
 * O PNCP não expõe esse estado como filtro; ele é calculado aqui.
 */
function statusOk(status, item) {
    if (!status) return true;

    if (status === 'homologadas') {
        return item.tem_resultado === true;
    }

    const agora = new Date();

    const inicio = item.data_inicio_recebimento_propostas
        ? new Date(item.data_inicio_recebimento_propostas) : null;

    const fim = item.data_fim_recebimento_propostas
        ? new Date(item.data_fim_recebimento_propostas) : null;

    if (status === 'encerradas') {
        return fim !== null && !Number.isNaN(fim.getTime()) && fim < agora;
    }

    if (status === 'recebendo') {
        if (!inicio || !fim) return false;
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return false;
        return agora >= inicio && agora <= fim;
    }

    return true;
}

function aplicarFiltros(itens) {
    const p = estado.params;
    const tipo = estado.tipo;

    const ufs = (p.get('uf') || '')
        .split(',')
        .map(uf => uf.trim().toUpperCase())
        .filter(Boolean);

    const municipio = p.get('municipio');
    const orgao = p.get('orgao');
    const esfera = p.get('esfera');
    const poder = p.get('poder');
    const modalidade = p.get('modalidade');
    const situacao = p.get('situacao');
    const srp = p.get('srp');
    const adesao = p.get('adesao');
    const cancelada = p.get('cancelada');
    const status = p.get('status');
    const fornecedor = p.get('fornecedor');
    const tipoContrato = p.get('tipoContrato');
    const valorMin = numero(p.get('valorMin'));
    const valorMax = numero(p.get('valorMax'));
    const comValor = p.get('comValor');

    const dias = Number(p.get('dias') || 0);
    const corte = dias > 0 ? new Date(Date.now() - dias * 86400000) : null;

    const nomeModalidade = modalidade
        ? (MODALIDADES.find(m => m[0] === modalidade) || [])[1] || ''
        : '';

    return itens.filter(item => {
        if (ufs.length && !ufs.includes(String(item.uf || '').toUpperCase())) return false;
        if (municipio && !contem(item.municipio_nome, municipio)) return false;
        if (orgao && !contem(item.orgao_nome, orgao) && !contem(item.orgao_cnpj, orgao)) return false;
        if (esfera && !contem(item.esfera_nome, esfera)) return false;
        if (poder && !contem(item.poder_nome, poder)) return false;
        if (situacaoOk(situacao, item) === false) return false;
        if (statusOk(status, item) === false) return false;

        if (nomeModalidade && !contem(item.modalidade_licitacao_nome, nomeModalidade)) return false;

        if (srp === 'sim' && !item.srp) return false;
        if (srp === 'nao' && item.srp) return false;

        if (adesao === 'sim' && !item.possibilidade_adesao) return false;
        if (adesao === 'nao' && item.possibilidade_adesao) return false;

        if (cancelada === 'nao' && item.cancelado) return false;
        if (cancelada === 'sim' && !item.cancelado) return false;

        if (fornecedor && !contem(item.fornecedor_nome, fornecedor) && !contem(item.fornecedor_ni, fornecedor)) return false;
        if (tipoContrato && !contem(item.tipo_contrato_nome, tipoContrato)) return false;

        const valor = numero(tipo === 'contrato'
            ? (item.valor_global ?? item.valor_total_homologado ?? item.valor_total_estimado)
            : (item.valor_total_estimado ?? item.valor_global));

        if (valorMin !== null && (valor === null || valor < valorMin)) return false;
        if (valorMax !== null && (valor === null || valor > valorMax)) return false;

        // Só registros cujo valor esteja realmente publicado
        if (comValor === 'sim') {
            const referencia = valorPrincipal(item);
            if (referencia <= 0) return false;
        }

        if (corte) {
            const referencia = item.data_publicacao_pncp || item.data_assinatura;
            if (referencia) {
                const d = new Date(referencia);
                if (!Number.isNaN(d.getTime()) && d < corte) return false;
            }
        }

        return true;
    });
}

/* ---------- ordenação ---------- */

function aplicarOrdenacao(lista) {
    const copia = lista.slice();

    switch (estado.ordenacao) {
        case 'valor-desc':
            return copia.sort((a, b) => valorPrincipal(b) - valorPrincipal(a));

        case 'valor-asc':
            return copia.sort((a, b) => valorPrincipal(a) - valorPrincipal(b));

        case 'orgao':
            return copia.sort((a, b) =>
                normalizar(a.orgao_nome).localeCompare(normalizar(b.orgao_nome), 'pt-BR'));

        default:
            return copia.sort((a, b) => dataEmMs(b) - dataEmMs(a));
    }
}

/* ---------- render ---------- */

const COLUNAS = {
    edital: ['Objeto', 'Órgão', 'UF', 'Modalidade', 'Situação', 'Valor estimado', 'Publicação', ''],
    ata: ['Objeto', 'Órgão', 'UF', 'Vigência', 'Adesão', 'Assinatura', ''],
    contrato: ['Objeto', 'Fornecedor', 'Órgão', 'UF', 'Valor global', 'Assinatura', '']
};

function celulas(tipo, item) {
    const objeto = `<td>${escapar(item.description || item.title || '')}</td>`;
    const orgao = `<td>${escapar(item.orgao_nome || '')}<br><span class="mudo">${escapar(item.municipio_nome || '')}</span></td>`;
    const uf = `<td>${escapar(item.uf || '')}</td>`;

    if (tipo === 'ata') {
        const vigencia = `${data(item.vigencia_inicio)} a ${data(item.vigencia_fim)}`;
        const adesao = item.possibilidade_adesao ? 'Sim' : 'Não';
        return [objeto, orgao, uf,
            `<td class="num">${vigencia}</td>`,
            `<td>${adesao}</td>`,
            `<td class="num">${data(item.data_assinatura)}</td>`];
    }

    if (tipo === 'contrato') {
        const fornecedor = `<td>${escapar(item.fornecedor_nome || '')}<br><span class="mudo">${escapar(item.fornecedor_ni || '')}</span></td>`;
        return [objeto, fornecedor, orgao, uf,
            `<td class="num">${moeda(item.valor_global)}</td>`,
            `<td class="num">${data(item.data_assinatura)}</td>`];
    }

    return [objeto, orgao, uf,
        `<td>${escapar(item.modalidade_licitacao_nome || '')}</td>`,
        `<td>${escapar(item.situacao_nome || '')}</td>`,
        `<td class="num">${moeda(item.valor_total_estimado)}</td>`,
        `<td class="num">${data(item.data_publicacao_pncp)}</td>`];
}

function renderizarTabela() {
    const area = document.getElementById('tabela');

    if (!estado.filtrados.length) {
        area.innerHTML = '<p class="mudo">Nenhum resultado para exibir.</p>';
        return;
    }

    const inicio = (estado.pagina - 1) * POR_PAGINA;
    const itens = estado.filtrados.slice(inicio, inicio + POR_PAGINA);
    const colunas = COLUNAS[estado.tipo];

    let html = `<div class="tabela-wrap"><table><thead><tr>${
        colunas.map(c => `<th scope="col">${c}</th>`).join('')
    }</tr></thead><tbody>`;

    itens.forEach(item => {
        const link = `detalhe.html?u=${encodeURIComponent(item.item_url || '')}`;
        const acao = `<td><a class="link" href="${link}">Detalhes →</a></td>`;

        // Guarda o registro para a página de detalhe exibir ao menos o
        // resumo, caso a API recuse a consulta.
        try {
            sessionStorage.setItem(`pncp:${item.item_url || ''}`, JSON.stringify(item));
        } catch (_) { /* armazenamento indisponível */ }

        html += `<tr>${celulas(estado.tipo, item).join('')}${acao}</tr>`;
    });

    html += '</tbody></table></div>';

    const totalPaginas = Math.ceil(estado.filtrados.length / POR_PAGINA);

    html += `<div class="paginacao">
        <button class="sec" ${estado.pagina <= 1 ? 'disabled' : ''} onclick="irPara(${estado.pagina - 1})">← Anterior</button>
        <span class="mudo">Página ${estado.pagina} de ${totalPaginas}</span>
        <button class="sec" ${estado.pagina >= totalPaginas ? 'disabled' : ''} onclick="irPara(${estado.pagina + 1})">Próxima →</button>
    </div>`;

    area.innerHTML = html;
}

function irPara(pagina) {
    estado.pagina = pagina;
    renderizarTabela();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- exportação ---------- */

const CABECALHOS = {
    edital: ['Objeto', 'Órgão', 'Município', 'UF', 'Modalidade', 'Situação',
             'Valor estimado', 'Valor homologado', 'Publicação', 'Link PNCP'],
    ata: ['Objeto', 'Órgão', 'Município', 'UF', 'Vigência início', 'Vigência fim',
          'Permite adesão', 'Assinatura', 'Link PNCP'],
    contrato: ['Objeto', 'Fornecedor', 'CNPJ fornecedor', 'Órgão', 'Município', 'UF',
               'Valor global', 'Assinatura', 'Link PNCP']
};

function linhaCsv(tipo, item) {
    const link = PNCP.linkPortal(item.item_url) || '';

    if (tipo === 'ata') {
        return [
            item.description || item.title || '',
            item.orgao_nome || '',
            item.municipio_nome || '',
            item.uf || '',
            item.vigencia_inicio || '',
            item.vigencia_fim || '',
            item.possibilidade_adesao ? 'Sim' : 'Não',
            item.data_assinatura || '',
            link
        ];
    }

    if (tipo === 'contrato') {
        return [
            item.description || item.title || '',
            item.fornecedor_nome || '',
            item.fornecedor_ni || '',
            item.orgao_nome || '',
            item.municipio_nome || '',
            item.uf || '',
            item.valor_global ?? '',
            item.data_assinatura || '',
            link
        ];
    }

    return [
        item.description || item.title || '',
        item.orgao_nome || '',
        item.municipio_nome || '',
        item.uf || '',
        item.modalidade_licitacao_nome || '',
        item.situacao_nome || '',
        item.valor_total_estimado ?? '',
        item.valor_total_homologado ?? '',
        item.data_publicacao_pncp || '',
        link
    ];
}

function exportarCsv() {
    if (!estado.filtrados.length) return;

    const tipo = estado.tipo;
    const linhas = estado.filtrados.map(item => linhaCsv(tipo, item));

    Relatorio.baixarCsv(
        Relatorio.nomeArquivo(tipo, estado.params.get('q')),
        CABECALHOS[tipo],
        linhas
    );
}

/* ---------- relatório de pesquisa ---------- */

const ROTULO_STATUS = {
    recebendo: 'Recebendo proposta',
    encerradas: 'Encerradas',
    homologadas: 'Com resultado homologado'
};

function descreverFiltros() {
    const p = estado.params;
    const linhas = [];

    const termo = (p.get('q') || '').trim();
    linhas.push(`Palavra-chave: ${termo || '(não informada — busca pela modalidade)'}`);

    const ufs = (p.get('uf') || '').split(',').filter(Boolean);
    linhas.push(`UF: ${ufs.length ? ufs.join(', ') : 'todas'}`);

    const modalidade = p.get('modalidade');
    if (modalidade) {
        const nome = (MODALIDADES.find(m => m[0] === modalidade) || [])[1];
        if (nome) linhas.push(`Modalidade: ${nome}`);
    }

    const status = p.get('status');
    if (status) linhas.push(`Situação da disputa: ${ROTULO_STATUS[status] || status}`);

    if (p.get('municipio')) linhas.push(`Município: ${p.get('municipio')}`);
    if (p.get('orgao')) linhas.push(`Órgão: ${p.get('orgao')}`);
    if (p.get('fornecedor')) linhas.push(`Fornecedor: ${p.get('fornecedor')}`);
    if (p.get('esfera')) linhas.push(`Esfera: ${p.get('esfera')}`);
    if (p.get('situacao')) linhas.push(`Situação: ${p.get('situacao')}`);

    const dias = Number(p.get('dias') || 0);
    if (dias > 0) linhas.push(`Período: últimos ${dias} dias`);

    const valorMin = numero(p.get('valorMin'));
    const valorMax = numero(p.get('valorMax'));

    if (valorMin !== null) {
        linhas.push(`Valor mínimo: ${valorMin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    }

    if (valorMax !== null) {
        linhas.push(`Valor máximo: ${valorMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
    }

    return linhas;
}

function abrirRelatorio() {
    if (!estado.filtrados.length) return;

    const itens = estado.filtrados.map(item => ({
        objeto: item.description || item.title || '',
        orgao: item.orgao_nome || '',
        municipio: item.municipio_nome || '',
        uf: item.uf || '',
        data: item.data_publicacao_pncp || item.data_assinatura || '',
        valorReferencia: valorPrincipal(item),
        valorEstimado: numero(item.valor_total_estimado),
        valorHomologado: numero(item.valor_total_homologado) ?? numero(item.valor_global),
        link: PNCP.linkPortal(item.item_url) || ''
    }));

    const dados = {
        geradoEm: new Date().toISOString(),
        tipo: estado.tipo,
        termo: (estado.params.get('q') || '').trim(),
        filtros: descreverFiltros(),
        itens
    };

    try {
        sessionStorage.setItem('pncp:relatorio', JSON.stringify(dados));
    } catch (_) {
        alert('Não foi possível preparar o relatório: o armazenamento do navegador está cheio.');
        return;
    }

    const janela = window.open('relatorio.html', '_blank');

    // Se o navegador bloquear a nova aba, abre na mesma
    if (!janela) window.location.href = 'relatorio.html';
}

/* ---------- cache da última busca ---------- */

function salvarCache() {
    try {
        sessionStorage.setItem(CHAVE_CACHE, JSON.stringify({
            chave: window.location.search,
            quando: Date.now(),
            itens: estado.todos,
            proximaPagina: estado.proximaPagina,
            parouPor: estado.parouPor
        }));
    } catch (_) {
        // Cota do sessionStorage: seguir sem cache
    }
}

function restaurarCache() {
    try {
        const bruto = sessionStorage.getItem(CHAVE_CACHE);
        if (!bruto) return false;

        const dados = JSON.parse(bruto);

        if (dados.chave !== window.location.search) return false;
        if (Date.now() - dados.quando > CACHE_TTL) return false;
        if (!Array.isArray(dados.itens)) return false;

        estado.todos = dados.itens;
        estado.proximaPagina = dados.proximaPagina || 1;
        estado.parouPor = dados.parouPor || 'fim';
        estado.filtrados = aplicarOrdenacao(aplicarFiltros(estado.todos));
        estado.pagina = 1;

        return true;
    } catch (_) {
        return false;
    }
}

/* ---------- mensagens ---------- */

function mensagemResultado(brutos, filtrados, completou) {
    if (filtrados === 0) {
        if (brutos > 0) {
            return `<div class="aviso">Nenhum resultado com esses filtros.
                Foram encontrados ${brutos} registros no período, mas nenhum atende
                ao que foi pedido. Tente ampliar os filtros.</div>`;
        }

        return completou
            ? `<div class="aviso">Nenhum resultado encontrado.
               Tente outra palavra-chave, aumente o período ou escolha
               "Todas" em Situação da disputa.</div>`
            : `<div class="aviso erro">Não foi possível concluir a busca agora.
               Tente novamente em alguns instantes.</div>`;
    }

    const texto = filtrados === 1 ? '1 resultado encontrado' : `${filtrados} resultados encontrados`;

    return completou
        ? `<div class="aviso ok">${texto}.</div>`
        : `<div class="aviso ok">${texto}. A busca foi interrompida antes do fim.</div>`;
}

/* ---------- busca ---------- */

async function carregar() {
    const status = document.getElementById('status');
    const params = estado.params;

    // A API exige termo OU status. Sem palavra-chave, a busca usa o nome
    // da modalidade selecionada (padrão: Pregão Eletrônico).
    const termoInformado = (params.get('q') || '').trim();
    const modalidadeId = params.get('modalidade') || '6';
    const nomeModalidade = (MODALIDADES.find(m => m[0] === modalidadeId) || [])[1] || '';
    const termo = termoInformado || nomeModalidade || 'pregão eletrônico';

    const statusApi = {
        encerradas: 'encerradas',
        recebendo: 'recebendo_proposta',
        // Homologadas são um subconjunto das encerradas: pedir só as
        // encerradas deixa a amostra mais densa para o filtro local.
        homologadas: 'encerradas'
    }[params.get('status')] || null;

    // Voltando do detalhe: reaproveita o resultado recente
    if (restaurarCache()) {
        status.innerHTML = mensagemResultado(
            estado.todos.length, estado.filtrados.length, estado.completou);
        renderizarTabela();
        atualizarBotaoBuscarMais();
        return;
    }

    if (controladorBusca) controladorBusca.abort();
    controladorBusca = new AbortController();

    status.innerHTML = '<div class="aviso"><span class="carregando"></span> Buscando no PNCP...</div>';

    let ultimoAviso = 0;

    try {
        const resultado = await MotorBusca.executar({
            termo,
            tipo: estado.tipo,
            status: statusApi,
            sinal: controladorBusca.signal,
            aplicarFiltros,
            aoProgresso: ({ filtrados }) => {
                const agora = Date.now();
                if (agora - ultimoAviso < 400) return;
                ultimoAviso = agora;

                status.innerHTML = `<div class="aviso"><span class="carregando"></span>
                    Buscando... ${filtrados} resultado(s) até agora.</div>`;
            }
        });

        estado.todos = resultado.itens;
        estado.proximaPagina = resultado.paginasLidas + 1;
        estado.parouPor = resultado.parouPor;
        estado.completou = resultado.completou;
        estado.filtrados = aplicarOrdenacao(aplicarFiltros(resultado.itens));
        estado.pagina = 1;

        status.innerHTML = mensagemResultado(
            resultado.itens.length, estado.filtrados.length, resultado.completou);

        renderizarTabela();
        atualizarBotaoBuscarMais();
        salvarCache();

    } catch (erro) {
        if (erro && erro.name === 'AbortError') return;

        document.getElementById('tabela').innerHTML = '';
        status.innerHTML = `<div class="aviso erro">
            Não foi possível concluir a busca agora.
            Verifique sua conexão e tente novamente em alguns instantes.
        </div>`;
    }
}

function atualizarBotaoBuscarMais() {
    const botao = document.getElementById('btnBuscarMais');
    if (!botao) return;

    const podeContinuar = estado.parouPor === 'teto' || estado.parouPor === 'tempo';
    botao.style.display = podeContinuar ? '' : 'none';
    botao.disabled = false;
}

async function continuarBusca() {
    const status = document.getElementById('status');
    const botao = document.getElementById('btnBuscarMais');
    const params = estado.params;

    const termoInformado = (params.get('q') || '').trim();
    const modalidadeId = params.get('modalidade') || '6';
    const nomeModalidade = (MODALIDADES.find(m => m[0] === modalidadeId) || [])[1] || '';
    const termo = termoInformado || nomeModalidade || 'pregão eletrônico';

    const statusApi = {
        encerradas: 'encerradas',
        recebendo: 'recebendo_proposta',
        homologadas: 'encerradas'
    }[params.get('status')] || null;

    botao.disabled = true;
    status.innerHTML = '<div class="aviso"><span class="carregando"></span> Buscando mais...</div>';

    if (controladorBusca) controladorBusca.abort();
    controladorBusca = new AbortController();

    try {
        const resultado = await MotorBusca.executar({
            termo,
            tipo: estado.tipo,
            status: statusApi,
            sinal: controladorBusca.signal,
            paginaInicial: estado.proximaPagina,
            aplicarFiltros: lista => aplicarFiltros(estado.todos.concat(lista))
        });

        estado.todos = estado.todos.concat(resultado.itens);
        estado.proximaPagina += resultado.paginasLidas;
        estado.parouPor = resultado.parouPor;
        estado.completou = resultado.completou;
        estado.filtrados = aplicarOrdenacao(aplicarFiltros(estado.todos));
        estado.pagina = 1;

        status.innerHTML = mensagemResultado(
            estado.todos.length, estado.filtrados.length, resultado.completou);

        renderizarTabela();
        atualizarBotaoBuscarMais();
        salvarCache();

    } catch (erro) {
        if (erro && erro.name === 'AbortError') return;

        status.innerHTML = `<div class="aviso erro">
            Não foi possível buscar mais agora. Tente novamente em instantes.
        </div>`;
        botao.disabled = false;
    }
}

/* ---------- inicialização ---------- */

document.addEventListener('DOMContentLoaded', () => {
    estado.params = new URLSearchParams(window.location.search);
    estado.tipo = estado.params.get('tipo') || 'edital';

    const titulos = { edital: 'Editais', ata: 'Atas de Registro de Preços', contrato: 'Contratos' };
    document.getElementById('titulo').textContent = titulos[estado.tipo] || 'Resultados';

    document.querySelectorAll('nav a').forEach(a => {
        if (a.dataset.tipo === estado.tipo) a.classList.add('ativo');
    });

    const voltar = document.getElementById('voltar');
    if (voltar) {
        voltar.href = `${estado.tipo === 'ata' ? 'atas' : estado.tipo === 'contrato' ? 'contratos' : 'editais'}.html`;
    }

    const ordenacao = document.getElementById('ordenacao');
    if (ordenacao) {
        ordenacao.value = estado.ordenacao;
        ordenacao.addEventListener('change', () => {
            estado.ordenacao = ordenacao.value;
            estado.filtrados = aplicarOrdenacao(aplicarFiltros(estado.todos));
            estado.pagina = 1;
            renderizarTabela();
        });
    }

    const exportar = document.getElementById('btnExportar');
    if (exportar) exportar.addEventListener('click', exportarCsv);

    const relatorio = document.getElementById('btnRelatorio');
    if (relatorio) relatorio.addEventListener('click', abrirRelatorio);

    const buscarMais = document.getElementById('btnBuscarMais');
    if (buscarMais) buscarMais.addEventListener('click', continuarBusca);

    // Abandona a busca em andamento ao sair da página
    window.addEventListener('pagehide', () => {
        if (controladorBusca) controladorBusca.abort();
    });

    carregar();
});
