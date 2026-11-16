/* ====== Página de resultados ====== */

const POR_PAGINA = 20;

let estado = {
    tipo: 'edital',
    params: new URLSearchParams(),
    todos: [],
    filtrados: [],
    pagina: 1,
    analisados: 0,
    totalPncp: 0
};

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

/* ---------- filtros sobre os registros carregados ---------- */

function aplicarFiltros(itens) {
    const p = estado.params;
    const tipo = estado.tipo;

    const uf = p.get('uf');
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
        if (uf && String(item.uf || '').toUpperCase() !== uf) return false;
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
            const estimado = numero(item.valor_total_estimado) || 0;
            const homologado = numero(item.valor_total_homologado) || 0;
            const global = numero(item.valor_global) || 0;

            const referencia = tipo === 'contrato'
                ? (global || homologado)
                : (estimado || homologado);

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
        return fim !== null
            && !Number.isNaN(fim.getTime())
            && fim < agora;
    }

    if (status === 'recebendo') {
        if (!inicio || !fim) return false;
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return false;
        return agora >= inicio && agora <= fim;
    }

    return true;
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
        area.innerHTML = `<div class="aviso">Nenhum registro encontrado com esses filtros
            entre os ${estado.analisados} analisados.</div>`;
        return;
    }

    const inicio = (estado.pagina - 1) * POR_PAGINA;
    const itens = estado.filtrados.slice(inicio, inicio + POR_PAGINA);
    const colunas = COLUNAS[estado.tipo];

    let html = `<div class="tabela-wrap"><table><thead><tr>${
        colunas.map(c => `<th>${c}</th>`).join('')
    }</tr></thead><tbody>`;

    itens.forEach(item => {
        const link = `detalhe.html?u=${encodeURIComponent(item.item_url || '')}`;
        const acao = `<td><a class="link" href="${link}">Detalhes →</a></td>`;

        // Guarda o registro para a página de detalhe conseguir exibir
        // ao menos o resumo, caso a API recuse a consulta.
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

/* ---------- carga ---------- */

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
        recebendo: 'recebendo_proposta'
    }[params.get('status')] || null;

    const paginas = Math.max(1, Math.min(12, Number(params.get('paginas') || 3)));

    const avisoPadrao = termoInformado
        ? ''
        : `<br><span class="mudo">Sem palavra-chave: buscando por
             "${escapar(termo)}" e filtrando pela modalidade selecionada.</span>`;

    status.innerHTML = `<div class="aviso"><span class="carregando"></span>
        Consultando o PNCP — ${paginas} página(s)...${avisoPadrao}</div>`;

    const acumulado = [];
    let totalPncp = 0;

    try {
        for (let pagina = 1; pagina <= paginas; pagina++) {
            const dados = await PNCP.buscar({
                termo, tipo: estado.tipo, pagina, tamPagina: 50, status: statusApi
            });

            if (!dados) break;

            totalPncp = dados.total || totalPncp;
            const itens = dados.items || [];
            if (!itens.length) break;

            acumulado.push(...itens);

            status.innerHTML = `<div class="aviso"><span class="carregando"></span>
                Carregando... ${acumulado.length} registros lidos de ${totalPncp}${avisoPadrao}</div>`;

            if (pagina < paginas) await new Promise(r => setTimeout(r, 300));
        }

        estado.todos = acumulado;
        estado.analisados = acumulado.length;
        estado.totalPncp = totalPncp;
        estado.filtrados = aplicarFiltros(acumulado);
        estado.pagina = 1;

        status.innerHTML = `<div class="aviso ok">
            <strong>${estado.filtrados.length}</strong> registro(s) após os filtros ·
            <strong>${estado.analisados}</strong> analisados ·
            ${totalPncp.toLocaleString('pt-BR')} no PNCP para este termo
            ${termoInformado ? `("${escapar(termo)}")` : `("${escapar(termo)}" — padrão)`}
            ${avisoPadrao}
        </div>`;

        renderizarTabela();

    } catch (erro) {
        status.innerHTML = `<div class="aviso erro">
            <strong>Falha na consulta.</strong> ${escapar(erro.message)}<br>
            O PNCP pode estar limitando requisições. Aguarde alguns segundos e tente novamente.
        </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    estado.params = new URLSearchParams(window.location.search);
    estado.tipo = estado.params.get('tipo') || 'edital';

    const titulos = { edital: 'Editais', ata: 'Atas de Registro de Preços', contrato: 'Contratos' };
    document.getElementById('titulo').textContent = titulos[estado.tipo] || 'Resultados';

    document.querySelectorAll('nav a').forEach(a => {
        if (a.dataset.tipo === estado.tipo) a.classList.add('ativo');
    });

    const voltar = document.getElementById('voltar');
    if (voltar) voltar.href = `${estado.tipo === 'ata' ? 'atas' : estado.tipo === 'contrato' ? 'contratos' : 'editais'}.html`;

    carregar();
});
