/* ====== Configuração e renderização dos filtros ====== */

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
             'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const REGIOES = [
    ['Sul', ['PR', 'SC', 'RS']],
    ['Sudeste', ['SP', 'RJ', 'MG', 'ES']],
    ['Centro-Oeste', ['DF', 'GO', 'MT', 'MS']],
    ['Nordeste', ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA']],
    ['Norte', ['TO', 'PA', 'AP', 'AM', 'RR', 'AC', 'RO']]
];

const MODALIDADES = [
    ['1','Leilão - Eletrônico'], ['2','Diálogo Competitivo'], ['3','Concurso'],
    ['4','Concorrência - Eletrônica'], ['5','Concorrência - Presencial'],
    ['6','Pregão - Eletrônico'], ['7','Pregão - Presencial'],
    ['8','Dispensa de Licitação'], ['9','Inexigibilidade'],
    ['10','Manifestação de Interesse'], ['11','Pré-qualificação'],
    ['12','Credenciamento'], ['13','Leilão - Presencial']
];

const PERIODOS = [
    ['30','Últimos 30 dias'], ['60','Últimos 60 dias'], ['90','Últimos 90 dias'],
    ['180','Últimos 6 meses'], ['365','Últimos 12 meses'], ['0','Sem limite de data']
];

const SITUACOES = [
    ['','Todas as situações'], ['Divulgada no PNCP','Divulgada no PNCP'],
    ['Revogada','Revogada'], ['Anulada','Anulada'], ['Suspensa','Suspensa']
];

/* Situação da disputa — deduzida das datas de recebimento de propostas */
const STATUS_DISPUTA = [
    ['','Todas'],
    ['recebendo','Recebendo proposta'],
    ['encerradas','Encerradas'],
    ['homologadas','Com resultado homologado']
];

