// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
    "https://zorolzmqvpsltemcxkjq.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-LUkRDPS0OVlf1kUuaoB0A_BITtikgi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// NAVEGAÇÃO
// ============================================================

const links = document.querySelectorAll("nav a");

const balao = document.getElementById("balao");
const linha = document.getElementById("linha");
const eliminatorias = document.getElementById("eliminatorias");

links.forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        links.forEach(item => {
            item.classList.remove("ativa");
        });

        link.classList.add("ativa");

        balao.style.display = "none";
        linha.style.display = "none";
        eliminatorias.style.display = "none";

        const secao = link.dataset.secao;

        if (secao === "balao") {
            balao.style.display = "block";
        }

        if (secao === "linha") {
            linha.style.display = "block";
        }

        if (secao === "eliminatorias") {
            eliminatorias.style.display = "block";
            carregarEliminatorias();
        }
    });
});


// ============================================================
// SEGUE A LINHA — ELEMENTOS
// ============================================================

const equipeLinha =
    document.getElementById("equipe-linha");

const nomeEquipeLinha =
    document.getElementById("nome-equipe-linha");

const circuitoLinha =
    document.getElementById("circuito-linha");

const tentativaPartidaLinha =
    document.getElementById("tentativa-partida-linha");

const tempoLinha =
    document.getElementById("linha-tempo");

const cronometroLinha =
    document.getElementById("cronometro-linha");

const totalLinha =
    document.getElementById("linha-total");

const etapasContainer =
    document.getElementById("etapas-linha");

const botaoIniciarLinha =
    document.getElementById("iniciar-partida-linha");

const botaoFinalizarLinha =
    document.getElementById("finalizar-partida-linha");

const botaoSalvarLinha =
    document.getElementById("salvar-linha");


// ============================================================
// IDENTIFICAÇÃO DAS PARTIDAS
// ============================================================

const partidasLinha = {
    "1-1": 8,
    "1-2": 9,
    "2-1": 10,
    "2-2": 7,
    "3-1": 6,
    "3-2": 11
};


// ============================================================
// PONTUAÇÃO
// ============================================================

const checkpointsPrimeiraTentativa = [5, 3, 2];
const checkpointsSegundaTentativa = [3, 2, 1];

const VALOR_LADRILHO = 1;
const VALOR_INTERSECAO = 10;
const VALOR_GANGORRA = 20;
const VALOR_OBSTACULO = 20;
const VALOR_GAP = 10;
const VALOR_RAMPA = 10;
const VALOR_LOMBADA = 10;
const VALOR_PENALIDADE = 5;


// ============================================================
// CRONÔMETRO
// ============================================================

const LIMITE_CRONOMETRO_MS = 180000;

let intervaloCronometro = null;
let inicioCronometro = null;
let tempoDecorridoMs = 0;

let percursoIniciado = false;
let percursoFinalizado = false;


function formatarTempoCronometro(milisegundos) {

    const minutos =
        Math.floor(milisegundos / 60000);

    const segundos =
        Math.floor((milisegundos % 60000) / 1000);

    const centesimos =
        Math.floor((milisegundos % 1000) / 10);

    return (
        String(minutos).padStart(2, "0") +
        ":" +
        String(segundos).padStart(2, "0") +
        "." +
        String(centesimos).padStart(2, "0")
    );
}


function atualizarDisplayCronometro() {

    cronometroLinha.textContent =
        formatarTempoCronometro(tempoDecorridoMs);

    tempoLinha.value =
        (tempoDecorridoMs / 1000).toFixed(2);
}


function atualizarCronometro() {

    if (!percursoIniciado || percursoFinalizado) {
        return;
    }

    tempoDecorridoMs =
        Math.min(
            Date.now() - inicioCronometro,
            LIMITE_CRONOMETRO_MS
        );

    atualizarDisplayCronometro();

    if (tempoDecorridoMs >= LIMITE_CRONOMETRO_MS) {

        finalizarPartidaLinha(true);
    }
}


// ============================================================
// ESTADO DAS ETAPAS
// ============================================================

let etapasLinha = [];


function criarEtapa(numero) {

    return {
        numero: numero,
        tentativas: []
    };
}


// ============================================================
// CAMPOS DE PONTUAÇÃO
// ============================================================

const camposEtapaLinha = [
    {
        id: "ladrilhos",
        nome: "Ladrilhos percorridos"
    },
    {
        id: "intersecao",
        nome: "Interseção / beco sem saída"
    },
    {
        id: "gangorra",
        nome: "Gangorra"
    },
    {
        id: "obstaculo",
        nome: "Obstáculo desviado"
    },
    {
        id: "gap",
        nome: "Gap"
    },
    {
        id: "rampa",
        nome: "Rampa"
    },
    {
        id: "lombada",
        nome: "Lombada"
    },
    {
        id: "penalidades",
        nome: "Falhas / penalidades"
    }
];


// ============================================================
// TENTATIVAS DISPONÍVEIS DO CHECKPOINT
// ============================================================

function tentativasDisponiveis(etapa) {

    const utilizadas =
        etapa.tentativas.map(
            tentativa => tentativa.numero_tentativa_checkpoint
        );

    return [1, 2, 3].filter(
        numero => !utilizadas.includes(numero)
    );
}


function proximaTentativaDisponivel(etapa) {

    const disponiveis =
        tentativasDisponiveis(etapa);

    return disponiveis.length > 0
        ? disponiveis[0]
        : null;
}


// ============================================================
// COLETAR OS DADOS DA TENTATIVA
// ============================================================

function coletarDadosTentativaLinha() {

    const dados = {};

    camposEtapaLinha.forEach(campo => {

        const elemento =
            etapasContainer.querySelector(
                `[data-campo-linha="${campo.id}"]`
            );

        dados[campo.id] =
            Math.max(
                0,
                Math.floor(Number(elemento?.value || 0))
            );
    });

    const seletorTentativa =
        etapasContainer.querySelector(
            '[data-campo-linha="tentativa-checkpoint"]'
        );

    dados.numero_tentativa_checkpoint =
        Number(seletorTentativa?.value || 0);

    return dados;
}


// ============================================================
// CALCULAR A PONTUAÇÃO DE UMA TENTATIVA
// ============================================================

function calcularPontosEtapa(dados, numeroEtapa) {

    const pontosLadrilhos =
        dados.ladrilhos * VALOR_LADRILHO;

    const pontosEspeciais =
        dados.intersecao * VALOR_INTERSECAO +
        dados.gangorra * VALOR_GANGORRA +
        dados.obstaculo * VALOR_OBSTACULO +
        dados.gap * VALOR_GAP +
        dados.rampa * VALOR_RAMPA +
        dados.lombada * VALOR_LOMBADA;


    const tabelaBonus =
        tentativaPartidaLinha.value === "2"
            ? checkpointsSegundaTentativa
            : checkpointsPrimeiraTentativa;


    const pontosCheckpoint =
        tabelaBonus[numeroEtapa - 1] || 0;


    const pontosPenalidades =
        dados.penalidades * VALOR_PENALIDADE;


    return Math.max(
        0,
        pontosLadrilhos +
        pontosEspeciais +
        pontosCheckpoint -
        pontosPenalidades
    );
}


