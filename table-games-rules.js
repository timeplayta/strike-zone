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
    vitoria: "Quem zerar a mão bate e vence. Desistir = bot vence.",
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
    objetivo: "Alinhar 3 X em linha, coluna ou diagonal no 3×3.",
    como_jogar: [
      "Você é X e começa; toque numa casa vazia.",
      "Bot joga O.",
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
      "Estourou (>21) perde a mão. Dealer estourou ou seu total maior = você marca. Empate de total = push. Primeiro a 5 mãos vence a partida.",
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
      "Adversário com ≤0 fichas. Ranking: straight flush > quadra > full house > flush > straight > trinca > dois pares > par > carta alta.",
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
    objetivo: "Zerar a mão combinando cor ou número/ação (1v1 simplificado).",
    como_jogar: [
      "7 cartas cada; descarte inicial do monte.",
      "Jogue carta da mesma cor ou mesmo valor (0–9, +2, skip).",
      "Sem jogada: Comprar 1 carta e a vez passa.",
    ],
    pode: [
      "Jogar carta legal",
      "Comprar 1 e passar a vez",
      "Usar +2 (adversário compra 2) e skip (você joga de novo)",
    ],
    nao_pode: [
      "Coringa / +4 / inverter (não existem neste baralho)",
      "Jogar a carta comprada no mesmo turno",
      "Gritar UNO com multa (não há)",
    ],
    vitoria: "Mão vazia = vitória. Desistir = bot. Timeout força compra e passa a vez.",
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
  return `
    <p class="tg-rules-goal"><strong>Objetivo:</strong> ${rules.objetivo}</p>
    <h3 class="tg-rules-sub">Como jogar</h3>
    <ul class="tg-rules-list">${list(rules.como_jogar)}</ul>
    <h3 class="tg-rules-sub">Pode</h3>
    <ul class="tg-rules-list tg-rules-ok">${list(rules.pode)}</ul>
    <h3 class="tg-rules-sub">Não pode</h3>
    <ul class="tg-rules-list tg-rules-no">${list(rules.nao_pode)}</ul>
    <p class="tg-rules-end"><strong>Vitória / fim:</strong> ${rules.vitoria}</p>
  `;
}