/* Cada filtro: id, rótulo, tipo, opções, destaque, padrão */
const FILTROS = {

    edital: [
        { id: 'q', rotulo: 'Palavra-chave', tipo: 'texto', destaque: true,
          dica: 'Busca no objeto das contratações publicadas no PNCP.' },
        { id: 'uf', rotulo: 'UF', tipo: 'uf' },
        { id: 'municipio', rotulo: 'Município', tipo: 'texto' },
        { id: 'orgao', rotulo: 'Órgão / Entidade', tipo: 'texto' },
        { id: 'esfera', rotulo: 'Esfera', tipo: 'select',
          opcoes: [['','Todas'],['Federal','Federal'],['Estadual','Estadual'],['Municipal','Municipal'],['Distrital','Distrital']] },
        { id: 'poder', rotulo: 'Poder', tipo: 'select',
          opcoes: [['','Todos'],['Executivo','Executivo'],['Legislativo','Legislativo'],['Judiciário','Judiciário']] },
        { id: 'modalidade', rotulo: 'Modalidade', tipo: 'select',
          opcoes: [['','Todas'], ...MODALIDADES], padrao: '6' },
        { id: 'status', rotulo: 'Situação da disputa', tipo: 'select',
          opcoes: STATUS_DISPUTA, padrao: 'homologadas' },
        { id: 'situacao', rotulo: 'Situação no PNCP', tipo: 'select', opcoes: SITUACOES },
        { id: 'srp', rotulo: 'Registro de preços', tipo: 'select',
          opcoes: [['','Todos'],['sim','Sim'],['nao','Não']] },
        { id: 'comValor', rotulo: 'Somente com valor informado', tipo: 'select',
          opcoes: [['','Todos'],['sim','Sim']] },
        { id: 'dias', rotulo: 'Período de publicação', tipo: 'select',
          opcoes: PERIODOS, padrao: '365' },
        { id: 'valorMin', rotulo: 'Valor estimado (mín.)', tipo: 'numero' },
        { id: 'valorMax', rotulo: 'Valor estimado (máx.)', tipo: 'numero' }
    ],

    ata: [
        { id: 'q', rotulo: 'Palavra-chave', tipo: 'texto', destaque: true,
          dica: 'Busca no objeto das atas de registro de preços.' },
        { id: 'uf', rotulo: 'UF', tipo: 'uf' },
        { id: 'municipio', rotulo: 'Município', tipo: 'texto' },
        { id: 'orgao', rotulo: 'Órgão / Entidade', tipo: 'texto' },
        { id: 'modalidade', rotulo: 'Modalidade', tipo: 'select',
          opcoes: [['','Todas'], ...MODALIDADES] },
        { id: 'adesao', rotulo: 'Permite adesão', tipo: 'select',
          opcoes: [['','Todas'],['sim','Sim'],['nao','Não']] },
        { id: 'cancelada', rotulo: 'Cancelada', tipo: 'select',
          opcoes: [['','Todas'],['nao','Não'],['sim','Sim']] },
        { id: 'dias', rotulo: 'Período de assinatura', tipo: 'select',
          opcoes: PERIODOS, padrao: '365' }
    ],

    contrato: [
        { id: 'q', rotulo: 'Palavra-chave', tipo: 'texto', destaque: true,
          dica: 'Busca no objeto dos contratos e empenhos.' },
        { id: 'uf', rotulo: 'UF', tipo: 'uf' },
        { id: 'municipio', rotulo: 'Município', tipo: 'texto' },
        { id: 'orgao', rotulo: 'Órgão / Entidade', tipo: 'texto' },
        { id: 'modalidade', rotulo: 'Modalidade', tipo: 'select',
          opcoes: [['','Todas'], ...MODALIDADES] },
        { id: 'fornecedor', rotulo: 'Fornecedor', tipo: 'texto' },
        { id: 'tipoContrato', rotulo: 'Tipo de contrato', tipo: 'texto' },
        { id: 'comValor', rotulo: 'Somente com valor informado', tipo: 'select',
          opcoes: [['','Todos'],['sim','Sim']] },
        { id: 'dias', rotulo: 'Período de assinatura', tipo: 'select',
          opcoes: PERIODOS, padrao: '365' },
        { id: 'valorMin', rotulo: 'Valor global (mín.)', tipo: 'numero' },
        { id: 'valorMax', rotulo: 'Valor global (máx.)', tipo: 'numero' }
    ]
};

function blocoUfHtml(filtro) {
    const grupos = REGIOES.map(([regiao, ufs]) => `
        <div class="uf-grupo">
            <strong>${regiao}</strong>
            <div class="uf-opcoes">
                ${ufs.map(uf => `
                    <label>
                        <input type="checkbox" name="uf-opcao" value="${uf}">
                        ${uf}
                    </label>`).join('')}
            </div>
        </div>`).join('');

    return `<div class="campo uf-campo">
        <label>${filtro.rotulo}</label>
        <button type="button" class="uf-botao" id="ufBotao" aria-haspopup="true">
            <span id="ufResumo">Todos os estados</span>
            <span class="seta">▾</span>
        </button>
        <div class="uf-painel" id="ufPainel" hidden>
            <div class="uf-acoes"><a href="#" id="ufLimpar">Limpar seleção</a></div>
            ${grupos}
        </div>
    </div>`;
}

function atualizarResumoUf() {
    const marcados = Array.from(
        document.querySelectorAll('input[name="uf-opcao"]:checked')
    ).map(caixa => caixa.value);

    const resumo = document.getElementById('ufResumo');
    if (!resumo) return;

    if (!marcados.length) {
        resumo.textContent = 'Todos os estados';
    } else if (marcados.length <= 4) {
        resumo.textContent = marcados.join(', ');
    } else {
        resumo.textContent = `${marcados.length} estados selecionados`;
    }
}

