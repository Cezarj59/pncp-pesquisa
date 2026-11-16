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

    const comResultado = itens.filter(i => i.temResultado).length;

    let html = `<div class="tabela-wrap"><table>
        <thead><tr>
            <th>#</th><th>Descrição</th><th>Qtd.</th><th>Unit. estimado</th>
            <th>Resultado</th><th></th>
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
                ? `<button class="mini" onclick="verPrecos(this, '${escapar(itemUrl)}', ${Number(item.numeroItem)})">Preços</button>
                   <div></div>`
                : ''}</td>
        </tr>`;
    });

    html += '</tbody></table></div>';

    if (comResultado === 0) {
        html += `<div class="aviso" style="margin-top:14px">
            <strong>Nenhum item desta contratação tem preço homologado publicado.</strong><br>
            O botão <em>Preços</em> só aparece em itens já julgados. Nesta contratação o
            resultado ainda não foi divulgado no PNCP.
        </div>`;
    }

    if (itens.some(i => i.orcamentoSigiloso === true)) {
        html += `<div class="aviso" style="margin-top:10px">
            Esta contratação tem <strong>orçamento sigiloso</strong>, permitido pelo
            art. 24 da Lei 14.133/2021. Por isso os valores estimados aparecem como
            zero ou ocultos — é a informação publicada, não uma falha de leitura.
        </div>`;
    }

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

    if (/failed to fetch|networkerror|load failed|network request failed/i.test(texto)) {
        return 'O PNCP não respondeu. Ele limita a quantidade de consultas por minuto — '
             + 'aguarde alguns instantes e recarregue a página.';
    }

    if (/HTTP 429/.test(texto)) {
        return 'Limite de consultas do PNCP atingido. Aguarde alguns minutos.';
    }

    return texto;
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

/* ---------- carga ---------- */

async function carregar() {
    const params = new URLSearchParams(window.location.search);
    const itemUrl = params.get('u') || '';

    const status = document.getElementById('status');

    if (!itemUrl) {
        status.innerHTML = '<div class="aviso erro">Parâmetro ausente.</div>';
        return;
    }

    document.getElementById('linkPortal').href = PNCP.linkPortal(itemUrl);

    // 1. Resumo imediato, vindo da listagem (não depende de rede)
    const resumo = lerCache(itemUrl);
    if (resumo) renderResumo(resumo);

    status.innerHTML = '<div class="aviso"><span class="carregando"></span> Buscando os dados completos...</div>';

    // 2. Dados completos
    try {
        const entidade = await PNCP.detalhe(itemUrl);
        renderDados(entidade);
        status.innerHTML = resumo
            ? ''
            : '<div class="aviso ok">Dados carregados do PNCP.</div>';
    } catch (erro) {
        status.innerHTML = `<div class="aviso${resumo ? '' : ' erro'}">
            ${resumo ? 'Exibindo os dados da listagem.' : 'Falha ao carregar os dados.'}
            ${escapar(mensagemErro(erro))}
        </div>`;
    }

    // 3. Documentos
    try {
        renderArquivos(await PNCP.arquivos(itemUrl));
    } catch (erro) {
        document.getElementById('arquivos').innerHTML =
            `<div class="aviso erro">${escapar(mensagemErro(erro))}</div>`;
    }

    const tipo = itemUrl.split('/').filter(Boolean)[0];

    // 4. Itens e preços
    if (tipo === 'compras') {
        try {
            renderItens(await PNCP.itens(itemUrl), itemUrl);
        } catch (erro) {
            document.getElementById('itens').innerHTML =
                `<div class="aviso erro">${escapar(mensagemErro(erro))}</div>`;
        }
    } else {
        const bloco = document.getElementById('bloco-itens');
        if (bloco) bloco.style.display = 'none';
    }

    // 5. Termos do contrato
    if (tipo === 'contratos') {
        try {
            renderTermos(await PNCP.termos(itemUrl));
        } catch (_) {
            /* opcional */
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('ativo'));
    carregar();
});
