/**
 * Regras dos jogos de mesa — alinhadas ao que o código realmente faz
 */

export const TABLE_GAME_RULES = {
  chess: {
    objetivo: "Dar xeque-mate no rei do bot. Você joga de brancas.",
    como_jogar: [
      "Toque numa peça branca e depois numa casa destacada para mover.",
      "Turnos: você → bot. Só valem jogadas legais.",
      "Peão na última fileira vira rainha automaticamente.",
    ],
    pode: [
      "Mover peão 1 casa (ou 2 no primeiro lance), capturar na diagonal",
      "Cavalo em L; torre, bispo e rainha em linha/diagonal sem pular",
      "Rei 1 casa em qualquer direção; capturar peça adversária",
    ],
    nao_pode: [
      "Roque (não existe neste modo)",
      "En passant (não existe neste modo)",
      "Escolher promoção (sempre vira rainha)",
      "Mover peça cravada ou deixar o próprio rei em xeque",
    ],
    vitoria:
      "Xeque-mate = vitória. Empate: afogamento, material insuficiente, 50 lances sem peão/captura, repetição 3×. Desistir ou estourar o tempo = derrota.",
  },

  dama: {
    objetivo: "Eliminar todas as peças do bot ou deixá-lo sem jogada. Você joga com as claras.",
    como_jogar: [
      "Tabuleiro 8×8 nas casas escuras; 12 peças por lado.",
      "Toque na peça e depois no destino destacado.",
      "Se houver captura, ela é obrigatória (e a de mais capturas).",
    ],
    pode: [
      "Peão anda 1 diagonal à frente; captura nas 4 diagonais",
      "Capturas em sequência na mesma jogada",
      "Dama voadora: anda e captura à distância nas diagonais",
      "Promoção a dama na última fileira",
    ],
    nao_pode: [
      "Fazer lance quieto se existir captura",
      "Escolher sequência com menos capturas que o máximo",
    ],
    vitoria:
      "Adversário sem peças ou sem lances legais. Empate só por acordo. Desistir/tempo = derrota.",
  },

  sinuca: {
    objetivo: "Encaçapar suas bolas (lisas ou listradas) e depois a 8 de forma legal.",
    como_jogar: [
      "Arraste a mira na branca e solte para tacada (força = arrasto).",
      "Mesa começa aberta: a 1ª bola encaçapada (≠8) define seu grupo.",
      "Com grupo definido, o 1º contato deve ser com bola do seu grupo.",
    ],
    pode: [
      "Mirar em qualquer ângulo e força",
      "Continuar a vez ao encaçapar bola do seu grupo",
      "Jogar na 8 só depois de limpar o grupo",
    ],
    nao_pode: [
      "Encaçapar a 8 antes de limpar o grupo (derrota)",
      "Primeiro contato com bola errada (falta)",
      "Encaçapar a branca (falta — branca volta à posição fixa)",
    ],
    vitoria:
      "8 legal com grupo limpo = vitória. 8 ilegal / scratch na 8 = derrota. Modo 8-ball simplificado (sem ball-in-hand livre).",
  },

  truco: {
    objetivo: "Chegar a 12 pontos antes do bot (Truco Paulista 1v1).",
    como_jogar: [
      "Cada mão: 3 cartas + vira. Manilha = próximo valor da vira.",
      "Jogue 1 carta por rodada; quem ganha a rodada inicia a próxima.",
      "Pode pedir TRUCO → 3 → 6 → 9 → DOZE; adversário aceita ou corre.",
    ],
    pode: [
      "Jogar qualquer carta da mão na sua vez",
      "Pedir aumento de valor (até 12)",
      "Aceitar ou correr quando o bot pede truco",
    ],
    nao_pode: [
      "Envido / flor (não existem neste modo)",
      "Empatar a partida (joga até 12)",
    ],
    vitoria:
      "Primeiro a ≥12 pontos. Correr no truco perde o valor atual da mão. Manilhas por naipe: ♣ > ♥ > ♠ > ♦. Baralho 40 (sem 8/9/10).",
  },

  domino: {
    objetivo: "Esvaziar a mão encaixando pedras nas pontas (duplo-6).",
    como_jogar: [
      "7 pedras cada; resto no monte.",
      "Qualquer pedra abre; depois encaixe um valor igual à ponta.",
      "Sem jogada: Comprar / Passar (compra do monte ou passa se vazio).",
    ],
    pode: [
      "Jogar pedra que case com alguma ponta",
      "Abrir com qualquer pedra",
      "Comprar do monte ou passar",
    ],
    nao_pode: [
      "Jogar pedra que não casa",
      "Escolher o lado manualmente se as duas pontas aceitam (prioriza a esquerda)",
    ],
    vitoria: "Quem zerar a mão bate e vence. Desistir ou estourar o tempo = derrota.",
  },

  lig4: {
    objetivo: "Alinhar 4 peças suas (horizontal, vertical ou diagonal) no grid 7×6.",
    como_jogar: [
      "Você começa; toque numa coluna.",
      "A peça cai na casa livre mais baixa.",
      "Bot joga em seguida até alguém ligar 4 ou a grade encher.",
    ],
    pode: ["Escolher qualquer coluna com espaço"],
    nao_pode: ["Jogar em coluna cheia", "Colocar peça no ar (sempre cai)"],
    vitoria: "4 em linha = vitória. Grade cheia sem 4 = empate. Desistir/tempo = bot vence.",
  },

  velha: {
    objetivo: "Alinhar 3 símbolos iguais em linha, coluna ou diagonal no 3×3.",
    como_jogar: [
      "Escolha se quer jogar de X (você começa) ou O (o bot começa).",
      "Toque numa casa vazia na sua vez.",
      "Alterna até vitória ou empate.",
    ],
    pode: ["Marcar qualquer casa vazia na sua vez"],
    nao_pode: ["Jogar em casa ocupada", "Jogar fora da sua vez"],
    vitoria: "3 iguais = vitória. Tabuleiro cheio sem linha = empate. Desistir/tempo = bot vence.",
  },

  blackjack: {
    objetivo: "Ganhar 5 mãos contra o dealer antes dele (melhor ≤21 sem estourar).",
    como_jogar: [
      "2 cartas pra você e 2 pro dealer (1 virada).",
      "Pedir = compra carta; Parar = encerra sua vez.",
      "Dealer compra enquanto total < 17. Ás vale 11 ou 1.",
    ],
    pode: ["Pedir cartas", "Parar", "Ir para a próxima mão"],
    nao_pode: [
      "Double / split / insurance (não existem)",
      "Blackjack natural com pagamento especial (só compara totais)",
    ],
    vitoria:
      "Estourou (>21) perde a mão. Dealer estourou ou seu total maior = você marca. Empate de total = push. Primeiro a 5 mãos vence. Desistir ou estourar o tempo = derrota.",
  },

  poker: {
    objetivo: "Zerar as fichas do bot (heads-up; ambos começam com 100).",
    como_jogar: [
      "Cada mão: 5 cartas + ante 5/5.",
      "Escolha Apostar 10 ou Check.",
      "Se apostar: bot pode pagar ou foldar.",
    ],
    pode: ["Apostar +10", "Check (showdown sem raise)"],
    nao_pode: [
      "Trocar cartas / draw (não há descarte)",
      "All-in / raises múltiplos / Texas Hold'em (não é community)",
    ],
    vitoria:
      "Adversário com ≤0 fichas. Ranking: straight flush > quadra > full house > flush > straight > trinca > dois pares > par > carta alta. Desistir ou estourar o tempo = derrota.",
  },

  memoria: {
    objetivo: "Fazer mais pares que o bot num grid 4×4 (8 pares).",
    como_jogar: [
      "Na sua vez, vire 2 cartas.",
      "Iguais = ponto e joga de novo; diferentes = viram e passa a vez.",
      "Bot tem memória parcial (depende da dificuldade).",
    ],
    pode: ["Virar até 2 cartas fechadas por tentativa"],
    nao_pode: ["Virar carta já feita", "Virar mais de 2", "Jogar na vez do bot"],
    vitoria:
      "Quando todos os pares estão feitos, quem tem mais pontos vence (empate possível). Desistir/tempo = bot.",
  },

  uno: {
    objetivo: "Zerar a mão antes do bot (regras oficiais do UNO, 1v1).",
    como_jogar: [
      "7 cartas cada; uma carta abre o descarte.",
      "Jogue carta da mesma cor, mesmo número/símbolo, ou um coringa.",
      "Sem jogada: compre 1 carta — se ela der jogo, pode jogar na hora.",
      "Coringa e +4: você escolhe a cor da mesa.",
    ],
    pode: [
      "Jogar carta legal ou coringa a qualquer momento da sua vez",
      "Jogar a carta que acabou de comprar (se for válida)",
      "Usar +2 (bot compra 2 e perde a vez), +4 (compra 4 e perde a vez)",
      "Pular (⊘) e Inverter (⇄): no 1v1, o adversário perde a vez",
    ],
    nao_pode: [
      "Jogar carta que não combina cor nem símbolo",
      "Comprar mais de 1 carta por turno",
      "Empatar (joga até alguém bater)",
    ],
    vitoria:
      "Mão vazia = vitória. Com 1 carta o UNO é anunciado automaticamente. Desistir ou estourar o tempo = derrota.",
  },

  batalha: {
    objetivo: "Afundar os 5 navios do bot antes que ele afunde os seus.",
    como_jogar: [
      "Cada frota tem 5 navios (4, 3, 3, 2 e 2 células) posicionados automaticamente.",
      "Na sua vez, toque numa célula do tabuleiro inimigo para atirar.",
      "✸ = acertou (atira de novo!) · • = água (vez do bot).",
      "Seu tabuleiro à direita mostra seus navios e os tiros do bot.",
    ],
    pode: [
      "Atirar em qualquer célula ainda não atacada",
      "Continuar atirando enquanto acertar",
      "Reiniciar para sortear novas posições",
    ],
    nao_pode: [
      "Atirar na mesma célula duas vezes",
      "Mover os navios depois que a partida começou",
      "Ver os navios do bot (só os acertos aparecem)",
    ],
    vitoria:
      "Afundou as 14 células inimigas = vitória. Navios não se tocam. Desistir ou estourar o tempo = derrota.",
  },

  general: {
    objetivo: "Fazer mais pontos que o bot preenchendo as 11 categorias de dados.",
    como_jogar: [
      "No seu turno, role os 5 dados (até 3 rolagens).",
      "Entre as rolagens, toque nos dados que quer segurar.",
      "Depois, toque numa categoria livre para marcar os pontos.",
      "Uns a Seis: soma da face · Trinca/Quadra: soma dos 5 dados · Full: 25 · Sequência: 30 · GENERAL: 50.",
    ],
    pode: [
      "Parar de rolar quando quiser (1, 2 ou 3 rolagens)",
      "Marcar 0 numa categoria pra queimar ela",
      "Ver o preview de pontos (→) em cada categoria livre",
    ],
    nao_pode: [
      "Usar a mesma categoria duas vezes",
      "Rolar mais de 3 vezes no turno",
      "Pular seu turno sem marcar categoria",
    ],
    vitoria:
      "Quando as 11 categorias dos dois estiverem cheias, maior total vence (empate possível). Desistir ou estourar o tempo = derrota.",
  },
};