function inicializarCampoUf() {
    const botao = document.getElementById('ufBotao');
    const painel = document.getElementById('ufPainel');
    if (!botao || !painel) return;

    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-controls', 'ufPainel');

    function abrir() {
        painel.hidden = false;
        botao.classList.add('aberto');
        botao.setAttribute('aria-expanded', 'true');

        const primeira = painel.querySelector('input[type=checkbox]');
        if (primeira) primeira.focus();
    }

    function fechar(devolverFoco) {
        painel.hidden = true;
        botao.classList.remove('aberto');
        botao.setAttribute('aria-expanded', 'false');
        if (devolverFoco) botao.focus();
    }

    botao.addEventListener('click', evento => {
        evento.stopPropagation();
        if (painel.hidden) abrir(); else fechar(false);
    });

    painel.addEventListener('click', evento => evento.stopPropagation());

    document.addEventListener('click', () => fechar(false));

    // Esc fecha o painel e devolve o foco ao botão
    painel.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') {
            evento.stopPropagation();
            fechar(true);
        }
    });

    painel.querySelectorAll('input[type=checkbox]').forEach(caixa => {
        caixa.addEventListener('change', atualizarResumoUf);
    });

    const limpar = document.getElementById('ufLimpar');
    if (limpar) {
        limpar.addEventListener('click', evento => {
            evento.preventDefault();
            painel.querySelectorAll('input[type=checkbox]').forEach(caixa => {
                caixa.checked = false;
            });
            atualizarResumoUf();
        });
    }

    atualizarResumoUf();
}

function criarCampoHtml(filtro) {
    if (filtro.tipo === 'uf') return blocoUfHtml(filtro);

    const id = `f_${filtro.id}`;
    const classe = filtro.destaque ? 'campo destaque' : 'campo';

    let controle = '';

    if (filtro.tipo === 'select') {
        const opcoes = filtro.opcoes
            .map(([valor, texto]) => {
                const marcado = String(filtro.padrao ?? '') === String(valor) ? ' selected' : '';
                return `<option value="${valor}"${marcado}>${texto}</option>`;
            })
            .join('');
        controle = `<select id="${id}">${opcoes}</select>`;

    } else if (filtro.tipo === 'numero') {
        controle = `<input type="number" id="${id}" min="0" step="0.01" placeholder="0,00">`;

    } else {
        const placeholder = filtro.destaque
            ? 'Ex.: merenda escolar, material de limpeza, pneu'
            : '';
        controle = `<input type="text" id="${id}" placeholder="${placeholder}">`;
    }

    const dica = filtro.dica ? `<span class="mudo">${filtro.dica}</span>` : '';

    return `<div class="${classe}">
        <label for="${id}">${filtro.rotulo}</label>
        ${controle}
        ${dica}
    </div>`;
}

function renderizarFiltros(tipo) {
    const alvo = document.getElementById('filtros');
    if (!alvo) return;

    const campos = FILTROS[tipo] || [];
    alvo.innerHTML = `<div class="grid">${campos.map(criarCampoHtml).join('')}</div>`;

    inicializarCampoUf();

    const form = document.getElementById('form-filtros');
    if (form) {
        form.addEventListener('submit', evento => {
            evento.preventDefault();
            pesquisar(tipo);
        });
    }

    const limpar = document.getElementById('btn-limpar');
    if (limpar) {
        limpar.addEventListener('click', () => {
            const form = document.getElementById('form-filtros');
            if (form) form.reset();
            atualizarResumoUf();
        });
    }
}

function pesquisar(tipo) {
    const params = new URLSearchParams({ tipo });

    (FILTROS[tipo] || []).forEach(filtro => {
        if (filtro.id === 'uf') {
            const marcados = Array.from(
                document.querySelectorAll('input[name="uf-opcao"]:checked')
            ).map(caixa => caixa.value);

            if (marcados.length) params.set('uf', marcados.join(','));
            return;
        }

        const elemento = document.getElementById(`f_${filtro.id}`);
        if (!elemento) return;

        const valor = elemento.value.trim();
        if (valor !== '') params.set(filtro.id, valor);
    });

    window.location.href = `resultados.html?${params.toString()}`;
}