// ============================================================
// RECALCULAR AS PONTUAÇÕES REGISTRADAS
// ============================================================

function atualizarPontosEtapasLinha() {

    etapasLinha.forEach(etapa => {

        etapa.tentativas.forEach(tentativa => {

            tentativa.pontos_calculados =
                calcularPontosEtapa(
                    tentativa,
                    etapa.numero
                );
        });
    });
}


// ============================================================
// SOMAR SOMENTE AS TENTATIVAS APROVADAS
// ============================================================

function calcularTotalLinha() {

    atualizarPontosEtapasLinha();

    let total = 0;

    etapasLinha.forEach(etapa => {

        etapa.tentativas.forEach(tentativa => {

            if (tentativa.status === "aprovada") {
                total += tentativa.pontos_calculados;
            }

        });

    });

    totalLinha.textContent = total;

    atualizarPreviewsHistoricoLinha();

    atualizarPreviewTentativaLinha();

    atualizarBotoesPartidaLinha();

    return total;
}


function atualizarPreviewsHistoricoLinha() {

    etapasLinha.forEach((etapa, indiceEtapa) => {

        etapa.tentativas.forEach((tentativa, indiceTentativa) => {

            const previa = etapasContainer.querySelector(
                `[data-preview-etapa="${indiceEtapa}"][data-preview-tentativa="${indiceTentativa}"]`
            );

            if (previa) {
                previa.textContent = tentativa.pontos_calculados;
            }

        });

    });

}


// ============================================================
// PRÉVIA DA PONTUAÇÃO DA TENTATIVA ATUAL
// ============================================================

function atualizarPreviewTentativaLinha() {

    const previa =
        document.getElementById("linha-preview-atual");

    if (!previa || !percursoIniciado || percursoFinalizado) {
        return;
    }

    const etapaAtual =
        etapasLinha[etapasLinha.length - 1];

    if (!etapaAtual) {
        return;
    }

    const dados =
        coletarDadosTentativaLinha();

    previa.textContent =
        calcularPontosEtapa(
            dados,
            etapaAtual.numero
        );
}


// ============================================================
// ATUALIZAR ESTADO DOS BOTÕES
// ============================================================

function atualizarBotoesPartidaLinha() {

    const selecoesValidas =
        equipeLinha.value !== "" &&
        circuitoLinha.value !== "" &&
        tentativaPartidaLinha.value !== "";

    botaoIniciarLinha.disabled =
        !selecoesValidas || percursoIniciado;

    botaoFinalizarLinha.disabled =
        !percursoIniciado || percursoFinalizado;

    botaoSalvarLinha.disabled =
        !percursoIniciado ||
        !percursoFinalizado;
}


// ============================================================
// INICIAR PARTIDA
// ============================================================

function iniciarPartidaLinha() {

    if (!equipeLinha.value) {
        alert("Selecione uma equipe.");
        return;
    }

    if (!circuitoLinha.value) {
        alert("Selecione o circuito.");
        return;
    }

    if (!tentativaPartidaLinha.value) {
        alert("Selecione a tentativa da partida.");
        return;
    }

    if (percursoIniciado) {
        return;
    }


    // Limpa o estado anterior da execução.

    etapasLinha = [
        criarEtapa(1)
    ];

    percursoIniciado = true;
    percursoFinalizado = false;

    tempoDecorridoMs = 0;
    inicioCronometro = Date.now();

    atualizarDisplayCronometro();


    // Bloqueia as seleções durante a partida.

    equipeLinha.disabled = true;
    circuitoLinha.disabled = true;
    tentativaPartidaLinha.disabled = true;


    // Inicia o cronômetro.

    intervaloCronometro =
        setInterval(
            atualizarCronometro,
            30
        );


    renderizarEtapasLinha();

    atualizarBotoesPartidaLinha();
}


// ============================================================
// FINALIZAR PARTIDA
// ============================================================

function finalizarPartidaLinha(automatico = false) {

    if (!percursoIniciado || percursoFinalizado) {
        return;
    }


    // Para o cronômetro.

    if (intervaloCronometro !== null) {

        clearInterval(intervaloCronometro);

        intervaloCronometro = null;
    }


    tempoDecorridoMs =
        Math.min(
            Date.now() - inicioCronometro,
            LIMITE_CRONOMETRO_MS
        );

    atualizarDisplayCronometro();


    // Guarda dados que estavam preenchidos,
    // mas ainda não tinham sido registrados como falha ou aprovação.
    // Esses pontos ficam salvos no histórico como interrompidos,
    // mas não entram na pontuação total.

    const etapaAtual =
        etapasLinha[etapasLinha.length - 1];

    if (etapaAtual && !etapaAtual.bloqueada) {

        const seletor =
            etapasContainer.querySelector(
                '[data-campo-linha="tentativa-checkpoint"]'
            );

        const existemCampos =
            camposEtapaLinha.some(campo => {

                const elemento =
                    etapasContainer.querySelector(
                        `[data-campo-linha="${campo.id}"]`
                    );

                return Number(elemento?.value || 0) !== 0;
            });

        if (existemCampos) {

            const dados =
                coletarDadosTentativaLinha();

            const pontos =
                calcularPontosEtapa(
                    dados,
                    etapaAtual.numero
                );

            etapaAtual.tentativas.push({

                ...dados,

                status: "interrompida",

                contabilizada: false,

                pontos_calculados: pontos

            });
        }
    }


    // Remove uma etapa nova que ficou vazia
    // depois da aprovação do checkpoint anterior.

    const ultimaEtapa =
        etapasLinha[etapasLinha.length - 1];

    if (
        ultimaEtapa &&
        ultimaEtapa.tentativas.length === 0
    ) {
        etapasLinha.pop();
    }


    percursoFinalizado = true;

    atualizarBotoesPartidaLinha();

    renderizarEtapasLinha();

    calcularTotalLinha();


    if (automatico) {

        alert(
            "O limite de 180 segundos foi atingido. " +
            "A partida foi finalizada automaticamente."
        );
    }
}


// ============================================================
// GERAR UMA TENTATIVA EDITÁVEL
// ============================================================

