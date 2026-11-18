/* ====== Página das coletas de preços ====== */

function escapar(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function moeda(valor) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) return '<span class="mudo">—</span>';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function data(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function dataHora(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Valor usado no resumo: homologado quando existe, senão estimado. */
function valorDe(item) {
    const homologado = Number(item.valorHomologado);
    if (Number.isFinite(homologado) && homologado > 0) return homologado;

    const estimado = Number(item.valorEstimado);
    if (Number.isFinite(estimado) && estimado > 0) return estimado;

    return 0;
}

/* ---------- render ---------- */

function tabelaItens(coleta) {
    if (!coleta.itens.length) {
        return '<p class="mudo">Nenhum item nesta coleta.</p>';
    }

    let html = `<div class="tabela-wrap"><table>
        <thead><tr>
            <th scope="col">#</th>
            <th scope="col">Item</th>
            <th scope="col">Órgão</th>
            <th scope="col">Data</th>
            <th scope="col">Qtd.</th>
            <th scope="col">Unit. estimado</th>
            <th scope="col">Unit. homologado</th>
            <th scope="col"></th>
        </tr></thead><tbody>`;

    coleta.itens.forEach((item, indice) => {
        html += `<tr>
            <td class="num">${indice + 1}</td>
            <td>${escapar(item.descricao)}
                ${item.fornecedor ? `<br><span class="mudo">${escapar(item.fornecedor)}</span>` : ''}</td>
            <td>${escapar(item.orgao || '')}
                <br><span class="mudo">${escapar([item.municipio, item.uf].filter(Boolean).join(' / '))}</span></td>
            <td class="num">${data(item.data)}</td>
            <td class="num">${escapar(item.quantidade ?? '')} ${escapar(item.unidade || '')}</td>
            <td class="num">${moeda(item.valorEstimado)}</td>
            <td class="num">${moeda(item.valorHomologado)}</td>
            <td><button class="mini sec"
                        data-remover="${escapar(item.chave)}"
                        data-coleta="${escapar(coleta.id)}">Remover</button></td>
        </tr>`;
    });

    return html + '</tbody></table></div>';
}

function blocoColeta(coleta, idAtiva) {
    const ativa = coleta.id === idAtiva;
    const total = coleta.itens.length;
    const suficiente = total >= Coleta.MINIMO;

    const aviso = total > 0 && !suficiente
        ? `<div class="aviso-coleta" style="display:inline-block; margin: 6px 0;">
             Faltam ${Coleta.MINIMO - total} — a pesquisa exige pelo menos ${Coleta.MINIMO} preços.
           </div>`
        : '';

    return `<details class="coleta" data-id="${escapar(coleta.id)}" ${ativa ? 'open' : ''}>
        <summary>
            <strong>${escapar(coleta.nome)}</strong>
            <span class="mudo"> · ${total === 1 ? '1 item' : `${total} itens`} · ${dataHora(coleta.criadaEm)}${
                ativa ? ' · <em>coleta ativa</em>' : ''
            }</span>
        </summary>

        <div class="coleta-acoes">
            ${ativa ? '' : `<button class="sec" data-acao="usar" data-coleta="${escapar(coleta.id)}">Usar esta</button>`}
            <button class="sec" data-acao="renomear" data-coleta="${escapar(coleta.id)}">Renomear</button>
            <button class="sec" data-acao="csv" data-coleta="${escapar(coleta.id)}" ${total ? '' : 'disabled'}>Exportar CSV</button>
            <button data-acao="relatorio" data-coleta="${escapar(coleta.id)}" ${suficiente ? '' : 'disabled'}>Gerar relatório</button>
            <button class="sec" data-acao="excluir" data-coleta="${escapar(coleta.id)}">Excluir</button>
        </div>

        ${aviso}
        ${tabelaItens(coleta)}
    </details>`;
}

function renderizar() {
    const area = document.getElementById('lista');
    const coletas = Coleta.listar();
    const idAtiva = Coleta.ativa() ? Coleta.ativa().id : null;

    const resumo = document.getElementById('resumo-geral');
    if (resumo) {
        const itens = Coleta.totalGeral();
        resumo.textContent = `${coletas.length} coleta${coletas.length === 1 ? '' : 's'} · ${
            itens === 1 ? '1 item' : `${itens} itens`}`;
    }

    if (!coletas.length) {
        area.innerHTML = `<div class="aviso">
            <strong>Nenhuma coleta ainda.</strong><br>
            Pesquise uma contratação, abra os itens e clique em <em>Adicionar</em>.
            Cada coleta guarda os itens de uma pesquisa de preços.
        </div>`;
        return;
    }

    area.innerHTML = coletas.map(c => blocoColeta(c, idAtiva)).join('');
    atualizarNavColeta();
}

/* ---------- ações ---------- */

function buscarColeta(id) {
    return Coleta.listar().find(c => c.id === id) || null;
}

function novaColeta() {
    Coleta.criar();
    renderizar();
}

function usar(id) {
    Coleta.definirAtiva(id);
    renderizar();
}

function renomear(id) {
    const coleta = buscarColeta(id);
    if (!coleta) return;

    const nome = prompt('Nome da coleta:', coleta.nome);
    if (nome === null) return;

    Coleta.renomear(id, nome);
    renderizar();
}

function excluir(id) {
    const coleta = buscarColeta(id);
    if (!coleta) return;

    if (!confirm(`Excluir "${coleta.nome}" e seus ${coleta.itens.length} item(ns)?`)) return;

    Coleta.remover(id);
    renderizar();
}

function exportarCsv(id) {
    const coleta = buscarColeta(id);
    if (!coleta || !coleta.itens.length) return;

    const cabecalhos = [
        'Item', 'Fornecedor', 'Órgão', 'Município', 'UF', 'Data',
        'Quantidade', 'Unidade', 'Valor unitário estimado',
        'Valor unitário homologado', 'Link PNCP'
    ];

    const linhas = coleta.itens.map(item => [
        item.descricao || '',
        item.fornecedor || '',
        item.orgao || '',
        item.municipio || '',
        item.uf || '',
        item.data || '',
        item.quantidade ?? '',
        item.unidade || '',
        item.valorEstimado ?? '',
        item.valorHomologado ?? '',
        item.link || ''
    ]);

    const dataArquivo = new Date().toISOString().slice(0, 10);
    Relatorio.baixarCsv(`pncp-coleta-${dataArquivo}.csv`, cabecalhos, linhas);
}

function gerarRelatorio(id) {
    const coleta = buscarColeta(id);
    if (!coleta || coleta.itens.length < Coleta.MINIMO) return;

    const dados = {
        geradoEm: new Date().toISOString(),
        tipo: 'coleta',
        termo: coleta.nome,
        filtros: ['Itens selecionados manualmente na coleta de preços'],
        encontrados: coleta.itens.length,
        selecionados: coleta.itens.length,
        itens: coleta.itens.map(item => ({
            objeto: item.descricao || '',
            orgao: item.orgao || '',
            municipio: item.municipio || '',
            uf: item.uf || '',
            data: item.data || '',
            quantidade: item.quantidade,
            unidade: item.unidade || '',
            valorReferencia: valorDe(item),
            valorEstimado: item.valorEstimado,
            valorHomologado: item.valorHomologado,
            fornecedor: item.fornecedor || '',
            link: item.link || ''
        }))
    };

    try {
        sessionStorage.setItem('pncp:relatorio', JSON.stringify(dados));
    } catch (_) {
        alert('Não foi possível preparar o relatório: o armazenamento do navegador está cheio.');
        return;
    }

    const janela = window.open('relatorio.html', '_blank');
    if (!janela) window.location.href = 'relatorio.html';

    // A coleta está encerrada: os próximos itens vão para uma nova
    Coleta.encerrarAtiva();

    const aviso = document.getElementById('aviso');
    if (aviso) {
        aviso.innerHTML = `<div class="aviso ok" style="margin-bottom: 10px;">
            Relatório gerado. Esta coleta está encerrada — os próximos itens
            adicionados vão para uma nova coleta.
        </div>`;
    }
}

function removerItem(coletaId, chave) {
    Coleta.removerItem(coletaId, chave);
    renderizar();
}

/* ---------- inicialização ---------- */

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === 'coleta.html') a.classList.add('ativo');
    });

    const lista = document.getElementById('lista');

    if (lista) {
        lista.addEventListener('click', evento => {
            const remover = evento.target.closest('button[data-remover]');
            if (remover) {
                removerItem(remover.dataset.coleta, remover.dataset.remover);
                return;
            }

            const acao = evento.target.closest('button[data-acao]');
            if (!acao) return;

            const id = acao.dataset.coleta;

            if (acao.dataset.acao === 'usar') usar(id);
            else if (acao.dataset.acao === 'renomear') renomear(id);
            else if (acao.dataset.acao === 'excluir') excluir(id);
            else if (acao.dataset.acao === 'csv') exportarCsv(id);
            else if (acao.dataset.acao === 'relatorio') gerarRelatorio(id);
        });
    }

    document.getElementById('btnNovaColeta').addEventListener('click', novaColeta);

    renderizar();
});
