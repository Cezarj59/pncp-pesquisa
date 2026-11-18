/* ====== Botão voltar ao topo ====== */

/**
 * Aparece depois que a página rola o suficiente, para não cobrir o conteúdo
 * de telas curtas. Fica fixo no canto inferior direito.
 */
const BotaoTopo = (() => {

    const LIMITE = 400;

    let botao = null;
    let limiteAtual = LIMITE;
    let agendado = false;

    function prefereMenosAnimacao() {
        try {
            return typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (_) {
            return false;
        }
    }

    function atualizar() {
        if (!botao) return;

        const visivel = (window.scrollY || 0) > limiteAtual;

        botao.classList.toggle('visivel', visivel);
        botao.setAttribute('aria-hidden', visivel ? 'false' : 'true');
        botao.tabIndex = visivel ? 0 : -1;
    }

    function aoRolar() {
        if (agendado) return;

        const executar = () => {
            agendado = false;
            atualizar();
        };

        if (typeof requestAnimationFrame === 'function') {
            agendado = true;
            requestAnimationFrame(executar);
        } else {
            executar();
        }
    }

    function voltar() {
        const comportamento = prefereMenosAnimacao() ? 'auto' : 'smooth';
        window.scrollTo({ top: 0, behavior: comportamento });
    }

    function iniciar(opcoes = {}) {
        if (botao) return botao;
        if (typeof document === 'undefined' || !document.body) return null;

        limiteAtual = Number(opcoes.limite) > 0 ? Number(opcoes.limite) : LIMITE;

        botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'botao-topo';
        botao.textContent = '↑';
        botao.title = 'Voltar ao topo';
        botao.setAttribute('aria-label', 'Voltar ao topo');
        botao.setAttribute('aria-hidden', 'true');
        botao.tabIndex = -1;

        botao.addEventListener('click', voltar);
        document.body.appendChild(botao);

        window.addEventListener('scroll', aoRolar, { passive: true });
        atualizar();

        return botao;
    }

    return { iniciar, LIMITE };

})();

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => BotaoTopo.iniciar());
}