function gerarTentativaEditavelLinha(
    etapa,
    indiceEtapa,
    tentativa,
    indiceTentativa
) {

    const statusTexto = {

        aprovada: "Aprovada — contabilizada",

        falhou: "Falhou — não contabilizada",

        interrompida: "Interrompida — não contabilizada"

    }[tentativa.status] || "Registrada";


    const classeStatus =
        tentativa.status === "aprovada"
            ? "aprovada"
            : tentativa.status === "falhou"
                ? "falhou"
                : "interrompida";


    return `

        <div class="tentativa-editavel ${classeStatus}">

            <div class="tentativa-editavel-cabecalho">

                <strong>
                    ${tentativa.numero_tentativa_checkpoint}ª tentativa
                </strong>

                <span>${statusTexto}</span>

            </div>

            <div class="campo-principal">

                <label>Situação da tentativa</label>

                <select
                    data-editar-etapa="${indiceEtapa}"
                    data-editar-tentativa="${indiceTentativa}"
                    data-editar-status
                >

                    <option
                        value="aprovada"
                        ${tentativa.status === "aprovada" ? "selected" : ""}
                    >
                        Aprovada — contabilizar
                    </option>

                    <option
                        value="falhou"
                        ${tentativa.status === "falhou" ? "selected" : ""}
                    >
                        Falhou — não contabilizar
                    </option>

                    <option
                        value="interrompida"
                        ${tentativa.status === "interrompida" ? "selected" : ""}
                    >
                        Interrompida — não contabilizar
                    </option>

                </select>

            </div>

            <div class="campos-avaliacao">

                ${camposEtapaLinha.map(campo => `

                    <div class="campo">

                        <label>${campo.nome}</label>

                        <input
                            type="number"
                            min="0"
                            step="1"
                            value="${Number(tentativa[campo.id] || 0)}"

                            data-editar-etapa="${indiceEtapa}"

                            data-editar-tentativa="${indiceTentativa}"

                            data-editar-campo="${campo.id}"
                        >

                    </div>

                `).join("")}

            </div>

            <div class="preview-checkpoint">

                <span>Pontuação desta tentativa</span>

                <strong
                    data-preview-etapa="${indiceEtapa}"
                    data-preview-tentativa="${indiceTentativa}"
                >
                    ${tentativa.pontos_calculados}
                </strong>

            </div>

        </div>

    `;
}


// ============================================================
// FORMULÁRIO DA ETAPA ATUAL
// ============================================================

function gerarFormularioEtapaLinha(etapa) {

    const disponiveis = tentativasDisponiveis(etapa);

    if (disponiveis.length === 0) {

        return `
            <div class="etapa-bloqueada">

                As três tentativas deste checkpoint foram utilizadas.
                Não é possível registrar outra tentativa.

            </div>
        `;
    }


    let tentativaInicial = etapa.tentativaSelecionada;

    if (!disponiveis.includes(tentativaInicial)) {
        tentativaInicial = disponiveis[0];
    }


    return `

        <div class="campo-principal seletor-checkpoint">

            <label>Tentativa do checkpoint</label>

            <select data-campo-linha="tentativa-checkpoint">

                <option value="">Selecione a tentativa</option>

                ${[1, 2, 3].map(numero => `

                    <option
                        value="${numero}"
                        ${numero === tentativaInicial ? "selected" : ""}
                        ${!disponiveis.includes(numero) ? "disabled" : ""}
                    >
                        ${numero}ª tentativa
                    </option>

                `).join("")}

            </select>

        </div>


        <div class="campos-avaliacao">

            ${camposEtapaLinha.map(campo => `

                <div class="campo">

                    <label>${campo.nome}</label>

                    <input
                        type="number"
                        min="0"
                        step="1"
                        value="0"
                        data-campo-linha="${campo.id}"
                    >

                </div>

            `).join("")}

        </div>


        <div class="preview-checkpoint">

            <span>Prévia desta tentativa</span>

            <strong id="linha-preview-atual">0</strong>

        </div>


        <div class="acoes-checkpoint">

            <button
                type="button"
                class="botao-falhou"
                data-acao-linha="falhou"
            >
                Registrar falha
            </button>

            <button
                type="button"
                class="botao-passou"
                data-acao-linha="aprovada"
            >
                Aprovar checkpoint
            </button>

        </div>

    `;
}


// ============================================================
// RENDERIZAR ETAPAS — MANTER RESULTADOS EDITÁVEIS
// ============================================================

function renderizarEtapasLinha() {

    etapasContainer.innerHTML = "";

    if (!percursoIniciado) {

        etapasContainer.innerHTML = `

            <p class="mensagem-inicial">

                Selecione a equipe, o circuito e a tentativa da partida.
                Depois, clique em Iniciar partida.

            </p>

        `;

        calcularTotalLinha();

        return;
    }


    etapasLinha.forEach((etapa, indiceEtapa) => {

        const artigo = document.createElement("article");

        artigo.className = "avaliacao-card";


        const historico = etapa.tentativas.map(
            (tentativa, indiceTentativa) => {

                return gerarTentativaEditavelLinha(
                    etapa,
                    indiceEtapa,
                    tentativa,
                    indiceTentativa
                );

            }
        ).join("");


        const ehEtapaAtual =
            !percursoFinalizado &&
            indiceEtapa === etapasLinha.length - 1;


        artigo.innerHTML = `

            <div class="checkpoint-header">

                <span>
                    ${String(etapa.numero).padStart(2, "0")}
                </span>

                <div>
                    <h3>Etapa ${etapa.numero}</h3>
                    <p>${etapa.tentativas.length} tentativa(s) registrada(s)</p>
                </div>

            </div>

            ${historico}

            ${ehEtapaAtual ? gerarFormularioEtapaLinha(etapa) : ""}

        `;


        etapasContainer.appendChild(artigo);

    });


    if (percursoFinalizado) {

        const aviso = document.createElement("p");

        aviso.className = "etapa-aviso";

        aviso.textContent =
            "Partida finalizada. As pontuações continuam editáveis. " +
            "O tempo está bloqueado. Salve quando terminar as correções.";

        etapasContainer.appendChild(aviso);

    }


    calcularTotalLinha();

}


// ============================================================
// VALIDAR TENTATIVA DO CHECKPOINT
// ============================================================

function validarTentativaCheckpointLinha(dados, etapa) {

    if (![1, 2, 3].includes(dados.numero_tentativa_checkpoint)) {

        alert("Selecione a tentativa do checkpoint.");

        return false;
    }


    const jaRegistrada =
        etapa.tentativas.some(
            tentativa =>
                tentativa.numero_tentativa_checkpoint ===
                dados.numero_tentativa_checkpoint
        );


    if (jaRegistrada) {

        alert("Essa tentativa já foi registrada.");

        return false;
    }


    return true;
}


// ============================================================
// REGISTRAR FALHA
// ============================================================

function registrarFalhaCheckpointLinha() {

    if (!percursoIniciado || percursoFinalizado) {
        return;
    }


    const etapaAtual =
        etapasLinha[etapasLinha.length - 1];

    const dados =
        coletarDadosTentativaLinha();


    if (
        !validarTentativaCheckpointLinha(
            dados,
            etapaAtual
        )
    ) {
        return;
    }


    const pontos =
        calcularPontosEtapa(
            dados,
            etapaAtual.numero
        );


    etapaAtual.tentativas.push({

        ...dados,

        status: "falhou",

        contabilizada: false,

        pontos_calculados: pontos

    });


    // Depois da falha, os campos são limpos.
    // O juiz pode selecionar uma das tentativas restantes.

    etapaAtual.tentativaSelecionada =
        proximaTentativaDisponivel(etapaAtual);


    renderizarEtapasLinha();

    calcularTotalLinha();
}


