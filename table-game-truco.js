/**
 * Truco Paulista 1v1 — regras: baralho 40, manilha pela vira, vale 1/3/6/9/12 até 12 pontos
 */

import {
  playCardPlay,
  playIllegal,
  playWin,
  playLose,
  playTrucoCall,
  playBotThink,
  announceDealing,
  speakLine,
} from "./table-games-audio.js";
import { getBotTier, pickMoveWithWisdom } from "./table-games-bots.js";
import {
  createSalonShell,
  makeCardEl,
  spanishDeck40,
} from "./table-game-salon.js";

const RANK_ORDER = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];

function nextRank(rank) {
  const i = RANK_ORDER.indexOf(rank);
  return RANK_ORDER[(i + 1) % RANK_ORDER.length];
}

function manilhaRank(vira) {
  return nextRank(vira.rank);
}

function cardStrength(card, manilha) {
  if (card.rank === manilha) {
    const suitPow = { "♣": 4, "♥": 3, "♠": 2, "♦": 1 };
    return 100 + (suitPow[card.suit] || 0);
  }
  return RANK_ORDER.indexOf(card.rank);
}

function winnerOfTrick(c1, c2, manilha, starterIsPlayer) {
  const s1 = cardStrength(c1, manilha);
  const s2 = cardStrength(c2, manilha);
  if (s1 === s2) return 0; // empate
  if (s1 > s2) return starterIsPlayer ? 1 : -1;
  return starterIsPlayer ? -1 : 1;
}

