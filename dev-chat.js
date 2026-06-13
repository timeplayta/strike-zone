/** Chat desenvolvedor — comandos com / e linguagem natural */

import { isSessionAdmin } from "./player-account.js";
import { filterCommands, groupFilteredCommands, matchNaturalLanguage } from "./dev-commands.js";

const $ = (id) => document.getElementById(id);

let chatOpen = false;
let suggestIndex = 0;
let currentSuggestions = [];

function isGameActive() {
  return document.body.classList.contains("game-active");
}

function isDevChatAllowed() {
  return isSessionAdmin() && isGameActive();
}

function isOtherInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.id === "devChatInput") return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

function addLog(text, kind = "system") {
  const log = $("devChatLog");
  if (!log) return;
  const line = document.createElement("div");
  line.className = "dev-chat-line dev-chat-line--" + kind;
  line.textContent = text;
  log.appendChild(line);
  while (log.children.length > 40) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}

function showDevChat() {
  const root = $("devChat");
  if (!root) return;
  root.classList.remove("hidden");
}

function hideDevChat() {
  const root = $("devChat");
  if (!root) return;
  root.classList.add("hidden");
  closeChatInput();
}

function openChatInput() {
  if (!isDevChatAllowed()) return;
  const panel = $("devChatPanel");
  const input = $("devChatInput");
  if (!panel || !input) return;
  chatOpen = true;
  window.__devChatOpen = true;
  panel.classList.remove("hidden");
  showDevChat();
  input.focus();
  if (!input.value) showSuggestions(filterCommands("/"));
}

function closeChatInput() {
  chatOpen = false;
  window.__devChatOpen = false;
  const panel = $("devChatPanel");
  const input = $("devChatInput");
  if (panel) panel.classList.add("hidden");
  if (input) input.value = "";
  hideSuggestions();
  document.exitPointerLock?.();
}

function hideSuggestions() {
  const box = $("devChatSuggest");
  if (box) {
    box.classList.add("hidden");
    box.replaceChildren();
  }
  currentSuggestions = [];
  suggestIndex = 0;
}

function showSuggestions(list) {
  const box = $("devChatSuggest");
  if (!box) return;
  currentSuggestions = list;
  suggestIndex = 0;
  box.replaceChildren();

  if (!list.length) {
    box.classList.add("hidden");
    return;
  }

  const groups = groupFilteredCommands(list);
  for (const [cat, items] of groups) {
    const title = document.createElement("div");
    title.className = "dev-chat-suggest-cat";
    title.textContent = cat;
    box.appendChild(title);
    for (const item of items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "dev-chat-suggest-item";
      row.dataset.cmd = item.cmd;
      row.innerHTML = `<span class="dev-chat-cmd">${item.cmd}</span><span class="dev-chat-desc">${item.desc}</span>`;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pickSuggestion(item.cmd);
      });
      box.appendChild(row);
    }
  }
  highlightSuggestion();
  box.classList.remove("hidden");
}

function highlightSuggestion() {
  const box = $("devChatSuggest");
  if (!box) return;
  const rows = box.querySelectorAll(".dev-chat-suggest-item");
  rows.forEach((r, i) => r.classList.toggle("selected", i === suggestIndex));
  const sel = rows[suggestIndex];
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function pickSuggestion(cmd) {
  const input = $("devChatInput");
  if (!input) return;
  input.value = cmd;
  hideSuggestions();
  input.focus();
}

function executeLine(raw) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return;

  addLog("> " + trimmed, "user");

  let cmd = trimmed;
  if (!trimmed.startsWith("/")) {
    const nl = matchNaturalLanguage(trimmed);
    if (nl) {
      addLog("→ " + nl, "hint");
      cmd = nl;
    } else {
      addLog("Não entendi. Digite / para ver comandos ou use frases como «aumentar luz», «adicionar inimigo».", "error");
      return;
    }
  }

  const fn = window.runAdminCommand;
  if (typeof fn !== "function") {
    addLog("Partida não iniciada.", "error");
    return;
  }
  const out = fn(cmd);
  if (out) addLog(out, "ok");
}

function onInputChange() {
  const input = $("devChatInput");
  if (!input) return;
  const v = input.value;
  if (v.startsWith("/")) {
    showSuggestions(filterCommands(v));
  } else if (v.length > 2 && !v.startsWith("/")) {
    const nl = matchNaturalLanguage(v);
    if (nl) {
      showSuggestions([{ cmd: nl, desc: "Interpretar como comando", category: "Sugestão" }]);
    } else {
      hideSuggestions();
    }
  } else {
    hideSuggestions();
  }
}

function onInputKeydown(e) {
  const box = $("devChatSuggest");
  const visible = box && !box.classList.contains("hidden");
  const rows = visible ? box.querySelectorAll(".dev-chat-suggest-item") : [];

  if (e.key === "ArrowDown" && rows.length) {
    e.preventDefault();
    suggestIndex = (suggestIndex + 1) % rows.length;
    highlightSuggestion();
    return;
  }
  if (e.key === "ArrowUp" && rows.length) {
    e.preventDefault();
    suggestIndex = (suggestIndex - 1 + rows.length) % rows.length;
    highlightSuggestion();
    return;
  }
  if (e.key === "Tab" && rows.length) {
    e.preventDefault();
    const cmd = rows[suggestIndex]?.dataset.cmd;
    if (cmd) pickSuggestion(cmd);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (rows.length && visible) {
      const cmd = rows[suggestIndex]?.dataset.cmd;
      if (cmd) pickSuggestion(cmd);
    }
    executeLine($("devChatInput")?.value || "");
    $("devChatInput").value = "";
    hideSuggestions();
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    closeChatInput();
  }
}

function onGlobalKeydown(e) {
  if (!isDevChatAllowed()) return;

  if (chatOpen) return;

  if (e.code === "Enter" && !isOtherInputFocused()) {
    e.preventDefault();
    openChatInput();
    return;
  }

  if (e.key === "/" && !isOtherInputFocused()) {
    e.preventDefault();
    openChatInput();
    const input = $("devChatInput");
    if (input) {
      input.value = "/";
      onInputChange();
    }
  }
}

export function initDevChat() {
  const toggleBtn = $("devChatToggle");
  const slashBtn = $("devChatSlash");
  const input = $("devChatInput");
  const panel = $("devChatPanel");

  if (!panel || !input) return;

  toggleBtn?.addEventListener("click", () => {
    if (chatOpen) closeChatInput();
    else openChatInput();
  });

  slashBtn?.addEventListener("click", () => {
    openChatInput();
    input.value = "/";
    onInputChange();
  });

  input.addEventListener("input", onInputChange);
  input.addEventListener("keydown", onInputKeydown);

  document.addEventListener("keydown", onGlobalKeydown);

  const observer = new MutationObserver(() => {
    if (isDevChatAllowed()) showDevChat();
    else hideDevChat();
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  window.devChatLog = (text, kind = "system") => addLog(text, kind);

  if (isDevChatAllowed()) showDevChat();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDevChat);
} else {
  initDevChat();
}
