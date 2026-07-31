/**
 * Histórico de jogadas — usado na revisão pós-partida
 */

export function createMoveLog(gameId, meta = {}) {
  let result = null;
  const moves = [];

  return {
    gameId,
    meta: { ...meta },
    setResult(r, reason = "") {
      result = { value: r, reason };
    },
    push(entry) {
      moves.push({
        ply: moves.length + 1,
        ...entry,
      });
    },
    get length() {
      return moves.length;
    },
    get playerPlyCount() {
      return moves.filter((m) => m.actor === "you").length;
    },
    getSnapshot() {
      return {
        gameId,
        meta: { ...meta },
        result,
        moves: moves.map((m) => ({ ...m })),
      };
    },
  };
}

export function logMove(moveLog, actor, label, extra = {}) {
  if (!moveLog) return;
  moveLog.push({ actor, label, ...extra });
}