// ============================================================
// APROVAR CHECKPOINT E AVANÇAR
// ============================================================

function aprovarCheckpointEAvancarLinha() {

    if (!percursoIniciado || percursoFinalizado) {
        return;
    }


    const etapaAtual =
        etapasLinha[etapasLinha.length - 1];

    const dados =
        coletarDadosTentativaLinha();


    if (
        !validarTentativaCheckpointLinha(
            dados,
            etapaAtual
        )
    ) {
        return;
    }


    const pontos =
        calcularPontosEtapa(
            dados,
            etapaAtual.numero
        );


    etapaAtual.tentativas.push({

        ...dados,

        status: "aprovada",

        contabilizada: true,

        pontos_calculados: pontos

    });


    // Somente a tentativa aprovada conta.
    // A etapa seguinte começa na primeira tentativa.

    etapasLinha.push(
        criarEtapa(etapasLinha.length + 1)
    );


    renderizarEtapasLinha();

    calcularTotalLinha();
}


// ============================================================
// AÇÕES DOS CHECKPOINTS
// ============================================================

etapasContainer.addEventListener("click", event => {

    const botao =
        event.target.closest("[data-acao-linha]");

    if (!botao) {
        return;
    }

    if (!percursoIniciado || percursoFinalizado) {
        return;
    }


    const acao =
        botao.dataset.acaoLinha;


    if (acao === "falhou") {

        registrarFalhaCheckpointLinha();
    }


    if (acao === "aprovada") {

        aprovarCheckpointEAvancarLinha();
    }
});


// ============================================================
// ATUALIZAÇÃO DA PRÉVIA DURANTE A PARTIDA
// ============================================================

// ============================================================
// EDIÇÃO DAS PONTUAÇÕES REGISTRADAS
// ============================================================

etapasContainer.addEventListener("input", event => {

    const campoSalvo =
        event.target.closest("[data-editar-campo]");


    if (campoSalvo) {

        const indiceEtapa =
            Number(campoSalvo.dataset.editarEtapa);

        const indiceTentativa =
            Number(campoSalvo.dataset.editarTentativa);

        const nomeCampo =
            campoSalvo.dataset.editarCampo;


        const tentativa =
            etapasLinha[indiceEtapa]?.tentativas[indiceTentativa];


        if (!tentativa) return;


        tentativa[nomeCampo] = Math.max(
            0,
            Math.floor(Number(campoSalvo.value || 0))
        );


        calcularTotalLinha();

        return;
    }


    if (event.target.matches("[data-campo-linha]")) {

        calcularTotalLinha();

    }

});


etapasContainer.addEventListener("change", event => {

    const seletorStatus =
        event.target.closest("[data-editar-status]");


    if (seletorStatus) {

        const indiceEtapa =
            Number(seletorStatus.dataset.editarEtapa);

        const indiceTentativa =
            Number(seletorStatus.dataset.editarTentativa);


        const tentativa =
            etapasLinha[indiceEtapa]?.tentativas[indiceTentativa];


        if (!tentativa) return;


        tentativa.status = seletorStatus.value;

        tentativa.contabilizada =
            tentativa.status === "aprovada";


        calcularTotalLinha();

        renderizarEtapasLinha();

        return;
    }


    if (
        event.target.matches(
            '[data-campo-linha="tentativa-checkpoint"]'
        )
    ) {

        const etapaAtual =
            etapasLinha[etapasLinha.length - 1];

        if (etapaAtual) {

            etapaAtual.tentativaSelecionada =
                Number(event.target.value || 0);

        }

        atualizarPreviewTentativaLinha();

    }

});


// ============================================================
// EVENTOS DO CRONÔMETRO
// ============================================================

botaoIniciarLinha.addEventListener(
    "click",
    iniciarPartidaLinha
);


botaoFinalizarLinha.addEventListener(
    "click",
    () => finalizarPartidaLinha(false)
);


// ============================================================
// ATUALIZAÇÃO DAS SELEÇÕES ANTES DA PARTIDA
// ============================================================

[equipeLinha, circuitoLinha, tentativaPartidaLinha]
    .forEach(campo => {

        campo.addEventListener("change", () => {
            atualizarBotoesPartidaLinha();
        });
    });


// ============================================================
// LIMPAR SEGUE A LINHA
// ============================================================

function limparPontuacaoLinha() {

    if (intervaloCronometro !== null) {

        clearInterval(intervaloCronometro);

        intervaloCronometro = null;
    }


    etapasLinha = [];

    percursoIniciado = false;
    percursoFinalizado = false;

    inicioCronometro = null;
    tempoDecorridoMs = 0;


    circuitoLinha.value = "";
    tentativaPartidaLinha.value = "";

    tempoLinha.value = "0";

    cronometroLinha.textContent = "00:00.00";

    totalLinha.textContent = "0";


    equipeLinha.disabled = false;
    circuitoLinha.disabled = false;
    tentativaPartidaLinha.disabled = false;


    renderizarEtapasLinha();

    atualizarBotoesPartidaLinha();
}


// ============================================================
// CARREGAR EQUIPES — SEGUE A LINHA
// ============================================================

async function carregarEquipesLinha() {

    equipeLinha.innerHTML =
        `<option value="">Carregando equipes...</option>`;

    equipeLinha.disabled = true;

    const { data, error } = await supabaseClient
        .from("equipes")
        .select("id, nome")
        .order("id");

    if (error) {

        console.error(
            "Erro ao carregar equipes do Seguidor de Linha:",
            error
        );

        equipeLinha.innerHTML =
            `<option value="">Erro ao carregar equipes</option>`;

        alert(
            "Erro ao carregar equipes do Seguidor de Linha: " +
            error.message
        );

        return;
    }

    if (!data || data.length === 0) {

        equipeLinha.innerHTML =
            `<option value="">Nenhuma equipe encontrada</option>`;

        console.warn("O Supabase não retornou equipes.");

        return;
    }

    equipeLinha.innerHTML =
        `<option value="">Selecione a equipe</option>`;

    data.forEach(equipe => {

        const option = document.createElement("option");

        option.value = equipe.id;
        option.textContent = equipe.nome;

        equipeLinha.appendChild(option);

    });

    equipeLinha.disabled = false;

    console.log(
        "Equipes carregadas no Seguidor de Linha:",
        data
    );
}


// ============================================================
// MUDANÇA DE EQUIPE — LINHA
// ============================================================

equipeLinha.addEventListener("change", () => {

    const option =
        equipeLinha.options[equipeLinha.selectedIndex];


    nomeEquipeLinha.textContent =
        option?.value
            ? option.textContent
            : "Selecione uma equipe";


    limparPontuacaoLinha();
});


// ============================================================
// SALVAR RESULTADO DO SEGUE A LINHA
// ============================================================

