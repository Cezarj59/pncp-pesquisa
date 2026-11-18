/* ====== Retomar a última pesquisa ====== */

/**
 * Guarda um ponteiro para a última busca feita (endereço, termo e total),
 * sem os registros. Assim o usuário pode voltar à pesquisa depois de ir à
 * coleta, trocar de aba ou abrir outra página.
 *
 * Os dados ficam em localStorage; os registros em si continuam no cache de
 * resultados (sessionStorage).
 */
const Retomar = (() => {

    const CHAVE = 'pncp:ultima-pesquisa';
    const VALIDADE = 60 * 60 * 1000;   // 1 hora

    function salvar({ url, termo, total, tipo }) {
        try {
            localStorage.setItem(CHAVE, JSON.stringify({
                url,
                termo: termo || '',
                total: Number(total) || 0,
                tipo: tipo || 'edital',
                quando: Date.now()
            }));
            return true;
        } catch (_) {
            return false;
        }
    }

    function ler() {
        let dados;

        try {
            const bruto = localStorage.getItem(CHAVE);
            if (!bruto) return null;
            dados = JSON.parse(bruto);
        } catch (_) {
            return null;
        }

        if (!dados || typeof dados.url !== 'string') return null;
        if (Date.now() - Number(dados.quando || 0) > VALIDADE) {
            limpar();
            return null;
        }

        return dados;
    }

    function limpar() {
        try {
            localStorage.removeItem(CHAVE);
        } catch (_) {
            /* ignore */
        }
    }

    /** "agora", "há 5 min", "há 2 h" */
    function desde(quando) {
        const minutos = Math.floor((Date.now() - Number(quando || 0)) / 60000);

        if (minutos < 1) return 'agora';
        if (minutos < 60) return `há ${minutos} min`;

        const horas = Math.floor(minutos / 60);
        return `há ${horas} h`;
    }

    function descrever(dados) {
        const partes = [];

        partes.push(dados.termo
            ? `"${dados.termo}"`
            : 'sem palavra-chave');

        if (dados.total > 0) {
            partes.push(`${dados.total} resultado${dados.total === 1 ? '' : 's'}`);
        }

        partes.push(desde(dados.quando));

        return partes.join(' · ');
    }

    function escapar(v) {
        return String(v ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    /* ---------- interface ---------- */

    function bannerFiltros(main) {
        const dados = ler();
        if (!dados) return;

        const caixa = document.createElement('div');
        caixa.className = 'aviso retomar';
        caixa.innerHTML = `
            <span>Você tem uma pesquisa em andamento: <strong>${escapar(descrever(dados))}</strong></span>
            <a class="botao sec" href="resultados.html${escapar(dados.url)}">Continuar pesquisa</a>
            <button class="mini sec" data-descartar="1">Descartar</button>`;

        caixa.addEventListener('click', evento => {
            if (!evento.target.closest('[data-descartar]')) return;
            limpar();
            caixa.remove();
        });

        main.insertBefore(caixa, main.firstChild);
    }

    function linkVoltar(main) {
        const dados = ler();
        if (!dados) return;

        const linha = main.querySelector('.card .linha');
        if (!linha) return;

        const link = document.createElement('a');
        link.className = 'link';
        link.href = `resultados.html${dados.url}`;
        link.textContent = '← Voltar à pesquisa';

        linha.appendChild(link);
    }

    function iniciar() {
        const main = document.querySelector('main');
        if (!main) return;

        // Página de filtros: oferece continuar
        if (document.getElementById('form-filtros')) {
            bannerFiltros(main);
            return;
        }

        // Página da coleta: atalho de volta
        if (document.getElementById('lista')) {
            linkVoltar(main);
        }
    }

    return { salvar, ler, limpar, descrever, desde, iniciar };

})();

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => Retomar.iniciar());
}
