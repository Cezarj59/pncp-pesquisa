/* ====== Configuração e renderização dos filtros ====== */

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR',
             'PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

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

const PAGINAS_OPCOES = [
    ['1','1 página (50 registros)'], ['2','2 páginas (100)'], ['3','3 páginas (150)'],
    ['5','5 páginas (250)'], ['8','8 páginas (400)'], ['12','12 páginas (600)']
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
        { id: 'valorMax', rotulo: 'Valor estimado (máx.)', tipo: 'numero' },
        { id: 'paginas', rotulo: 'Profundidade da busca', tipo: 'select',
          opcoes: PAGINAS_OPCOES, padrao: '5' }
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
          opcoes: PERIODOS, padrao: '365' },
        { id: 'paginas', rotulo: 'Profundidade da busca', tipo: 'select',
          opcoes: PAGINAS_OPCOES, padrao: '5' }
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
        { id: 'valorMax', rotulo: 'Valor global (máx.)', tipo: 'numero' },
        { id: 'paginas', rotulo: 'Profundidade da busca', tipo: 'select',
          opcoes: PAGINAS_OPCOES, padrao: '5' }
    ]
};

function criarCampoHtml(filtro) {
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

    } else if (filtro.tipo === 'uf') {
        const opcoes = UFS.map(uf => `<option value="${uf}">${uf}</option>`).join('');
        controle = `<select id="${id}" multiple size="5">${opcoes}</select>`;

    } else if (filtro.tipo === 'numero') {
        controle = `<input type="number" id="${id}" min="0" step="0.01" placeholder="0,00">`;

    } else {
        const placeholder = filtro.destaque
            ? 'Ex.: merenda escolar, material de limpeza, pneu'
            : '';
        controle = `<input type="text" id="${id}" placeholder="${placeholder}">`;
    }

    const dica = filtro.dica
        ? `<span class="mudo">${filtro.dica}</span>`
        : (filtro.tipo === 'uf'
            ? '<span class="mudo">Segure Ctrl para escolher mais de um estado.</span>'
            : '');

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
        });
    }
}

function pesquisar(tipo) {
    const params = new URLSearchParams({ tipo });

    (FILTROS[tipo] || []).forEach(filtro => {
        const elemento = document.getElementById(`f_${filtro.id}`);
        if (!elemento) return;

        let valor;

        if (elemento.multiple) {
            valor = Array.from(elemento.selectedOptions)
                .map(opcao => opcao.value)
                .filter(Boolean)
                .join(',');
        } else {
            valor = elemento.value.trim();
        }

        if (valor !== '') params.set(filtro.id, valor);
    });

    window.location.href = `resultados.html?${params.toString()}`;
}