botaoSalvarLinha.addEventListener("click", async () => {

    if (!percursoFinalizado) {

        alert("Finalize a partida antes de salvar.");

        return;
    }


    const equipeId =
        Number(equipeLinha.value);

    const circuito =
        circuitoLinha.value;

    const tentativaPartida =
        tentativaPartidaLinha.value;

    const tempo =
        Number(tempoLinha.value || 0);


    if (!equipeId) {

        alert("Selecione uma equipe.");

        return;
    }


    if (!circuito) {

        alert("Selecione o circuito.");

        return;
    }


    if (!tentativaPartida) {

        alert("Selecione a tentativa da partida.");

        return;
    }


    if (tempo < 0 || tempo > 180) {

        alert("O tempo da partida precisa estar entre 0 e 180 segundos.");

        return;
    }


    const partidaId =
        partidasLinha[`${circuito}-${tentativaPartida}`];


    if (!partidaId) {

        alert("Partida não encontrada.");

        return;
    }


    const pontos =
        calcularTotalLinha();


    // --------------------------------------------------------
    // ORGANIZAR O HISTÓRICO COMPLETO
    // --------------------------------------------------------

    const detalhesLinha = {

        versao: 2,

        modalidade: "Seguidor de Linha",

        circuito: Number(circuito),

        tentativa_partida: Number(tentativaPartida),

        tempo_segundos: tempo,

        pontos_total: pontos,

        etapas: etapasLinha.map(etapa => ({

            numero_etapa: etapa.numero,

            tentativas: etapa.tentativas.map(tentativa => ({

                numero_tentativa_checkpoint:
                    tentativa.numero_tentativa_checkpoint,

                status: tentativa.status,

                contabilizada:
                    tentativa.status === "aprovada",

                ladrilhos: tentativa.ladrilhos,

                intersecao: tentativa.intersecao,

                gangorra: tentativa.gangorra,

                obstaculo: tentativa.obstaculo,

                gap: tentativa.gap,

                rampa: tentativa.rampa,

                lombada: tentativa.lombada,

                penalidades: tentativa.penalidades,

                pontos_calculados:
                    tentativa.pontos_calculados

            }))
        }))
    };


    // --------------------------------------------------------
    // VERIFICAR RESULTADO EXISTENTE
    // --------------------------------------------------------

    const {
        data: existente,
        error: erroBusca
    } =
        await supabaseClient
            .from("participantes")
            .select("id")
            .eq("equipe_id", equipeId)
            .eq("partida_id", partidaId)
            .maybeSingle();


    if (erroBusca) {

        console.error(erroBusca);

        alert("Erro ao verificar resultado.");

        return;
    }


    // --------------------------------------------------------
    // ATUALIZAR OU INSERIR RESULTADO
    // --------------------------------------------------------

    let resultado;

    if (existente) {

        resultado =
            await supabaseClient
                .from("participantes")
                .update({

                    pontos: pontos,

                    tempo_segundos: tempo,

                    finalizado: true,

                    detalhes_linha: detalhesLinha

                })
                .eq("id", existente.id);

    } else {

        resultado =
            await supabaseClient
                .from("participantes")
                .insert({

                    equipe_id: equipeId,

                    partida_id: partidaId,

                    pontos: pontos,

                    tempo_segundos: tempo,

                    finalizado: true,

                    detalhes_linha: detalhesLinha

                });
    }

if (resultado.error) {
    console.error("ERRO COMPLETO AO SALVAR:", resultado.error);

    alert(
        "Erro ao salvar:\n\n" +
        resultado.error.message
    );

    return;
}


    alert(
        `Resultado salvo com sucesso!\n\n` +
        `Etapas registradas: ${etapasLinha.length}\n` +
        `Pontuação: ${pontos}\n` +
        `Tempo: ${tempo}s`
    );


    limparPontuacaoLinha();

    await verificarLinhaCompleto();
});


// ============================================================
// VERIFICAR SE O SEGUIDOR DE LINHA ESTÁ COMPLETO
// ============================================================

async function verificarLinhaCompleto() {

    const ids =
        Object.values(partidasLinha);


    const { data, error } =
        await supabaseClient
            .from("participantes")
            .select(
                "partida_id, equipe_id, pontos, tempo_segundos, finalizado"
            )
            .in("partida_id", ids);


    if (error) {

        console.error(error);

        return false;
    }


    const finalizados =
        (data || []).filter(
            item => item.finalizado === true
        );


    console.log(
        `Seguidor de Linha: ${finalizados.length} resultados registrados.`
    );


    return finalizados.length >= 30;
}


// ============================================================
// BALÃO — ELEMENTOS
// ============================================================

const equipeBalao =
    document.getElementById("equipe");

const nomeEquipe =
    document.getElementById("nome-equipe");

const rodadaBalao =
    document.getElementById("rodada-balao");

const tituloRodadaBalao =
    document.getElementById("titulo-rodada-balao");

const statusBalao =
    document.getElementById("status-balao");


// AUTÔNOMO

const autonomoCentralBalao =
    document.getElementById("autonomo-central-balao");

const autonomoOutroLadoBalao =
    document.getElementById("autonomo-outro-lado-balao");

const autonomoAtrasAdversarioBalao =
    document.getElementById("autonomo-atras-adversario-balao");


// TELEOPERADO

const teleoperadoCentralBalao =
    document.getElementById("teleoperado-central-balao");

const teleoperadoOutroLadoBalao =
    document.getElementById("teleoperado-outro-lado-balao");

const teleoperadoAtrasAdversarioBalao =
    document.getElementById("teleoperado-atras-adversario-balao");


// OUTROS CRITÉRIOS

const sobreviventeBalao =
    document.getElementById("sobrevivente-balao");

const penalidadesBalao =
    document.getElementById("penalidades-balao");

const totalBalao =
    document.getElementById("total-geral");

const botaoSalvarBalao =
    document.getElementById("salvar-balao");


let equipesBalaoCache = [];

let partidasBalaoCache = [];


// ============================================================
// VALORES DA PONTUAÇÃO
// ============================================================

const PONTOS_AUTONOMO_CENTRAL = 60;
const PONTOS_AUTONOMO_OUTRO_LADO = 120;
const PONTOS_AUTONOMO_ATRAS_ADVERSARIO = 300;

const PONTOS_TELEOPERADO_CENTRAL = 20;
const PONTOS_TELEOPERADO_OUTRO_LADO = 40;
const PONTOS_TELEOPERADO_ATRAS_ADVERSARIO = 100;

const PONTOS_SOBREVIVENTE_BALAO = 20;
const PONTOS_PENALIDADE_BALAO = 40;


// ============================================================
// CARREGAR EQUIPES DO BALÃO
// ============================================================

async function carregarEquipesBalao() {

    const { data, error } =
        await supabaseClient
            .from("equipes")
            .select("id, nome")
            .order("id");


    if (error) {

        console.error(error);

        alert("Erro ao carregar equipes do Balão.");

        return;
    }


    equipesBalaoCache = data || [];

    equipeBalao.innerHTML =
        `<option value="">Selecione a equipe</option>`;


    equipesBalaoCache.forEach(equipe => {

        const option =
            document.createElement("option");

        option.value = equipe.id;

        option.textContent = equipe.nome;

        equipeBalao.appendChild(option);

    });

}


