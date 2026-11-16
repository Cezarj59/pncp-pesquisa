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

function renderArquivos(lista) {
    const area = document.getElementById('arquivos');

    if (!lista.length) {
        area.innerHTML = '<p class="mudo">Nenhum documento publicado.</p>';
        return;
    }

    area.innerHTML = `<ul class="docs">${lista.map(doc => {
        const link = doc.url || doc.uri || '#';
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

    let html = `<div class="tabela-wrap"><table>
        <thead><tr>
            <th>#</th><th>Descrição</th><th>Qtd.</th><th>Unit. estimado</th>
            <th>Resultado</th><th></th>
        </tr></thead><tbody>`;

    itens.forEach(item => {
        const temResultado = item.temResultado ? '<span class="tag">homologado</span>' : '<span class="mudo">—</span>';
        html += `<tr>
            <td>${escapar(item.numeroItem)}</td>
            <td>${escapar(item.descricao || '')}</td>
            <td class="num">${escapar(item.quantidade ?? '')} ${escapar(item.unidadeMedida || '')}</td>
            <td class="num">${moeda(item.valorUnitarioEstimado)}</td>
            <td>${temResultado}</td>
            <td>${item.temResultado
                ? `<button class="mini" onclick="verPrecos(this, '${escapar(itemUrl)}', ${Number(item.numeroItem)})">Preços</button>
                   <div></div>`
                : ''}</td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    area.innerHTML = html;
}

async function verPrecos(botao, itemUrl, numeroItem) {
    const alvo = botao.nextElementSibling;
    alvo.innerHTML = '<span class="carregando"></span>';

    try {
        const resultados = await PNCP.resultados(itemUrl, numeroItem);

        if (!resultados.length) {
            alvo.innerHTML = '<span class="mudo">sem fornecedores</span>';
            return;
        }

        alvo.innerHTML = `<ul class="docs">${resultados.map(r => `<li>
            <strong>${escapar(r.nomeRazaoSocialFornecedor || '')}</strong>
            <br><span class="mudo">${escapar(r.niFornecedor || '')} · ${moeda(r.valorUnitarioHomologado)} · qtd ${escapar(r.quantidadeHomologada ?? '')}</span>
        </li>`).join('')}</ul>`;

    } catch (erro) {
        alvo.innerHTML = `<span class="mudo">falha: ${escapar(erro.message)}</span>`;
    }
}

function renderTermos(termos) {
    const area = document.getElementById('extras');
    if (!termos.length) return;

    const html = `<div class="card"><h2>Termos de contrato</h2>
        <ul class="docs">${termos.map(t => `<li>
            <strong>${escapar(t.numeroTermoContrato || t.sequencialTermoContrato || 'Termo')}</strong>
            <br><span class="mudo">${escapar(t.tipoTermoContratoNome || '')} · ${escapar(t.dataAssinatura || '')}</span>
        </li>`).join('')}</ul></div>`;

    area.insertAdjacentHTML('beforeend', html);
}

/* ---------- carga ---------- */

async function carregar() {
    const params = new URLSearchParams(window.location.search);
    const itemUrl = params.get('u') || '';

    const status = document.getElementById('status');

    if (!itemUrl) {
        status.innerHTML = '<div class="aviso erro">Parâmetro ausente.</div>';
        return;
    }

    const link = PNCP.linkPortal(itemUrl);
    document.getElementById('linkPortal').href = link;

    status.innerHTML = '<div class="aviso"><span class="carregando"></span> Carregando...</div>';

    try {
        const entidade = await PNCP.detalhe(itemUrl);
        renderDados(entidade);
        status.innerHTML = '';
    } catch (erro) {
        status.innerHTML = `<div class="aviso erro">Falha ao carregar os dados: ${escapar(erro.message)}</div>`;
    }

    try {
        renderArquivos(await PNCP.arquivos(itemUrl));
    } catch (erro) {
        document.getElementById('arquivos').innerHTML =
            `<div class="aviso erro">Falha ao listar documentos: ${escapar(erro.message)}</div>`;
    }

    const tipo = itemUrl.split('/').filter(Boolean)[0];

    if (tipo === 'compras') {
        try {
            renderItens(await PNCP.itens(itemUrl), itemUrl);
        } catch (erro) {
            document.getElementById('itens').innerHTML =
                `<div class="aviso erro">Falha ao listar itens: ${escapar(erro.message)}</div>`;
        }
    } else {
        const bloco = document.getElementById('bloco-itens');
        if (bloco) bloco.style.display = 'none';
    }

    if (tipo === 'contratos') {
        try {
            renderTermos(await PNCP.termos(itemUrl));
        } catch (_) { /* opcional */ }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('ativo'));
    carregar();
});
