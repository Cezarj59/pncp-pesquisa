/* ====== Cesta de itens para pesquisa de preços ====== */

/**
 * Guarda os ITENS escolhidos pelo usuário, não as contratações.
 * Persiste em localStorage: sobrevive à navegação entre buscas, ao
 * fechamento da aba e a uma nova pesquisa.
 */
const Cesta = (() => {

    const CHAVE = 'pncp:cesta';
    const MINIMO = 3;

    function ler() {
        try {
            const bruto = localStorage.getItem(CHAVE);
            const lista = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(lista) ? lista : [];
        } catch (_) {
            return [];
        }
    }

    function gravar(lista) {
        try {
            localStorage.setItem(CHAVE, JSON.stringify(lista));
            return true;
        } catch (_) {
            // Cota ou modo privativo: a cesta não persiste
            return false;
        }
    }

    function chaveDe(itemUrl, numeroItem) {
        return `${itemUrl || ''}#${numeroItem}`;
    }

    function contem(itemUrl, numeroItem) {
        const chave = chaveDe(itemUrl, numeroItem);
        return ler().some(item => item.chave === chave);
    }

    function adicionar(registro) {
        const lista = ler();
        const chave = chaveDe(registro.itemUrl, registro.numeroItem);

        if (lista.some(item => item.chave === chave)) {
            return { ok: false, motivo: 'repetido' };
        }

        lista.push({
            ...registro,
            chave,
            adicionadoEm: new Date().toISOString()
        });

        return gravar(lista)
            ? { ok: true, total: lista.length }
            : { ok: false, motivo: 'armazenamento' };
    }

    function remover(chave) {
        const lista = ler().filter(item => item.chave !== chave);
        gravar(lista);
        return lista;
    }

    function limpar() {
        gravar([]);
    }

    function total() {
        return ler().length;
    }

    return { ler, adicionar, remover, limpar, contem, total, chaveDe, MINIMO };

})();

/** Atualiza o link "Cesta" do topo com a quantidade de itens. */
function atualizarNavCesta() {
    const link = document.getElementById('link-cesta');
    if (!link) return;

    const total = Cesta.total();
    link.textContent = total ? `Cesta (${total})` : 'Cesta';
    link.classList.toggle('com-itens', total > 0);
}