// ============================================================
// CARREGAR RODADAS DO SUPABASE
// ============================================================

async function carregarPartidasBalao() {

    const { data, error } =
        await supabaseClient
            .from("partidas")
            .select("id, equipe_id")
            .eq("modalidade", "Desafio do balão")
            .order("id");

    if (error) {

        console.error(error);

        alert("Erro ao carregar rodadas do Balão.");

        return;
    }


    partidasBalaoCache = data || [];

}


// ============================================================
// LIMPAR CAMPOS DO BALÃO
// ============================================================

function limparCamposBalao() {

    autonomoCentralBalao.value = 0;

    autonomoOutroLadoBalao.value = 0;

    autonomoAtrasAdversarioBalao.value = 0;


    teleoperadoCentralBalao.value = 0;

    teleoperadoOutroLadoBalao.value = 0;

    teleoperadoAtrasAdversarioBalao.value = 0;


    sobreviventeBalao.checked = false;

    penalidadesBalao.value = 0;


    totalBalao.textContent = 0;

}


// ============================================================
// OBTER QUANTIDADE DOS CAMPOS
// ============================================================

function obterQuantidadeBalao(campo) {

    return Math.max(
        0,
        Math.floor(Number(campo.value || 0))
    );

}


// ============================================================
// PREENCHER SELETOR DE RODADAS
// ============================================================

function carregarOpcoesRodadaBalao() {

    rodadaBalao.innerHTML =
        `<option value="">Selecione a rodada</option>`;

    rodadaBalao.disabled = true;

    botaoSalvarBalao.disabled = true;

    tituloRodadaBalao.textContent =
        "Selecione uma rodada";

    limparCamposBalao();


    const equipeId =
        Number(equipeBalao.value);


    if (!equipeId) {

        statusBalao.textContent =
            "Selecione equipe e rodada.";

        return;
    }


const partidasEquipe =
    partidasBalaoCache.filter(
        partida => Number(partida.equipe_id) === equipeId
    );

        const option =
            document.createElement("option");

        option.value = partida.id;

        option.textContent =
            `Rodada ${indice + 1}`;

        rodadaBalao.appendChild(option);

    });


    rodadaBalao.disabled =
        partidasEquipe.length !== 3;


    if (partidasEquipe.length !== 3) {

        statusBalao.textContent =
            "Não foi possível localizar as três rodadas desta equipe.";

        return;
    }


    statusBalao.textContent =
        "Selecione a rodada que deseja registrar.";

}


// ============================================================
// CALCULAR PONTUAÇÃO DO BALÃO
// ============================================================

function calcularTotalBalao() {

    // AUTÔNOMO

    const autonomoCentral =
        obterQuantidadeBalao(autonomoCentralBalao);

    const autonomoOutroLado =
        obterQuantidadeBalao(autonomoOutroLadoBalao);

    const autonomoAtrasAdversario =
        obterQuantidadeBalao(autonomoAtrasAdversarioBalao);


    // TELEOPERADO

    const teleoperadoCentral =
        obterQuantidadeBalao(teleoperadoCentralBalao);

    const teleoperadoOutroLado =
        obterQuantidadeBalao(teleoperadoOutroLadoBalao);

    const teleoperadoAtrasAdversario =
        obterQuantidadeBalao(teleoperadoAtrasAdversarioBalao);


    // SOBREVIVENTE

    const sobrevivente =
        sobreviventeBalao.checked
            ? PONTOS_SOBREVIVENTE_BALAO
            : 0;


    // PENALIDADES

    const penalidades =
        obterQuantidadeBalao(penalidadesBalao);


    // SOMA DA PONTUAÇÃO

    const pontosAutonomo =

        autonomoCentral * PONTOS_AUTONOMO_CENTRAL +

        autonomoOutroLado * PONTOS_AUTONOMO_OUTRO_LADO +

        autonomoAtrasAdversario *
            PONTOS_AUTONOMO_ATRAS_ADVERSARIO;


    const pontosTeleoperado =

        teleoperadoCentral * PONTOS_TELEOPERADO_CENTRAL +

        teleoperadoOutroLado *
            PONTOS_TELEOPERADO_OUTRO_LADO +

        teleoperadoAtrasAdversario *
            PONTOS_TELEOPERADO_ATRAS_ADVERSARIO;


    const total = Math.max(
        0,
        pontosAutonomo +
        pontosTeleoperado +
        sobrevivente -
        penalidades * 40
    );


    totalBalao.textContent = total;

    return total;

}


// ============================================================
// ATUALIZAÇÃO DOS CAMPOS DO BALÃO
// ============================================================

const camposBalao = [

    autonomoCentralBalao,
    autonomoOutroLadoBalao,
    autonomoAtrasAdversarioBalao,

    teleoperadoCentralBalao,
    teleoperadoOutroLadoBalao,
    teleoperadoAtrasAdversarioBalao,

    sobreviventeBalao,
    penalidadesBalao

];


camposBalao.forEach(campo => {

    campo.addEventListener("input", () => {

        calcularTotalBalao();

        botaoSalvarBalao.disabled =
            !rodadaBalao.value;

    });


    campo.addEventListener("change", () => {

        calcularTotalBalao();

        botaoSalvarBalao.disabled =
            !rodadaBalao.value;

    });

});


// ============================================================
// SELEÇÃO DA EQUIPE
// ============================================================

equipeBalao.addEventListener("change", () => {

    const option =
        equipeBalao.options[equipeBalao.selectedIndex];


    nomeEquipe.textContent =
        option?.value
            ? option.textContent
            : "Selecione uma equipe";


    carregarOpcoesRodadaBalao();

});


// ============================================================
// SELEÇÃO DA RODADA
// ============================================================

rodadaBalao.addEventListener("change", async () => {

    limparCamposBalao();

    botaoSalvarBalao.disabled =
        !rodadaBalao.value;


    const equipeId =
        Number(equipeBalao.value);

    const partidaId =
        Number(rodadaBalao.value);


    if (!equipeId || !partidaId) {

        statusBalao.textContent =
            "Selecione equipe e rodada.";

        tituloRodadaBalao.textContent =
            "Selecione uma rodada";

        return;
    }


    tituloRodadaBalao.textContent =
        rodadaBalao.options[
            rodadaBalao.selectedIndex
        ].textContent;


    const { data, error } =
        await supabaseClient
            .from("participantes")
            .select("id, pontos")
            .eq("equipe_id", equipeId)
            .eq("partida_id", partidaId)
            .maybeSingle();


    if (error) {

        console.error(error);

        statusBalao.textContent =
            "Erro ao consultar o resultado.";

        return;
    }


    if (data) {

        totalBalao.textContent =
            Number(data.pontos || 0);

        statusBalao.textContent =
            `Já existe um resultado salvo: ${data.pontos} pontos. ` +
            "Para corrigir, informe novamente as quantidades e salve.";

        botaoSalvarBalao.disabled = true;

    } else {

        statusBalao.textContent =
            "Esta rodada ainda não possui resultado salvo.";

        calcularTotalBalao();

        botaoSalvarBalao.disabled = false;

    }

});


