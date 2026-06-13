/** Comandos do chat desenvolvedor — autocomplete e linguagem natural */

export const DEV_COMMAND_CATEGORIES = [
  {
    id: "mapa",
    label: "Mapa & luz",
    commands: [
      { cmd: "/luz +", desc: "Aumentar iluminação do mapa" },
      { cmd: "/luz -", desc: "Diminuir iluminação" },
      { cmd: "/luz 1", desc: "Definir nível de luz (0–2)" },
      { cmd: "/claro", desc: "Iluminar mapa completo (toggle)" },
      { cmd: "/escuro", desc: "Voltar iluminação normal do mapa" },
      { cmd: "/fog +", desc: "Aumentar distância do nevoeiro" },
      { cmd: "/fog -", desc: "Diminuir nevoeiro (mais escuro)" },
      { cmd: "/nv", desc: "Visão noturna admin (toggle)" },
      { cmd: "/mapa", desc: "Info do mapa atual" },
      { cmd: "/tp x z", desc: "Teleportar para coordenadas" },
      { cmd: "/tpme", desc: "Teleportar ao spawn CT" },
      { cmd: "/block dx dz", desc: "Mover parede próxima" },
    ],
  },
  {
    id: "npc",
    label: "NPCs",
    commands: [
      { cmd: "/add t", desc: "Adicionar 1 terrorista (inimigo)" },
      { cmd: "/add t 3", desc: "Adicionar vários terroristas" },
      { cmd: "/add ct", desc: "Adicionar 1 CT aliado" },
      { cmd: "/add ct 2", desc: "Adicionar vários CTs aliados" },
      { cmd: "/add inimigo", desc: "Alias — spawn inimigo" },
      { cmd: "/add amigo", desc: "Alias — spawn aliado CT" },
      { cmd: "/bots 4", desc: "Respawnar N bots no mapa" },
      { cmd: "/clear", desc: "Remover todos inimigos (chefão mantido)" },
      { cmd: "/killall", desc: "Matar todos inimigos" },
      { cmd: "/boss", desc: "Spawnar chefão (mapa terror)" },
    ],
  },
  {
    id: "player",
    label: "Jogador",
    commands: [
      { cmd: "/heal", desc: "Restaurar vida (100)" },
      { cmd: "/god", desc: "Modo Deus — sem dano (toggle)" },
      { cmd: "/vel +", desc: "Aumentar velocidade" },
      { cmd: "/vel -", desc: "Diminuir velocidade" },
      { cmd: "/weapon ak47", desc: "Trocar arma (ak47, scar, awm…)" },
      { cmd: "/moedas 100", desc: "Adicionar moedas à sessão" },
      { cmd: "/noclip", desc: "Voar sem colisão (toggle)" },
    ],
  },
  {
    id: "partida",
    label: "Partida",
    commands: [
      { cmd: "/win ct", desc: "Vitória CT" },
      { cmd: "/win t", desc: "Vitória terroristas" },
      { cmd: "/round", desc: "Reiniciar round" },
    ],
  },
  {
    id: "geral",
    label: "Geral",
    commands: [
      { cmd: "/help", desc: "Lista resumida de comandos" },
    ],
  },
];

export const ALL_DEV_COMMANDS = DEV_COMMAND_CATEGORIES.flatMap((c) =>
  c.commands.map((x) => ({ ...x, category: c.label }))
);

/** Frases em português → comando */
const NL_PATTERNS = [
  { re: /^(aumenta|aumentar|mais)\s*(a\s*)?luz/i, cmd: "/luz +" },
  { re: /^(diminui|diminuir|menos|abaixa|abaixar)\s*(a\s*)?luz/i, cmd: "/luz -" },
  { re: /^(ilumina|iluminar|clarear)\s*(o\s*)?(mapa|ambiente)?/i, cmd: "/claro" },
  { re: /^(escurece|escurecer|mapa\s*escuro)/i, cmd: "/escuro" },
  { re: /^(visão\s*noturna|nv|night\s*vision)/i, cmd: "/nv" },
  { re: /^(add|adiciona|adicionar|spawn|cria|criar)\s*(um\s*)?(inimigo|terrorista|t|bandido)/i, cmd: "/add t" },
  { re: /^(add|adiciona|adicionar|spawn|cria|criar)\s*(um\s*)?(aliado|amigo|ct|ajudante|helper)/i, cmd: "/add ct" },
  { re: /^(remove|limpa|limpar)\s*(os\s*)?(inimigos|bots)/i, cmd: "/clear" },
  { re: /^(mata|matar)\s*(todos|all)/i, cmd: "/killall" },
  { re: /^(chefão|boss|guardião)/i, cmd: "/boss" },
  { re: /^(cura|curar|heal|vida)/i, cmd: "/heal" },
  { re: /^(god|deus|invencível)/i, cmd: "/god" },
  { re: /^(noclip|voar|fly)/i, cmd: "/noclip" },
  { re: /^(tp|teleporta|teleportar)\s*(spawn|inicio|início)/i, cmd: "/tpme" },
  { re: /^(info|mapa|mapinfo)/i, cmd: "/mapa" },
  { re: /^(help|ajuda|comandos|\?)$/i, cmd: "/help" },
];

export function matchNaturalLanguage(text) {
  const t = (text || "").trim();
  if (!t) return null;
  for (const { re, cmd } of NL_PATTERNS) {
    if (re.test(t)) return cmd;
  }
  return null;
}

export function filterCommands(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q || q === "/") return ALL_DEV_COMMANDS;
  const needle = q.startsWith("/") ? q : "/" + q;
  return ALL_DEV_COMMANDS.filter(
    (c) => c.cmd.toLowerCase().startsWith(needle) || c.desc.toLowerCase().includes(q.replace(/^\//, ""))
  );
}

export function groupFilteredCommands(list) {
  const groups = new Map();
  for (const item of list) {
    const cat = item.category || "Outros";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(item);
  }
  return groups;
}
