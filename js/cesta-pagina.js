/* ====== Página da cesta de pesquisa ====== */

const TIPOS = {
    edital: 'Contratação',
    ata: 'Ata de preços',
    contrato: 'Contrato'
};

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

/** Valor usado no resumo: homologado quando existe, senão estimado. */
function valorDe(item) {
    const homologado = Number(item.valorHomologado);
    if (Number.isFinite(homologado) && homologado > 0) return homologado;

    const estimado = Number(item.valorEstimado);
    if (Number.isFinite(estimado) && estimado > 0) return estimado;

    return 0;
}

/* ---------- render ---------- */

function renderizarLista(itens) {
    const area = document.getElementById('lista');

    if (!itens.length) {
        area.innerHTML = `<div class="aviso">
            <strong>A cesta está vazia.</strong><br>
            Pesquise uma contratação, abra os itens e clique em
            <em>Adicionar</em> nos preços que interessam.
        </div>`;
        return;
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

    itens.forEach((item, indice) => {
        html += `<tr>
            <td class="num">${indice + 1}</td>
            <td>${escapar(item.descricao)}
                <br><span class="mudo">${escapar(TIPOS[item.tipo] || '')}${
                    item.fornecedor ? ` · ${escapar(item.fornecedor)}` : ''
                }</span></td>
            <td>${escapar(item.orgao || '')}
                <br><span class="mudo">${escapar([item.municipio, item.uf].filter(Boolean).join(' / '))}</span></td>
            <td class="num">${data(item.data)}</td>
            <td class="num">${escapar(item.quantidade ?? '')} ${escapar(item.unidade || '')}</td>
            <td class="num">${moeda(item.valorEstimado)}</td>
            <td class="num">${moeda(item.valorHomologado)}</td>
            <td><button class="mini sec" data-remover="${escapar(item.chave)}">Remover</button></td>
        </tr>`;
    });

    html += '</tbody></table></div>';

    area.innerHTML = html;
}

function renderizarResumo(itens) {
    const bloco = document.getElementById('bloco-resumo');
    const area = document.getElementById('resumo');

    if (!itens.length) {
        bloco.style.display = 'none';
        return;
    }

    const valores = itens.map(valorDe);
    const estat = RelatorioPesquisa.estatisticas(valores);

    bloco.style.display = '';

    if (!estat) {
        area.innerHTML = '<p class="mudo">Nenhum item da cesta tem valor publicado.</p>';
        return;
    }

    area.innerHTML = `<div class="dados">
        <div class="dado"><div class="rotulo">Itens na cesta</div><div class="valor">${itens.length}</div></div>
        <div class="dado"><div class="rotulo">Com valor</div><div class="valor">${estat.quantidade}</div></div>
        <div class="dado"><div class="rotulo">Menor</div><div class="valor">${moeda(estat.minimo)}</div></div>
        <div class="dado"><div class="rotulo">Mediana</div><div class="valor">${moeda(estat.mediana)}</div></div>
        <div class="dado"><div class="rotulo">Média</div><div class="valor">${moeda(estat.media)}</div></div>
        <div class="dado"><div class="rotulo">Maior</div><div class="valor">${moeda(estat.maximo)}</div></div>
    </div>`;
}

function renderizarAviso(total) {
    const area = document.getElementById('aviso');
    const faltam = Cesta.MINIMO - total;

    if (total > 0 && faltam > 0) {
        area.innerHTML = `<div class="aviso-cesta" style="display: inline-block; margin-bottom: 10px;">
            Faltam ${faltam} — a pesquisa exige pelo menos ${Cesta.MINIMO} preços.
        </div>`;
        return;
    }

    area.innerHTML = '';
}

function atualizarBotoes(total) {
    const suficiente = total >= Cesta.MINIMO;

    const relatorio = document.getElementById('btnRelatorio');
    relatorio.disabled = !suficiente;
    relatorio.textContent = total ? `Gerar relatório (${total})` : 'Gerar relatório';

    const exportar = document.getElementById('btnExportar');
    exportar.disabled = total === 0;

    const contador = document.getElementById('contador-cesta');
    contador.textContent = total === 1 ? '1 item' : `${total} itens`;

    const link = document.getElementById('link-cesta');
    if (link) {
        link.textContent = total ? `Cesta (${total})` : 'Cesta';
        link.classList.toggle('com-itens', total > 0);
    }
}

/* ---------- ações ---------- */

function atualizar() {
    const itens = Cesta.ler();

    renderizarLista(itens);
    renderizarResumo(itens);
    renderizarAviso(itens.length);
    atualizarBotoes(itens.length);
}

function remover(chave) {
    Cesta.remover(chave);
    atualizar();
}

function limpar() {
    if (!confirm('Remover todos os itens da cesta?')) return;
    Cesta.limpar();
    atualizar();
}

function exportarCsv() {
    const itens = Cesta.ler();
    if (!itens.length) return;

    const cabecalhos = [
        'Item', 'Fornecedor', 'Órgão', 'Município', 'UF', 'Data',
        'Quantidade', 'Unidade', 'Valor unitário estimado',
        'Valor unitário homologado', 'Link PNCP'
    ];

    const linhas = itens.map(item => [
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
    Relatorio.baixarCsv(`pncp-cesta-${dataArquivo}.csv`, cabecalhos, linhas);
}

function abrirRelatorio() {
    const itens = Cesta.ler();
    if (itens.length < Cesta.MINIMO) return;

    const dados = {
        geradoEm: new Date().toISOString(),
        tipo: 'cesta',
        termo: '',
        filtros: ['Itens selecionados manualmente na cesta de pesquisa'],
        encontrados: itens.length,
        selecionados: itens.length,
        itens: itens.map(item => ({
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
}

/* ---------- inicialização ---------- */

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('nav a').forEach(a => {
        if (a.getAttribute('href') === 'cesta.html') a.classList.add('ativo');
    });

    const lista = document.getElementById('lista');
    if (lista) {
        lista.addEventListener('click', evento => {
            const botao = evento.target.closest('button[data-remover]');
            if (botao) remover(botao.dataset.remover);
        });
    }

    document.getElementById('btnLimpar').addEventListener('click', limpar);
    document.getElementById('btnExportar').addEventListener('click', exportarCsv);
    document.getElementById('btnRelatorio').addEventListener('click', abrirRelatorio);

    atualizar();
});