// ============================================================
// SALVAR UMA RODADA POR VEZ
// ============================================================

botaoSalvarBalao.addEventListener("click", async () => {

    const equipeId =
        Number(equipeBalao.value);

    const partidaId =
        Number(rodadaBalao.value);


    if (!equipeId) {

        alert("Selecione uma equipe.");

        return;
    }


    if (!partidaId) {

        alert("Selecione uma rodada.");

        return;
    }


    const pontos =
        calcularTotalBalao();


    const { data: existente, error: erroBusca } =
        await supabaseClient
            .from("participantes")
            .select("id")
            .eq("equipe_id", equipeId)
            .eq("partida_id", partidaId)
            .maybeSingle();


    if (erroBusca) {

        console.error(erroBusca);

        alert("Erro ao verificar o resultado.");

        return;
    }


    let resultado;


    if (existente) {

        resultado =
            await supabaseClient
                .from("participantes")
                .update({

                    pontos: pontos,

                    finalizado: true

                })
                .eq("id", existente.id);

    } else {

        resultado =
            await supabaseClient
                .from("participantes")
                .insert({

                    equipe_id: equipeId,

                    partida_id: partidaId,

                    pontos: pontos,

                    finalizado: true

                });

    }


    if (resultado.error) {

        console.error(resultado.error);

        alert("Erro ao salvar o resultado da rodada.");

        return;
    }


    statusBalao.textContent =
        `Resultado salvo com sucesso: ${pontos} pontos.`;


    botaoSalvarBalao.disabled = true;


    alert("Resultado desta rodada salvo com sucesso!");


    const completo =
        await verificarBalaoCompleto();


    if (completo) {

        await sortearChaveamento();

    }

});


// ============================================================
// VERIFICAR SE TODAS AS RODADAS DO BALÃO FORAM SALVAS
// ============================================================

async function verificarBalaoCompleto() {

    const { data: partidas, error } =
        await supabaseClient
            .from("partidas")
            .select("id")
            .eq("modalidade", "Desafio do balão");


    if (error) {

        console.error(error);

        return false;
    }


    const ids =
        partidas.map(partida => partida.id);


    const { data: resultados, error: erroResultados } =
        await supabaseClient
            .from("participantes")
            .select("partida_id, equipe_id, pontos, finalizado")
            .in("partida_id", ids);


    if (erroResultados) {

        console.error(erroResultados);

        return false;
    }


    const finalizados =
        (resultados || []).filter(
            resultado => resultado.finalizado === true
        );


    return finalizados.length >= 15;

}


// ============================================================
// SORTEAR CHAVEAMENTO
// ============================================================

async function sortearChaveamento() {

    const {
        data: existente,
        error: erroExistente
    } =
        await supabaseClient
            .from("chaveamento")
            .select("id")
            .limit(1);


    if (erroExistente) {

        console.error(erroExistente);

        return;
    }


    if (existente?.length) {
        return;
    }


    const {
        data: equipes,
        error: erroEquipes
    } =
        await supabaseClient
            .from("equipes")
            .select("id, nome")
            .order("id");


    if (erroEquipes) {

        console.error(erroEquipes);

        return;
    }


    const { data: partidas } =
        await supabaseClient
            .from("partidas")
            .select("id")
            .eq("modalidade", "Desafio do balão");


    const ids =
        partidas.map(partida => partida.id);


    const { data: resultados } =
        await supabaseClient
            .from("participantes")
            .select("equipe_id, pontos, finalizado")
            .in("partida_id", ids);


    const pontuacao = {};


    equipes.forEach(equipe => {

        pontuacao[equipe.id] = 0;
    });


    resultados
        .filter(resultado => resultado.finalizado === true)
        .forEach(resultado => {

            pontuacao[resultado.equipe_id] +=
                Number(resultado.pontos || 0);
        });


    const ranking =
        [...equipes].sort(
            (a, b) =>
                pontuacao[b.id] -
                pontuacao[a.id]
        );


    const classificados =
        ranking.slice(0, 4);


    if (classificados.length < 4) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("chaveamento")
            .insert({
                semifinal1_equipe1: classificados[0].id,
                semifinal1_equipe2: classificados[1].id,
                semifinal2_equipe1: classificados[2].id,
                semifinal2_equipe2: classificados[3].id
            });


    if (error) {

        console.error(error);

        return;
    }


    await carregarEliminatorias();
}


// ============================================================
// CARREGAR ELIMINATÓRIAS
// ============================================================

async function carregarEliminatorias() {

    // Verifica se todas as 15 partidas do Balão
    // já possuem resultado registrado.
const { data: partidasBalao, error: erroPartidas } =
    await supabaseClient
        .from("partidas")
        .select("id")
        .eq("modalidade", "Desafio do balão");

if (erroPartidas) {
    console.error(erroPartidas);
    return;
}

const idsPartidasBalao =
    partidasBalao.map(partida => partida.id);

const { data: resultadosBalao, error: erroBalao } =
    await supabaseClient
        .from("participantes")
        .select("partida_id, equipe_id, finalizado")
        .in("partida_id", idsPartidasBalao);

if (erroBalao) {
    console.error(erroBalao);
    return;
}

const finalizadosBalao =
    (resultadosBalao || []).filter(
        resultado => resultado.finalizado === true
    );

const balãoCompleto =
    finalizadosBalao.length >= 15;

    // Carrega o chaveamento atual
    const {
        data,
        error
    } = await supabaseClient
        .from("chaveamento")
        .select("*")
        .order("id", {
            ascending: false
        })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return;
    }

    if (!data) {
        return;
    }

    // Se as 15 partidas ainda não terminaram,
    // não mostra nenhuma equipe nas semifinais.
    if (!balãoCompleto) {

        preencherSelect(
            "semifinal1-vencedor",
            [],
            {},
            "Aguardando término das 3 rodadas"
        );

        preencherSelect(
            "semifinal2-vencedor",
            [],
            {},
            "Aguardando término das 3 rodadas"
        );

        // Também mantém as fases seguintes vazias.
        preencherSelect(
            "final-vencedor",
            [],
            {},
            "Aguardando as semifinais"
        );

        preencherSelect(
            "terceiro-vencedor",
            [],
            {},
            "Aguardando as semifinais"
        );

        return;
    }

    // -----------------------------------------------------
    // BALÃO COMPLETO → CARREGA AS EQUIPES DAS SEMIFINAIS
    // -----------------------------------------------------

    const ids = [
        data.semifinal1_equipe1,
        data.semifinal1_equipe2,
        data.semifinal2_equipe1,
        data.semifinal2_equipe2,
        data.semifinal1_vencedor,
        data.semifinal2_vencedor,
        data.semifinal1_perdedor,
        data.semifinal2_perdedor,
        data.final_vencedor,
        data.terceiro_vencedor
    ].filter(Boolean);

    const {
        data: equipes,
        error: erroEquipes
    } = await supabaseClient
        .from("equipes")
        .select("id, nome")
        .in("id", ids);

    if (erroEquipes) {
        console.error(erroEquipes);
        return;
    }

    const nomes = {};

    equipes.forEach(equipe => {
        nomes[equipe.id] = equipe.nome;
    });

    // -----------------------------------------------------
    // SEMIFINAL 1
    // -----------------------------------------------------

    preencherSelect(
        "semifinal1-vencedor",
        [
            data.semifinal1_equipe1,
            data.semifinal1_equipe2
        ],
        nomes,
        "Selecione o vencedor"
    );

    // -----------------------------------------------------
    // SEMIFINAL 2
    // -----------------------------------------------------

    preencherSelect(
        "semifinal2-vencedor",
        [
            data.semifinal2_equipe1,
            data.semifinal2_equipe2
        ],
        nomes,
        "Selecione o vencedor"
    );

    // -----------------------------------------------------
    // FINAL
    // -----------------------------------------------------

    if (
        data.semifinal1_vencedor &&
        data.semifinal2_vencedor
    ) {

        preencherSelect(
            "final-vencedor",
            [
                data.semifinal1_vencedor,
                data.semifinal2_vencedor
            ],
            nomes,
            "Selecione o campeão"
        );

    } else {

        preencherSelect(
            "final-vencedor",
            [],
            {},
            "Aguardando as semifinais"
        );
    }

    // -----------------------------------------------------
    // 3º LUGAR
    // -----------------------------------------------------

    if (
        data.semifinal1_perdedor &&
        data.semifinal2_perdedor
    ) {

        preencherSelect(
            "terceiro-vencedor",
            [
                data.semifinal1_perdedor,
                data.semifinal2_perdedor
            ],
            nomes,
            "Selecione o vencedor"
        );

    } else {

        preencherSelect(
            "terceiro-vencedor",
            [],
            {},
            "Aguardando as semifinais"
        );
    }
}


