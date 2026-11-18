/* ====== Motor de busca — paginação automática com parada antecipada ====== */

/**
 * Responsabilidades deste módulo:
 *  - decidir quantas páginas buscar, sem perguntar ao usuário
 *  - parar cedo quando já há resultado suficiente
 *  - respeitar orçamento de tempo e teto de páginas
 *  - cachear páginas para não repetir consultas
 *  - reter o que já veio quando o PNCP falha (nunca descartar resultado)
 */
const MotorBusca = (() => {

    const POLITICA = {
        alvoResultados: 100,          // para quando já houver isso filtrado
        orcamentoMs: 8000,            // ou quando o tempo estourar
        maxPaginas: 10,               // teto duro de segurança
        intervaloMs: 400,             // pausa entre páginas
        tentativasPorPagina: 2,       // retentativas por página
        falhasSeguidasParaParar: 2,   // disjuntor
        timeoutMs: 15000,             // tempo máximo por requisição
        cacheTtlMs: 5 * 60 * 1000,    // validade do cache
        tamanhoPagina: 50
    };

    const cache = new Map();

    /* ---------- cache ---------- */

    function chaveDe(termo, tipo, status, pagina) {
        return `${termo}|${tipo}|${status || ''}|${pagina}`;
    }

    function lerCache(chave) {
        const entrada = cache.get(chave);
        if (!entrada) return null;
        if (Date.now() > entrada.expiraEm) {
            cache.delete(chave);
            return null;
        }
        return entrada.dados;
    }

    function gravarCache(chave, dados) {
        cache.set(chave, { dados, expiraEm: Date.now() + POLITICA.cacheTtlMs });
    }

    /* ---------- utilidades ---------- */

    function esperar(ms, sinal) {
        return new Promise((resolver, rejeitar) => {
            const timer = setTimeout(() => { limpar(); resolver(); }, ms);

            function aoAbortar() {
                limpar();
                const erro = new Error('cancelado');
                erro.name = 'AbortError';
                rejeitar(erro);
            }

            function limpar() {
                clearTimeout(timer);
                if (sinal) sinal.removeEventListener('abort', aoAbortar);
            }

            if (sinal) {
                if (sinal.aborted) return aoAbortar();
                sinal.addEventListener('abort', aoAbortar, { once: true });
            }
        });
    }

    /** Espera crescente com variação aleatória, para não sincronizar retentativas. */
    function esperaRetentativa(tentativa) {
        return 300 * Math.pow(2, tentativa) + Math.random() * 200;
    }

    function comTimeout(ms, sinalExterno) {
        const controle = new AbortController();
        const timer = setTimeout(() => controle.abort(), ms);
        const repassar = () => controle.abort();

        if (sinalExterno) sinalExterno.addEventListener('abort', repassar, { once: true });

        return {
            sinal: controle.signal,
            limpar() {
                clearTimeout(timer);
                if (sinalExterno) sinalExterno.removeEventListener('abort', repassar);
            }
        };
    }

    /* ---------- uma página ---------- */

    async function buscarPagina({ termo, tipo, status, pagina, sinal, politica }) {
        const chave = chaveDe(termo, tipo, status, pagina);
        const emCache = lerCache(chave);
        if (emCache) return emCache;

        let ultimoErro = null;

        for (let tentativa = 0; tentativa <= politica.tentativasPorPagina; tentativa++) {
            const guarda = comTimeout(politica.timeoutMs, sinal);

            try {
                const dados = await PNCP.buscar({
                    termo,
                    tipo,
                    pagina,
                    tamPagina: politica.tamanhoPagina,
                    status,
                    sinal: guarda.sinal
                });

                gravarCache(chave, dados);
                return dados;

            } catch (erro) {
                const cancelado = erro && erro.name === 'AbortError' && sinal && sinal.aborted;
                if (cancelado) throw erro;

                ultimoErro = erro;

                if (tentativa < politica.tentativasPorPagina) {
                    await esperar(esperaRetentativa(tentativa), sinal);
                }
            } finally {
                guarda.limpar();
            }
        }

        throw ultimoErro;
    }

    /* ---------- busca completa ---------- */

    async function executar({
        termo,
        tipo,
        status = null,
        aplicarFiltros = null,
        aoProgresso = null,
        sinal = null,
        paginaInicial = 1,
        politica = POLITICA
    }) {
        const inicio = Date.now();
        const acumulado = [];

        let total = 0;
        let paginasLidas = 0;
        let falhasSeguidas = 0;
        let parouPor = 'inicio';
        let completou = true;

        for (let indice = 0; indice < politica.maxPaginas; indice++) {
            const pagina = paginaInicial + indice;
            if (sinal && sinal.aborted) {
                parouPor = 'cancelada';
                completou = false;
                break;
            }

            let dados;

            try {
                dados = await buscarPagina({ termo, tipo, status, pagina, sinal, politica });
                falhasSeguidas = 0;

            } catch (erro) {
                if (erro && erro.name === 'AbortError') {
                    parouPor = 'cancelada';
                    completou = false;
                    break;
                }

                falhasSeguidas++;
                completou = false;
                parouPor = 'falha';

                // Disjuntor: duas falhas seguidas encerram; sem nada em mãos, também
                if (falhasSeguidas >= politica.falhasSeguidasParaParar) break;
                if (acumulado.length === 0) break;

                try {
                    await esperar(politica.intervaloMs, sinal);
                } catch (_) {
                    parouPor = 'cancelada';
                    break;
                }

                continue;
            }

            if (!dados) {
                parouPor = 'fim';
                break;
            }

            const itens = dados.items || [];
            total = dados.total || total;

            if (!itens.length) {
                parouPor = 'fim';
                break;
            }

            paginasLidas++;
            acumulado.push(...itens);

            const filtrados = aplicarFiltros ? aplicarFiltros(acumulado) : acumulado;

            if (aoProgresso) {
                aoProgresso({
                    carregados: acumulado.length,
                    filtrados: filtrados.length,
                    paginasLidas
                });
            }

            if (filtrados.length >= politica.alvoResultados) {
                parouPor = 'alvo';
                break;
            }

            if (Date.now() - inicio >= politica.orcamentoMs) {
                parouPor = 'tempo';
                break;
            }

            if (itens.length < politica.tamanhoPagina) {
                parouPor = 'fim';
                break;
            }

            if (indice < politica.maxPaginas - 1) {
                try {
                    await esperar(politica.intervaloMs, sinal);
                } catch (_) {
                    parouPor = 'cancelada';
                    completou = false;
                    break;
                }
            }
        }

        if (parouPor === 'inicio') parouPor = 'teto';

        return { itens: acumulado, total, paginasLidas, parouPor, completou };
    }

    return {
        executar,
        POLITICA,
        limparCache: () => cache.clear()
    };

})();