export function getTableGameRules(gameId) {
  return TABLE_GAME_RULES[gameId] || null;
}

export function renderRulesHtml(rules) {
  if (!rules) {
    return `<p class="tg-rules-empty">Regras em breve.</p>`;
  }
  const list = (items) =>
    (items || []).map((t) => `<li>${t}</li>`).join("");
  const steps = (items) =>
    (items || [])
      .map(
        (t, i) =>
          `<li class="tg-rules-step"><span class="tg-rules-step-num">${i + 1}</span><span>${t}</span></li>`
      )
      .join("");
  return `
    <p class="tg-rules-goal">🎯 <strong>Objetivo:</strong> ${rules.objetivo}</p>
    <h3 class="tg-rules-sub">📖 Como jogar</h3>
    <ol class="tg-rules-steps">${steps(rules.como_jogar)}</ol>
    <div class="tg-rules-cols">
      <div class="tg-rules-col ok">
        <h3 class="tg-rules-sub">✅ Pode</h3>
        <ul class="tg-rules-list tg-rules-ok">${list(rules.pode)}</ul>
      </div>
      <div class="tg-rules-col no">
        <h3 class="tg-rules-sub">🚫 Não pode</h3>
        <ul class="tg-rules-list tg-rules-no">${list(rules.nao_pode)}</ul>
      </div>
    </div>
    <p class="tg-rules-end">🏆 <strong>Vitória / fim:</strong> ${rules.vitoria}</p>
  `;
}