// ============================================================
// PREENCHER SELECT
// ============================================================

function preencherSelect(
    id,
    equipesIds,
    nomes,
    textoInicial
) {

    const select =
        document.getElementById(id);


    if (!select) {
        return;
    }


    select.innerHTML =
        `<option value="">${textoInicial}</option>`;


    equipesIds
        .filter(Boolean)
        .forEach(equipeId => {

            const option =
                document.createElement("option");

            option.value = equipeId;

            option.textContent =
                nomes[equipeId] || "";

            select.appendChild(option);
        });
}


// ============================================================
// SALVAR SEMIFINAL 1
// ============================================================

document
    .getElementById("salvar-semifinal1")
    ?.addEventListener("click", async () => {

        const vencedor =
            document.getElementById(
                "semifinal1-vencedor"
            ).value;


        if (!vencedor) {

            alert("Selecione o vencedor da Semifinal 1.");

            return;
        }


        await salvarVencedorSemifinal(
            1,
            vencedor
        );
    });


// ============================================================
// SALVAR SEMIFINAL 2
// ============================================================

document
    .getElementById("salvar-semifinal2")
    ?.addEventListener("click", async () => {

        const vencedor =
            document.getElementById(
                "semifinal2-vencedor"
            ).value;


        if (!vencedor) {

            alert("Selecione o vencedor da Semifinal 2.");

            return;
        }


        await salvarVencedorSemifinal(
            2,
            vencedor
        );
    });


// ============================================================
// SALVAR VENCEDOR DA SEMIFINAL
// ============================================================

async function salvarVencedorSemifinal(
    numero,
    vencedor
) {

    const {
        data: chave,
        error
    } =
        await supabaseClient
            .from("chaveamento")
            .select("*")
            .order("id", {
                ascending: false
            })
            .limit(1)
            .single();


    if (error) {

        console.error(error);

        alert("Erro ao carregar chaveamento.");

        return;
    }


    const equipe1 =
        chave[`semifinal${numero}_equipe1`];

    const equipe2 =
        chave[`semifinal${numero}_equipe2`];


    const perdedor =
        Number(vencedor) === Number(equipe1)
            ? equipe2
            : equipe1;


    const dados = {};

    dados[`semifinal${numero}_vencedor`] =
        Number(vencedor);

    dados[`semifinal${numero}_perdedor`] =
        Number(perdedor);


    const { error: erroUpdate } =
        await supabaseClient
            .from("chaveamento")
            .update(dados)
            .eq("id", chave.id);


    if (erroUpdate) {

        console.error(erroUpdate);

        alert("Erro ao salvar semifinal.");

        return;
    }


    alert(`Semifinal ${numero} salva!`);

    await carregarEliminatorias();
}


// ============================================================
// SALVAR FINAL
// ============================================================

document
    .getElementById("salvar-final")
    ?.addEventListener("click", async () => {

        const vencedor =
            document.getElementById(
                "final-vencedor"
            ).value;


        if (!vencedor) {

            alert("Selecione o campeão.");

            return;
        }


        const {
            data: chave,
            error
        } =
            await supabaseClient
                .from("chaveamento")
                .select("id")
                .order("id", {
                    ascending: false
                })
                .limit(1)
                .single();


        if (error) {

            console.error(error);

            alert("Erro ao carregar chaveamento.");

            return;
        }


        const { error: erroUpdate } =
            await supabaseClient
                .from("chaveamento")
                .update({
                    final_vencedor: Number(vencedor)
                })
                .eq("id", chave.id);


        if (erroUpdate) {

            console.error(erroUpdate);

            alert("Erro ao salvar campeão.");

            return;
        }


        alert("Campeão salvo!");

        await carregarEliminatorias();
    });


// ============================================================
// SALVAR TERCEIRO LUGAR
// ============================================================

document
    .getElementById("salvar-terceiro")
    ?.addEventListener("click", async () => {

        const vencedor =
            document.getElementById(
                "terceiro-vencedor"
            ).value;


        if (!vencedor) {

            alert("Selecione o 3º colocado.");

            return;
        }


        const {
            data: chave,
            error
        } =
            await supabaseClient
                .from("chaveamento")
                .select("id")
                .order("id", {
                    ascending: false
                })
                .limit(1)
                .single();


        if (error) {

            console.error(error);

            alert("Erro ao carregar chaveamento.");

            return;
        }


        const { error: erroUpdate } =
            await supabaseClient
                .from("chaveamento")
                .update({
                    terceiro_vencedor: Number(vencedor)
                })
                .eq("id", chave.id);


        if (erroUpdate) {

            console.error(erroUpdate);

            alert("Erro ao salvar 3º colocado.");

            return;
        }


        alert("3º colocado salvo!");

        await carregarEliminatorias();
    });


// ============================================================
// INICIALIZAÇÃO
// ============================================================

balao.style.display = "block";
linha.style.display = "none";
eliminatorias.style.display = "none";

renderizarEtapasLinha();

atualizarDisplayCronometro();

atualizarBotoesPartidaLinha();

calcularTotalLinha();

calcularTotalBalao();


async function inicializar() {

    await carregarEquipesLinha();

    await carregarEquipesBalao();

    await carregarPartidasBalao();

    await carregarEliminatorias();

}

inicializar();
