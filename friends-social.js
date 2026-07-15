/** Amigos + voz 18+ — opções do menu e modal de conta */

import {
  getLoggedInName,
  getCachedFriends,
  searchPlayers,
  addFriendByPlayerId,
  removeFriendByPlayerId,
  refreshFriendsList,
  isSessionAdult,
  isVoiceChatEnabled,
  setVoiceChatEnabled,
  getProfilePhotoUrl,
  uploadProfilePhoto,
  removeProfilePhoto,
  getSavedAvatar,
  getSavedSession,
} from "./player-account.js";

function $(id) {
  return document.getElementById(id);
}

let micStream = null;
let searchTimer = null;

function avatarEmoji(avatar) {
  if (avatar === "dog") return "🐕";
  if (avatar === "cat") return "🐈";
  if (avatar === "enemy") return "☠";
  if (avatar === "photo") return "📷";
  return "🎖";
}

function friendThumbHtml(friend) {
  if (friend?.profilePhoto) {
    return `<img class="friend-thumb" src="${friend.profilePhoto}" alt="" />`;
  }
  return `<span class="friend-thumb friend-thumb-emoji">${avatarEmoji(friend?.avatar)}</span>`;
}

function renderFriendsList(listEl, friends, { removable = true } = {}) {
  if (!listEl) return;
  if (!friends?.length) {
    listEl.innerHTML = `<p class="friends-empty">Nenhum amigo ainda. Busque pelo nome ou ID SZ-XXXXXX.</p>`;
    return;
  }
  listEl.innerHTML = friends
    .map((f) => {
      const voice = f.voiceChatEnabled ? `<span class="friend-voice-badge" title="Voz liberada">🎙</span>` : "";
      const removeBtn = removable
        ? `<button type="button" class="friend-remove-btn" data-remove-friend="${f.playerId}" title="Remover">✕</button>`
        : "";
      return `<div class="friend-row" data-player-id="${f.playerId}">
        ${friendThumbHtml(f)}
        <div class="friend-meta">
          <strong>${escapeHtml(f.name || "?")}</strong>
          <span class="friend-id">${escapeHtml(f.playerId || "")}</span>
        </div>
        ${voice}
        ${removeBtn}
      </div>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSearchResults(listEl, results) {
  if (!listEl) return;
  if (!results?.length) {
    listEl.innerHTML = `<p class="friends-empty">Ninguém encontrado com esse nome/ID.</p>`;
    return;
  }
  listEl.innerHTML = results
    .map(
      (f) => `<div class="friend-row friend-search-row" data-player-id="${f.playerId}">
        ${friendThumbHtml(f)}
        <div class="friend-meta">
          <strong>${escapeHtml(f.name || "?")}</strong>
          <span class="friend-id">${escapeHtml(f.playerId || "")}</span>
        </div>
        <button type="button" class="friend-add-btn" data-add-friend="${f.playerId}">Adicionar</button>
      </div>`
    )
    .join("");
}

async function syncFriendsUi() {
  const friends = getCachedFriends();
  renderFriendsList($("friendsList"), friends);
  renderFriendsList($("optionsFriendsList"), friends);
  renderFriendsList($("friendsModalList"), friends);
  const count = friends.length;
  if ($("friendsCountLabel")) $("friendsCountLabel").textContent = String(count);
  if ($("optionsFriendsCount")) $("optionsFriendsCount").textContent = String(count);
}

async function runSearch(query, target = "all") {
  const map = {
    account: {
      status: "friendsSearchStatus",
      results: "friendsSearchResults",
    },
    options: {
      status: "optionsFriendsSearchStatus",
      results: "optionsFriendsSearchResults",
    },
    modal: {
      status: "friendsModalSearchStatus",
      results: "friendsModalSearchResults",
    },
  };

  const targets =
    target === "all"
      ? Object.values(map)
      : [map[target]].filter(Boolean);

  if (!query.trim()) {
    targets.forEach((t) => {
      if ($(t.results)) $(t.results).innerHTML = "";
      if ($(t.status)) $(t.status).textContent = "";
    });
    return;
  }

  targets.forEach((t) => {
    if ($(t.status)) $(t.status).textContent = "Buscando…";
  });

  const { ok, results, msg } = await searchPlayers(query);
  targets.forEach((t) => {
    if (!ok) {
      if ($(t.status)) $(t.status).textContent = msg || "Erro na busca";
      return;
    }
    if ($(t.status)) $(t.status).textContent = results.length ? `${results.length} resultado(s)` : "Sem resultados";
    renderSearchResults($(t.results), results);
  });
}

function scheduleSearch(inputEl, target) {
  clearTimeout(searchTimer);
  const q = inputEl?.value || "";
  searchTimer = setTimeout(() => runSearch(q, target), 280);
}

async function onAddFriend(playerId) {
  const r = await addFriendByPlayerId(playerId);
  if (!r.ok) {
    alert(r.msg || "Não foi possível adicionar");
    return;
  }
  await syncFriendsUi();
  ["friendsSearchResults", "optionsFriendsSearchResults", "friendsModalSearchResults"].forEach((id) => {
    if ($(id)) $(id).innerHTML = "";
  });
}

async function onRemoveFriend(playerId) {
  if (!confirm("Remover este amigo?")) return;
  const r = await removeFriendByPlayerId(playerId);
  if (!r.ok) {
    alert(r.msg || "Não foi possível remover");
    return;
  }
  await syncFriendsUi();
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
}

async function enableMic() {
  try {
    stopMic();
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, msg: "Permissão de microfone negada ou indisponível" };
  }
}

function updateVoiceUi() {
  const adult = isSessionAdult();
  const enabled = isVoiceChatEnabled();
  const toggles = [$("voiceChatToggle"), $("optionsVoiceChatToggle"), $("inGameVoiceChatToggle")];
  const locks = [$("voiceChatLockNote"), $("optionsVoiceChatLock"), $("inGameVoiceChatLock")];
  const statuses = [$("voiceChatStatus"), $("optionsVoiceChatStatus"), $("inGameVoiceChatStatus")];

  toggles.forEach((el) => {
    if (!el) return;
    el.disabled = !adult;
    el.checked = enabled;
  });
  locks.forEach((el) => {
    if (!el) return;
    el.classList.toggle("hidden", adult);
  });
  const text = !adult
    ? "Bloqueado — só maiores de 18 anos"
    : enabled
      ? micStream
        ? "Voz ativa — microfone ligado"
        : "Voz liberada — ative o microfone ao falar com amigos"
      : "Desligado";
  statuses.forEach((el) => {
    if (el) el.textContent = text;
  });
}

async function onVoiceToggle(checked) {
  if (checked && !isSessionAdult()) {
    alert("Conversas por voz só para maiores de 18 anos. Confira a data de nascimento na conta.");
    updateVoiceUi();
    return;
  }
  if (checked) {
    const mic = await enableMic();
    if (!mic.ok) {
      alert(mic.msg);
      updateVoiceUi();
      return;
    }
  } else {
    stopMic();
  }
  const r = await setVoiceChatEnabled(!!checked);
  if (!r.ok) {
    stopMic();
    alert(r.msg || "Não foi possível salvar");
  }
  updateVoiceUi();
}

function updatePhotoPreview() {
  const url = getProfilePhotoUrl();
  const img = $("accountPhotoPreview");
  const empty = $("accountPhotoEmpty");
  const photoPick = document.querySelector('.avatar-pick[data-avatar="photo"]');
  if (img) {
    if (url) {
      img.src = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      img.classList.remove("hidden");
    } else {
      img.removeAttribute("src");
      img.classList.add("hidden");
    }
  }
  if (empty) empty.classList.toggle("hidden", !!url);
  if (photoPick) {
    photoPick.disabled = !url;
    photoPick.classList.toggle("disabled", !url);
    photoPick.title = url ? "Usar minha foto" : "Envie uma foto primeiro";
  }
  const avatar = getSavedAvatar() || getSavedSession()?.account?.avatar || "soldier";
  document.querySelectorAll(".avatar-pick").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.avatar === avatar);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

async function compressImageDataUrl(dataUrl, maxSide = 512, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function handlePhotoFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Escolha uma imagem (JPG, PNG ou WebP).");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    alert("Arquivo grande demais. Tente outra foto.");
    return;
  }
  const status = $("accountPhotoStatus");
  if (status) status.textContent = "Enviando foto…";
  try {
    const raw = await fileToDataUrl(file);
    const compressed = await compressImageDataUrl(raw);
    const r = await uploadProfilePhoto(compressed);
    if (!r.ok) {
      if (status) status.textContent = "";
      alert(r.msg || "Erro ao enviar");
      return;
    }
    updatePhotoPreview();
    if (status) status.textContent = "Foto salva no perfil!";
    setTimeout(() => {
      if (status) status.textContent = "";
    }, 2200);
  } catch {
    if (status) status.textContent = "";
    alert("Não deu pra processar essa imagem.");
  }
}

export function refreshSocialPanels() {
  syncFriendsUi();
  updateVoiceUi();
  updatePhotoPreview();
}

export async function openFriendsFromOptions() {
  const name = getLoggedInName();
  if (!name) {
    alert("Faça login para usar amigos.");
    return;
  }
  await refreshFriendsList();
  refreshSocialPanels();
  $("friendsModal")?.classList.remove("hidden");
  $("friendsModal")?.setAttribute("aria-hidden", "false");
}

function closeFriendsModal() {
  $("friendsModal")?.classList.add("hidden");
  $("friendsModal")?.setAttribute("aria-hidden", "true");
}

function bindListClicks(root) {
  root?.addEventListener("click", (e) => {
    const add = e.target.closest?.("[data-add-friend]");
    if (add) {
      e.preventDefault();
      onAddFriend(add.getAttribute("data-add-friend"));
      return;
    }
    const rem = e.target.closest?.("[data-remove-friend]");
    if (rem) {
      e.preventDefault();
      onRemoveFriend(rem.getAttribute("data-remove-friend"));
    }
  });
}

export function initFriendsSocial() {
  const searchBindings = [
    { input: "friendsSearchInput", btn: "friendsSearchBtn", target: "account" },
    { input: "optionsFriendsSearchInput", btn: "optionsFriendsSearchBtn", target: "options" },
    { input: "friendsModalSearchInput", btn: "friendsModalSearchBtn", target: "modal" },
  ];

  searchBindings.forEach(({ input, btn, target }) => {
    $(input)?.addEventListener("input", (e) => scheduleSearch(e.target, target));
    $(btn)?.addEventListener("click", () => runSearch($(input)?.value || "", target));
  });

  $("openFriendsBtn")?.addEventListener("click", openFriendsFromOptions);
  $("closeFriendsBtn")?.addEventListener("click", closeFriendsModal);
  $("friendsModalBackdrop")?.addEventListener("click", closeFriendsModal);

  [
    "friendsList",
    "friendsSearchResults",
    "optionsFriendsList",
    "optionsFriendsSearchResults",
    "friendsModalList",
    "friendsModalSearchResults",
  ].forEach((id) => bindListClicks($(id)));

  ["voiceChatToggle", "optionsVoiceChatToggle", "inGameVoiceChatToggle"].forEach((id) => {
    $(id)?.addEventListener("change", (e) => onVoiceToggle(!!e.target.checked));
  });

  $("accountPhotoInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  });

  $("accountPhotoCameraInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
    e.target.value = "";
  });

  $("accountPhotoRemoveBtn")?.addEventListener("click", async () => {
    if (!getProfilePhotoUrl()) return;
    if (!confirm("Remover sua foto de perfil?")) return;
    const r = await removeProfilePhoto();
    if (!r.ok) {
      alert(r.msg || "Erro ao remover");
      return;
    }
    updatePhotoPreview();
  });

  window.addEventListener("beforeunload", stopMic);
  window.addEventListener("strikezone-account-refresh", refreshSocialPanels);
  refreshSocialPanels();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFriendsSocial);
} else {
  initFriendsSocial();
}
