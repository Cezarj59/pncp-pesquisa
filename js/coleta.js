/* ====== Coletas de preços ====== */

/**
 * Uma coleta é um conjunto de itens escolhidos para fundamentar a pesquisa
 * de preços de um processo. O sistema guarda VÁRIAS coletas — o histórico —
 * e nunca sobrescreve uma ao iniciar outra.
 *
 * Persistência em localStorage, com migração do formato antigo ("cesta").
 */
const Coleta = (() => {

    const CHAVE = 'pncp:coletas';
    const CHAVE_ATIVA = 'pncp:coleta-ativa';
    const CHAVE_ANTIGA = 'pncp:cesta';
    const MINIMO = 3;

    /* ---------- utilidades ---------- */

    function novoId() {
        return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }

    function nomePadrao() {
        const agora = new Date();
        const dia = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `Coleta de ${dia}, ${hora}`;
    }

    /** dd/mm — usado para diferenciar duas coletas do mesmo assunto. */
    function dataCurta() {
        return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function pareceNomePadrao(nome) {
        return /^Coleta de \d/.test(String(nome || ''));
    }

    /**
     * Nome a partir do contexto da pesquisa, para o usuário reconhecer a
     * coleta: a palavra-chave buscada, ou a descrição do primeiro item.
     * A data curta evita duas coletas com o mesmo nome.
     */
    function nomeSugerido(termo, descricao) {
        const base = String(termo || descricao || '').trim();
        if (!base) return null;

        const curto = base.length > 48 ? `${base.slice(0, 45).trim()}…` : base;
        return `${curto} · ${dataCurta()}`;
    }

    function chaveDe(itemUrl, numeroItem) {
        return `${itemUrl || ''}#${numeroItem}`;
    }

    /* ---------- persistência ---------- */

    function gravar(coletas) {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(coletas));
            return true;
        } catch (_) {
            return false;
        }
    }

    /** Converte a antiga cesta única (pncp:cesta) em uma coleta. */
    function migrar() {
        let antiga;

        try {
            antiga = localStorage.getItem(CHAVE_ANTIGA);
        } catch (_) {
            return;
        }

        if (!antiga) return;

        try {
            const itens = JSON.parse(antiga);

            if (Array.isArray(itens) && itens.length) {
                const coletas = lerCru();

                if (!coletas.length) {
                    coletas.push({
                        id: novoId(),
                        nome: 'Coleta anterior',
                        criadaEm: new Date().toISOString(),
                        itens
                    });
                    gravar(coletas);
                }
            }
        } catch (_) {
            // dado antigo ilegível: descarta
        }

        try {
            localStorage.removeItem(CHAVE_ANTIGA);
        } catch (_) {
            /* ignore */
        }
    }

    function lerCru() {
        try {
            const bruto = localStorage.getItem(CHAVE);
            const lista = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(lista) ? lista : [];
        } catch (_) {
            return [];
        }
    }

    /** Todas as coletas, da mais recente para a mais antiga. */
    function listar() {
        migrar();
        return lerCru().sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)));
    }

    /* ---------- coleta ativa ---------- */

    function idAtivo() {
        let guardado;

        try {
            guardado = localStorage.getItem(CHAVE_ATIVA);
        } catch (_) {
            guardado = null;
        }

        const coletas = listar();

        if (guardado && coletas.some(c => c.id === guardado)) return guardado;
        return coletas.length ? coletas[0].id : null;
    }

    function ativa() {
        const alvo = idAtivo();
        return listar().find(c => c.id === alvo) || null;
    }

    function definirAtiva(idColeta) {
        try {
            localStorage.setItem(CHAVE_ATIVA, idColeta);
            return true;
        } catch (_) {
            return false;
        }
    }

    function criar(nome) {
        const coletas = lerCru();

        const nova = {
            id: novoId(),
            nome: nome || nomePadrao(),
            criadaEm: new Date().toISOString(),
            itens: []
        };

        coletas.push(nova);

        if (!gravar(coletas)) return null;

        definirAtiva(nova.id);
        return nova;
    }

    /** Devolve a coleta ativa, criando uma se ainda não existir. */
    function garantirAtiva() {
        return ativa() || criar();
    }

    function renomear(idColeta, nome) {
        const coletas = lerCru();
        const alvo = coletas.find(c => c.id === idColeta);
        if (!alvo || !String(nome || '').trim()) return false;

        alvo.nome = String(nome).trim();
        return gravar(coletas);
    }

    function remover(idColeta) {
        const coletas = lerCru().filter(c => c.id !== idColeta);
        gravar(coletas);

        try {
            if (localStorage.getItem(CHAVE_ATIVA) === idColeta) {
                localStorage.removeItem(CHAVE_ATIVA);
            }
        } catch (_) {
            /* ignore */
        }

        return coletas;
    }

    /* ---------- itens ---------- */

    /**
     * Depois de gerar um relatório, a coleta é considerada encerrada:
     * os próximos itens vão para uma coleta nova, sem apagar a anterior.
     * O pedido fica guardado até o próximo item ser adicionado, para não
     * criar coletas vazias.
     */
    function encerrarAtiva() {
        try {
            localStorage.setItem('pncp:nova-coleta', '1');
            return true;
        } catch (_) {
            return false;
        }
    }

    function deveNovaColeta() {
        try {
            return localStorage.getItem('pncp:nova-coleta') === '1';
        } catch (_) {
            return false;
        }
    }

    function limparPedidoNova() {
        try {
            localStorage.removeItem('pncp:nova-coleta');
        } catch (_) {
            /* ignore */
        }
    }

    function adicionar(item) {
        if (deveNovaColeta()) {
            criar();
            limparPedidoNova();
        }

        const coletas = lerCru();
        const idAlvo = idAtivo();

        let alvo = coletas.find(c => c.id === idAlvo);

        if (!alvo) {
            alvo = { id: novoId(), nome: nomePadrao(), criadaEm: new Date().toISOString(), itens: [] };
            coletas.push(alvo);
        }

        const chave = chaveDe(item.itemUrl, item.numeroItem);

        if (alvo.itens.some(i => i.chave === chave)) {
            return { ok: false, motivo: 'repetido', coleta: alvo };
        }

        // Primeiro item: renomeia a coleta com o assunto da pesquisa
        if (!alvo.itens.length && pareceNomePadrao(alvo.nome)) {
            const sugestao = nomeSugerido(item.busca, item.descricao);
            if (sugestao) alvo.nome = sugestao;
        }

        alvo.itens.push({
            ...item,
            chave,
            adicionadoEm: new Date().toISOString()
        });

        if (!gravar(coletas)) return { ok: false, motivo: 'armazenamento', coleta: alvo };

        definirAtiva(alvo.id);
        return { ok: true, total: alvo.itens.length, coleta: alvo };
    }

    function removerItem(idColeta, chave) {
        const coletas = lerCru();
        const alvo = coletas.find(c => c.id === idColeta);
        if (!alvo) return false;

        alvo.itens = alvo.itens.filter(i => i.chave !== chave);
        return gravar(coletas);
    }

    function contem(itemUrl, numeroItem) {
        const alvo = ativa();
        if (!alvo) return false;

        const chave = chaveDe(itemUrl, numeroItem);
        return alvo.itens.some(i => i.chave === chave);
    }

    /** Itens da coleta ativa. */
    function itens() {
        const alvo = ativa();
        return alvo ? alvo.itens : [];
    }

    function total() {
        return itens().length;
    }

    function totalGeral() {
        return listar().reduce((soma, c) => soma + c.itens.length, 0);
    }

    /* ---------- backup ---------- */

    /** Todas as coletas em JSON, para guardar fora do navegador. */
    function exportarJson() {
        return JSON.stringify({
            versao: 1,
            exportadoEm: new Date().toISOString(),
            coletas: listar()
        }, null, 2);
    }

    /** Junta as coletas de um arquivo às existentes, sem sobrescrever. */
    function importarJson(texto) {
        let dados;

        try {
            dados = JSON.parse(texto);
        } catch (_) {
            throw new Error('O arquivo não é um JSON válido.');
        }

        const lista = Array.isArray(dados) ? dados : dados && dados.coletas;

        if (!Array.isArray(lista)) {
            throw new Error('O arquivo não contém coletas.');
        }

        const atuais = lerCru();
        let adicionadas = 0;

        lista.forEach(coleta => {
            if (!coleta || !coleta.id || !Array.isArray(coleta.itens)) return;
            if (atuais.some(c => c.id === coleta.id)) return;
            atuais.push(coleta);
            adicionadas++;
        });

        if (!gravar(atuais)) {
            throw new Error('Não foi possível gravar: o armazenamento do navegador está cheio.');
        }

        return adicionadas;
    }

    return {
        listar, ativa, criar, garantirAtiva, definirAtiva, renomear, remover,
        adicionar, removerItem, contem, itens, total, totalGeral,
        encerrarAtiva, deveNovaColeta, limparPedidoNova,
        exportarJson, importarJson,
        chaveDe, MINIMO
    };

})();

/** Atualiza o link do topo com a quantidade de itens da coleta ativa. */
function atualizarNavColeta() {
    const link = document.getElementById('link-coleta');
    if (!link) return;

    const ativa = Coleta.ativa();
    const total = ativa ? ativa.itens.length : 0;

    link.textContent = total ? `Coleta (${total})` : 'Coleta';
    link.classList.toggle('com-itens', total > 0);
}