export function mountTrucoGame(root, { botTier, onExit, onEnd, onBind, match }) {
  const tier = getBotTier(botTier);
  let scoreYou = 0;
  let scoreBot = 0;
  let handYou = [];
  let handBot = [];
  let vira = null;
  let manilha = null;
  let stake = 1;
  let roundWins = [0, 0]; // you, bot in current mão
  let tricks = [];
  let turn = "you";
  let starter = "you";
  let over = false;
  let waiting = false;
  let playedYou = null;
  let playedBot = null;
  let handNo = 0;

  const wrap = createSalonShell({
    title: "Truco",
    subtitle: "Paulista · primeiro a 12",
    botName: `Bot ${tier.label}`,
    accent: "coral",
  });
  root.appendChild(wrap);

  const statusEl = wrap.querySelector("[data-status]");
  const centerEl = wrap.querySelector("[data-center]");
  const handEl = wrap.querySelector("[data-hand]");
  const actionsEl = wrap.querySelector("[data-actions]");
  const scoreYouEl = wrap.querySelector("[data-score-you]");
  const scoreBotEl = wrap.querySelector("[data-score-bot]");
  const scoreMid = wrap.querySelector("[data-score-mid]");
  const scoreLabel = wrap.querySelector("[data-score-label]");

  function setStatus(t) {
    statusEl.textContent = t;
  }

  function paintScore() {
    scoreYouEl.textContent = String(scoreYou);
    scoreBotEl.textContent = String(scoreBot);
    scoreMid.textContent = `VALENDO ${stake}`;
    scoreLabel.textContent = `Mão ${handNo} · Rodadas ${"●".repeat(roundWins[0])}${"○".repeat(Math.max(0, 2 - roundWins[0]))}  vs  ${"●".repeat(roundWins[1])}${"○".repeat(Math.max(0, 2 - roundWins[1]))}`;
  }

  function endMatch(winner) {
    over = true;
    match?.endPlayerClock?.();
    match?.setActionsEnabled?.(false);
    if (winner === "you") {
      setStatus("Você fechou 12! Vitória!");
      playWin();
      speakLine("Você venceu o truco!");
    } else {
      setStatus("Bot fechou 12. Derrota.");
      playLose();
      speakLine("O bot venceu.");
    }
    onEnd?.(winner);
  }

  function renderHand() {
    handEl.innerHTML = "";
    handYou.forEach((c, i) => {
      const el = makeCardEl(c, { playable: !over && !waiting && turn === "you" });
      el.addEventListener("click", () => playYourCard(i));
      handEl.appendChild(el);
    });
  }

  function renderCenter() {
    centerEl.innerHTML = "";
    if (vira) {
      const v = makeCardEl(vira, { small: true });
      v.classList.add("vira");
      v.title = "Vira";
      centerEl.appendChild(v);
      const tag = document.createElement("div");
      tag.className = "tg-vira-tag";
      tag.textContent = `Manilha: ${manilha}`;
      centerEl.appendChild(tag);
    }
    if (playedBot) centerEl.appendChild(makeCardEl(playedBot, { small: true }));
    if (playedYou) centerEl.appendChild(makeCardEl(playedYou, { small: true }));
  }

  function renderActions() {
    actionsEl.innerHTML = "";
    if (over || waiting || turn !== "you") return;
    if (stake < 12) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tg-btn tg-btn-truco";
      btn.textContent = stake === 1 ? "TRUCO" : stake === 3 ? "SEIS" : stake === 6 ? "NOVE" : "DOZE";
      btn.addEventListener("click", callTruco);
      actionsEl.appendChild(btn);
    }
  }

  function dealHand() {
    handNo += 1;
    stake = 1;
    roundWins = [0, 0];
    tricks = [];
    playedYou = null;
    playedBot = null;
    const deck = spanishDeck40();
    handYou = deck.splice(0, 3);
    handBot = deck.splice(0, 3);
    vira = deck.shift();
    manilha = manilhaRank(vira);
    starter = handNo % 2 === 1 ? "you" : "bot";
    turn = starter;
    waiting = false;
    paintScore();
    renderCenter();
    renderHand();
    renderActions();
    announceDealing();
    setStatus(turn === "you" ? "Sua vez — jogue uma carta" : "Bot começa…");
    if (turn === "you") match?.startPlayerClock?.(true);
    else setTimeout(botTurn, 700);
  }

  function callTruco() {
    if (over || waiting || turn !== "you" || stake >= 12) return;
    playTrucoCall();
    const next = stake === 1 ? 3 : stake === 3 ? 6 : stake === 6 ? 9 : 12;
    setStatus(`Você pediu ${next}! Bot pensando…`);
    waiting = true;
    renderActions();
    match?.endPlayerClock?.();
    setTimeout(() => {
      // bot aceita com base na força da mão e dificuldade
      const power = handBot.reduce((s, c) => s + cardStrength(c, manilha), 0);
      const acceptChance = tier.pocketBias * 0.55 + Math.min(0.4, power / 200);
      if (Math.random() < acceptChance || stake >= 9) {
        stake = next;
        paintScore();
        setStatus(`Bot aceitou! Vale ${stake}.`);
        speakLine(stake >= 6 ? "Aceito!" : "Caiu.");
        waiting = false;
        renderActions();
        if (turn === "you") match?.startPlayerClock?.(false);
      } else {
        // correu — você ganha o stake atual
        scoreYou += stake;
        paintScore();
        setStatus(`Bot correu! +${stake} pra você.`);
        speakLine("Correu!");
        if (scoreYou >= 12) endMatch("you");
        else setTimeout(dealHand, 900);
      }
    }, 600 + (1 - tier.pocketBias) * 500);
  }

  function finishTrick() {
    const firstWasYou = starter === "you" ? tricks.length % 2 === 0 : tricks.length % 2 === 1;
    // starter of this trick
    const trickStarterYou = !playedBot
      ? true
      : tricks.length === 0
      ? starter === "you"
      : turn === "bot"; // messy — track properly
    void trickStarterYou;
    void firstWasYou;

    const youFirst = !!playedYou && (tricks.length === 0 ? starter === "you" : lastTrickWinner === "you");
    // Use stored order: if turn was bot after you played, you played first
    const playerFirst = playedOrder === "you-first";
    const res = winnerOfTrick(playedYou, playedBot, manilha, playerFirst);
    let winner = "tie";
    if (res > 0) winner = "you";
    else if (res < 0) winner = "bot";

    tricks.push({ you: playedYou, bot: playedBot, winner });
    if (winner === "you") roundWins[0]++;
    else if (winner === "bot") roundWins[1]++;
    else {
      // empate conta para quem já está ganhando a mão, senão segue
    }

    paintScore();
    setStatus(
      winner === "tie" ? "Empate na rodada!" : winner === "you" ? "Você levou a rodada!" : "Bot levou a rodada!"
    );

    const mãoDone =
      roundWins[0] >= 2 ||
      roundWins[1] >= 2 ||
      (tricks.length >= 3 && roundWins[0] !== roundWins[1]) ||
      tricks.length >= 3;

    playedYou = null;
    playedBot = null;
    lastTrickWinner = winner === "tie" ? lastTrickWinner : winner;

    setTimeout(() => {
      renderCenter();
      if (mãoDone) {
        let handWinner = roundWins[0] > roundWins[1] ? "you" : roundWins[1] > roundWins[0] ? "bot" : lastTrickWinner;
        if (handWinner === "tie" || !handWinner) handWinner = starter;
        if (handWinner === "you") {
          scoreYou += stake;
          setStatus(`Você levou a mão! +${stake}`);
        } else {
          scoreBot += stake;
          setStatus(`Bot levou a mão! +${stake}`);
        }
        paintScore();
        if (scoreYou >= 12) endMatch("you");
        else if (scoreBot >= 12) endMatch("bot");
        else setTimeout(dealHand, 1000);
        return;
      }
      turn = lastTrickWinner === "bot" ? "bot" : lastTrickWinner === "you" ? "you" : starter;
      if (lastTrickWinner === "tie") turn = starter;
      waiting = false;
      renderHand();
      renderActions();
      if (turn === "you") {
        setStatus("Sua vez");
        match?.startPlayerClock?.(false);
      } else {
        setStatus("Vez do bot…");
        setTimeout(botTurn, 500);
      }
    }, 700);
  }

  let lastTrickWinner = "you";
  let playedOrder = "you-first";

  function playYourCard(idx) {
    if (over || waiting || turn !== "you") return;
    const card = handYou[idx];
    if (!card) return;
    match?.endPlayerClock?.();
    handYou.splice(idx, 1);
    playedYou = card;
    playCardPlay();
    waiting = true;
    renderHand();
    renderActions();
    renderCenter();

    if (playedBot) {
      playedOrder = "bot-first";
      finishTrick();
      return;
    }
    playedOrder = "you-first";
    setStatus("Bot respondendo…");
    setTimeout(botTurn, 450 + Math.random() * 300);
  }

  function botTurn() {
    if (over) return;
    playBotThink();
    // maybe call truco
    if (!playedYou && stake < 12 && Math.random() < tier.pocketBias * 0.18) {
      playTrucoCall();
      const next = stake === 1 ? 3 : stake === 3 ? 6 : stake === 6 ? 9 : 12;
      setStatus(`Bot pediu ${next}!`);
      // auto-accept mid for flow (player can mentally accept) — show buttons
      waiting = true;
      actionsEl.innerHTML = "";
      const ok = document.createElement("button");
      ok.className = "tg-btn tg-btn-primary";
      ok.textContent = "Aceitar";
      const no = document.createElement("button");
      no.className = "tg-btn tg-btn-ghost";
      no.textContent = "Correr";
      ok.onclick = () => {
        stake = next;
        paintScore();
        waiting = false;
        setStatus(`Aceito! Vale ${stake}. Bot joga…`);
        speakLine("Aceito!");
        setTimeout(botPlayCard, 400);
      };
      no.onclick = () => {
        scoreBot += stake;
        paintScore();
        setStatus(`Você correu. +${stake} pro bot.`);
        speakLine("Correu!");
        if (scoreBot >= 12) endMatch("bot");
        else setTimeout(dealHand, 800);
      };
      actionsEl.append(ok, no);
      return;
    }
    botPlayCard();
  }

  function botPlayCard() {
    if (!handBot.length) return;
    const scored = handBot.map((c, i) => {
      let score = cardStrength(c, manilha);
      if (playedYou) {
        const beat = cardStrength(c, manilha) > cardStrength(playedYou, manilha);
        score += beat ? 50 : -20;
      }
      // blunder
      return { i, card: c, score: score + (Math.random() - 0.5) * (1 - tier.pocketBias) * 40 };
    });
    const pick = pickMoveWithWisdom(scored, tier.id) || scored[0];
    const card = handBot.splice(pick.i, 1)[0];
    playedBot = card;
    playCardPlay();
    renderCenter();

    if (playedYou) {
      finishTrick();
    } else {
      turn = "you";
      waiting = false;
      setStatus("Sua vez — responda");
      renderHand();
      renderActions();
      match?.startPlayerClock?.(false);
    }
  }

  wrap.querySelector("[data-exit]").addEventListener("click", () => onExit?.());
  wrap.querySelector("[data-restart]").addEventListener("click", () => {
    scoreYou = 0;
    scoreBot = 0;
    over = false;
    match?.setActionsEnabled?.(true);
    dealHand();
  });

  onBind?.({
    resign() {
      endMatch("bot");
    },
    offerDraw() {
      match?.markDrawResolved?.(false);
      match?.pushChat?.("Bot", "No truco não rola empate — joga até 12!", "bot");
    },
    timeout() {
      endMatch("bot");
    },
  });

  dealHand();
  return () => wrap.remove();
}
