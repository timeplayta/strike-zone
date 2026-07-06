/**
 * Menu independente — funciona mesmo se game.js (Three.js) falhar ao carregar.
 * Use sempre http://localhost:8080 (iniciar.bat), não abra index.html direto no disco.
 */
(function () {
  const ENEMY_FIRE_MS = 540;

  function $(id) {
    return document.getElementById(id);
  }

  function isWelcomeVisible() {
    const welcome = $("welcomeScreen");
    return !!welcome && !welcome.classList.contains("hidden");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function showLoadError(msg) {
    if (isWelcomeVisible() && location.protocol !== "file:") return;
    let el = $("loadError");
    if (!el) {
      el = document.createElement("div");
      el.id = "loadError";
      el.className = "load-error";
      document.body.appendChild(el);
    }
    el.classList.remove("hidden");
    const viaFile = location.protocol === "file:";
    el.innerHTML =
      "<strong>Erro ao carregar o jogo</strong><p>" +
      msg +
      "</p>" +
      (viaFile
        ? "<p><strong>Voce abriu pelo Explorer.</strong> Feche e use <code>JOGAR.bat</code>.</p>"
        : "<p>Confirme que o servidor esta online e recarregue " +
          "<a href=\"" + location.origin + "\">" + location.origin + "</a></p>");
  }

  function updateLoadStatus() {
    const el = $("loadStatus");
    const btn = $("startBtn");
    if (!el) return;

    if (location.protocol === "file:") {
      el.textContent = "Abra com JOGAR.bat — nao funciona pelo Explorer";
      el.className = "load-status load-bad";
      if (btn) btn.disabled = true;
      return;
    }

    if (window.__strikeZoneReady) {
      el.textContent = "Pronto — clique em INICIAR PARTIDA";
      el.className = "load-status load-ok";
      if (btn) btn.disabled = false;
      return;
    }

    if (window.__strikeZoneLoadError) {
      el.textContent = "Falha ao carregar — recarregue a pagina (F5)";
      el.className = "load-status load-bad";
      return;
    }

    el.textContent = "Carregando motor do jogo...";
    el.className = "load-status";
    if (btn) btn.disabled = false;
  }

  function watchGameLoad() {
    updateLoadStatus();
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      updateLoadStatus();
      if (window.__strikeZoneReady || window.__strikeZoneLoadError || tries > 40) {
        clearInterval(timer);
        if (!window.__strikeZoneReady && !window.__strikeZoneLoadError && tries > 40) {
          showLoadError(
            "O jogo demorou demais para carregar. Recarregue com F5 e deixe a janela preta aberta."
          );
        }
        if (window.__strikeZoneLoadError) {
          showLoadError(window.__strikeZoneLoadError);
        }
      }
    }, 250);
  }

  function applyMenuDeviceLayout() {
    const device = document.querySelector(".device-btn.selected")?.dataset.device || "desktop";
    document.body.classList.toggle("mode-mobile", device === "mobile");
    document.body.classList.toggle("mode-desktop", device !== "mobile");
    updateMenuHint();
  }

  function resetMenuShell() {
    document.body.classList.remove("game-active", "show-cursor");
    applyMenuDeviceLayout();

    const welcome = $("welcomeScreen");
    const menu = $("menu");
    if (welcome) {
      welcome.classList.add("hidden");
      welcome.classList.remove("active");
    }
    if (menu) {
      menu.classList.add("active");
      menu.classList.remove("hidden");
    }
    $("hud")?.classList.add("hidden");
    $("endScreen")?.classList.remove("active");
    $("endScreen")?.classList.add("hidden");
    $("deathScreen")?.classList.remove("active");
    $("deathScreen")?.classList.add("hidden");
    $("mobileControls")?.classList.add("hidden");
    $("cinematic")?.classList.add("hidden");
    $("overlay")?.classList.add("hidden");
  }

  const MAP_LABELS = {
    dust: "Dust Alley",
    warehouse: "Cold Storage",
    horror: "Terror",
    labyrinth: "Fim das Trevas",
    frontier: "Ilha Frontier",
  };

  function updateSelectedMapLabel() {
    const map = document.querySelector(".map-btn.selected")?.dataset?.map || "dust";
    const el = $("ffSelectedMapName");
    if (el) el.textContent = MAP_LABELS[map] || map;
  }

  function selectMapBtn(btn) {
    if (!btn?.dataset?.map) return;
    document.querySelectorAll(".map-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    updateMapModeUI();
    updateSelectedMapLabel();
    if (typeof window.closeMapFullscreen === "function") window.closeMapFullscreen();
  }

  function updateMapModeUI() {
    const map = document.querySelector(".map-btn.selected")?.dataset?.map;
    const isLab = map === "labyrinth";
    const isFrontier = map === "frontier";
    document.querySelectorAll(".labyrinth-hide").forEach((el) => {
      el.classList.toggle("hidden", isLab);
    });
    const botSlider = $("botCount");
    if (botSlider && isFrontier) botSlider.value = "100";
    updateMenuHint();
  }

  function selectWeaponBtn(btn) {
    if (!btn?.dataset?.weapon) return;
    document.querySelectorAll(".weapon-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  }

  function updateMenuHint() {
    const device = document.querySelector(".device-btn.selected")?.dataset.device || "desktop";
    const map = document.querySelector(".map-btn.selected")?.dataset?.map;
    const horror = map === "horror";
    const frontier = map === "frontier";
    const hint = $("menuHint");
    if (!hint) return;
    if (device === "mobile") {
      hint.textContent = frontier
        ? "Battle Royale — Ilha 2km • lobby na floresta • depois queda de paraquedas"
        : horror
        ? "Joystick mover • ↑ pular • Arraste para mirar • ATIRAR • 🔦 = lanterna (mapa terror)"
        : "Joystick redondo (esquerda) = mover • Botão ↑ pular • Arraste a tela para mirar • ATIRAR = botão vermelho";
    } else {
      hint.textContent = frontier
        ? "Battle Royale — escolha Ilha Frontier • lobby na floresta da ilha • queda e loot nas vilas"
        : horror
        ? "WASD mover • Espaço pular • J = equipar lanterna (só mapa terror) • R recarregar • Clique porta/atirar • Botão direito mirar"
        : "WASD mover • Espaço pular • E = baú de munição (base CT) • R recarregar • Clique porta/atirar • Botão direito mirar";
    }
  }

  function updateBotDifficultyPreview() {
    const preview = $("difficultyPreview");
    const slider = $("botCount");
    if (!preview || !slider) return;

    const n = parseInt(slider.value, 10) || 10;
    import("./bot-difficulty.js").then(({ getBotDifficulty }) => {
      const diff = getBotDifficulty(n);
      preview.textContent = `Dificuldade: ${diff.tierLabel}`;
      preview.className = `difficulty-preview ${diff.tierClass}`;
    });
  }

  function applyDeviceFromURL() {
    const params = new URLSearchParams(location.search);
    const device = params.get("device");
    if (device !== "mobile" && device !== "desktop") return;
    const btn = document.querySelector(`.device-btn[data-device="${device}"]`);
    if (!btn) return;
    document.querySelectorAll(".device-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    applyMenuDeviceLayout();
  }

  function bindDelegatedClick(selector, onBtn) {
    document.querySelectorAll(selector).forEach((root) => {
      root.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || !root.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        onBtn(btn);
      });
      root.addEventListener(
        "touchend",
        (e) => {
          const btn = e.target.closest("button");
          if (!btn || !root.contains(btn)) return;
          e.preventDefault();
          onBtn(btn);
        },
        { passive: false }
      );
    });
  }

  async function tryStartGame() {
    if (location.protocol === "file:") {
      showLoadError("Pagina aberta pelo Explorer. Use JOGAR.bat na pasta do jogo.");
      return;
    }
    if (typeof window.startStrikeZone === "function") {
      $("loadError")?.classList.add("hidden");
      window.startStrikeZone();
      return;
    }
    const st = $("loadStatus");
    if (st) st.textContent = "Carregando... aguarde";
    try {
      await import("./game.js?v=95");
      if (typeof window.startStrikeZone === "function") {
        window.__strikeZoneReady = true;
        $("loadError")?.classList.add("hidden");
        window.startStrikeZone();
        return;
      }
    } catch (e) {
      window.__strikeZoneLoadError = e?.message || String(e);
    }
    showLoadError(
      window.__strikeZoneLoadError ||
        "Motor nao carregou. Feche janelas pretas antigas, abra JOGAR.bat e pressione Ctrl+F5."
    );
  }

  function showWelcomePanel(panelId) {
    ["welcomeLoginPanel", "welcomeRegisterPanel", "welcomeMigratePanel", "welcomePlayerIdPanel"].forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle("hidden", id !== panelId);
    });
  }

  function setWelcomeTab(mode) {
    const isLogin = mode === "login";
    $("welcomeTabLogin")?.classList.toggle("active", isLogin);
    $("welcomeTabRegister")?.classList.toggle("active", !isLogin);
    $("welcomeTabLogin")?.setAttribute("aria-selected", isLogin ? "true" : "false");
    $("welcomeTabRegister")?.setAttribute("aria-selected", !isLogin ? "true" : "false");
    showWelcomePanel(isLogin ? "welcomeLoginPanel" : "welcomeRegisterPanel");
  }

  async function enterMenuWithAccount(name, mod, account) {
    const playerName = $("playerName");
    if (playerName) playerName.value = name;
    window.__characterSkin = account?.characterSkin || "soldier";
    await mod.refreshShopUI(name);
    $("welcomeScreen")?.classList.add("hidden");
    $("welcomeScreen")?.classList.remove("active");
    $("menu")?.classList.remove("hidden");
    $("menu")?.classList.add("active");
    try {
      const acc = account || { isAdmin: mod.isSessionAdmin?.() };
      window.showAdminForAccount?.(acc);
    } catch { /* painel admin opcional */ }
    if (account?.birthdayMessage) {
      setTimeout(() => alert(account.birthdayMessage), 250);
    }
    try {
      const { preloadPlayerLoadout } = await import("./character-customizer.js");
      await preloadPlayerLoadout(name);
      const hub = await import("./account-hub.js");
      hub.mountAccountFab?.();
    } catch { /* optional */ }
  }

  function initWelcome() {
    const loginBtn = $("welcomeLoginBtn");
    const registerBtn = $("welcomeRegisterBtn");
    const migrateBtn = $("welcomeMigrateBtn");
    const playerName = $("playerName");
    const loginEmail = $("loginEmail");
    const loginPassword = $("loginPassword");

    function setLoginStatus(msg = "", type = "error") {
      const el = $("loginStatusMsg");
      if (!el) return;
      el.textContent = msg;
      el.className = `login-status-msg ${msg ? "" : "hidden"} ${type}`;
    }

    $("welcomeTabLogin")?.addEventListener("click", () => setWelcomeTab("login"));
    $("welcomeTabRegister")?.addEventListener("click", () => setWelcomeTab("register"));
    $("welcomeMigrateBack")?.addEventListener("click", () => setWelcomeTab("login"));
    setWelcomeTab("login");
    loginEmail?.addEventListener("input", () => setLoginStatus(""));
    loginPassword?.addEventListener("input", () => setLoginStatus(""));

    document.querySelectorAll("[data-oauth-provider]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const provider = btn.dataset.oauthProvider;
        if (!provider || btn.dataset.oauthReady !== "true") {
          setLoginStatus("Esse login ainda precisa das chaves oficiais no Render.", "error");
          return;
        }
        window.location.href = `/api/oauth/start/${provider}`;
      });
    });

    fetch("/api/oauth/providers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        document.querySelectorAll("[data-oauth-provider]").forEach((btn) => {
          const provider = btn.dataset.oauthProvider;
          const enabled = !!data.providers?.[provider];
          btn.dataset.oauthReady = enabled ? "true" : "false";
          btn.classList.toggle("social-login-btn-disabled", !enabled);
          btn.title = enabled ? "Entrar com conta social" : "Configure as credenciais OAuth no Render";
        });
      })
      .catch(() => { /* login com email continua normal */ });

    loginEmail?.addEventListener("blur", async () => {
      const email = loginEmail.value.trim();
      if (!email) return setLoginStatus("");
      if (!isValidEmail(email)) return setLoginStatus("Digite um email válido.", "error");
      try {
        const mod = await import("./player-account.js?v=77");
        const res = await mod.checkEmailExists(email);
        if (!res.ok) return;
        const msg = res.exists ? "Email encontrado. Agora digite sua senha." : "Email não existe.";
        setLoginStatus(msg, res.exists ? "ok" : "error");
      } catch { /* login ainda pode tentar normalmente */ }
    });

    loginBtn?.addEventListener("click", async () => {
      const email = loginEmail?.value?.trim();
      const password = loginPassword?.value || "";
      setLoginStatus("");
      if (!email || !isValidEmail(email)) {
        setLoginStatus("Digite um email válido.", "error");
        loginEmail?.focus();
        return;
      }
      if (!password) {
        setLoginStatus("Digite sua senha.", "error");
        loginPassword?.focus();
        return;
      }
      loginBtn.disabled = true;
      try {
        const mod = await import("./player-account.js?v=77");
        const res = await mod.loginAccount(email, password);
        if (res.ok) {
          await enterMenuWithAccount(res.account?.name || email, mod, res.account);
          return;
        }
        if (res.needPlayerId) {
          $("loginPlayerId").value = "";
          showWelcomePanel("welcomePlayerIdPanel");
          return;
        }
        if (res.needPasswordSetup) {
          $("migrateName").value = "";
          $("migrateAge").value = "";
          $("migrateEmail").value = email;
          $("migrateBirthDate").value = "";
          $("migratePassword").value = "";
          showWelcomePanel("welcomeMigratePanel");
          return;
        }
        setLoginStatus(res.msg || "Email ou senha errado.", "error");
      } catch {
        setLoginStatus("Servidor offline. Abra JOGAR.bat e tente de novo.", "error");
      } finally {
        loginBtn.disabled = false;
      }
    });

    $("welcomeLoginWithIdBtn")?.addEventListener("click", async () => {
      const email = $("loginEmail")?.value?.trim();
      const password = $("loginPassword")?.value || "";
      const playerId = $("loginPlayerId")?.value?.trim() || "";
      if (!email || !password || !playerId) {
        setLoginStatus("Preencha email, senha e ID SZ-XXXXXX.", "error");
        return;
      }
      const btn = $("welcomeLoginWithIdBtn");
      btn.disabled = true;
      try {
        const mod = await import("./player-account.js?v=77");
        const res = await mod.loginAccount(email, password, playerId);
        if (res.ok) await enterMenuWithAccount(res.account?.name || email, mod, res.account);
        else setLoginStatus(res.msg || "Login falhou.", "error");
      } catch {
        setLoginStatus("Servidor offline.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    $("welcomeLoginIdBack")?.addEventListener("click", () => showWelcomePanel("welcomeLoginPanel"));

    registerBtn?.addEventListener("click", async () => {
      const name = $("registerName")?.value?.trim();
      const email = $("registerEmail")?.value?.trim();
      const age = parseInt($("registerAge")?.value, 10);
      const birthDate = $("registerBirthDate")?.value || "";
      const password = $("registerPassword")?.value || "";
      const confirm = $("registerPasswordConfirm")?.value || "";
      if (!name) {
        alert("Escolha um nome para sua conta.");
        $("registerName")?.focus();
        return;
      }
      if (!age || age < 8 || age > 99) {
        alert("Digite uma idade válida (8 a 99).");
        $("registerAge")?.focus();
        return;
      }
      if (!email || !isValidEmail(email)) {
        alert("Digite um email válido.");
        $("registerEmail")?.focus();
        return;
      }
      if (!birthDate) {
        alert("Digite sua data de nascimento.");
        $("registerBirthDate")?.focus();
        return;
      }
      if (password.length < 4) {
        alert("A senha deve ter pelo menos 4 caracteres.");
        $("registerPassword")?.focus();
        return;
      }
      if (password !== confirm) {
        alert("As senhas não coincidem.");
        $("registerPasswordConfirm")?.focus();
        return;
      }
      registerBtn.disabled = true;
      try {
        const mod = await import("./player-account.js?v=77");
        const res = await mod.registerAccount(name, age, email, birthDate, password);
        if (res.ok) {
          const pid = res.account?.playerId || res.playerId;
          const okEl = $("welcomeRegisterSuccess");
          if (okEl && pid) {
            okEl.textContent = `Conta criada! Seu ID automático: ${pid} — anote ou tire print`;
            okEl.classList.remove("hidden");
          }
          alert(`Conta criada!\n\nSeu ID: ${pid}\n\nGuarde este ID — ele é gerado automaticamente.`);
          await enterMenuWithAccount(name, mod, res.account);
        } else alert(res.msg || "Não foi possível criar a conta.");
      } catch {
        alert("Servidor offline. Abra JOGAR.bat e tente de novo.");
      } finally {
        registerBtn.disabled = false;
      }
    });

    migrateBtn?.addEventListener("click", async () => {
      const name = $("migrateName")?.value?.trim();
      const age = parseInt($("migrateAge")?.value, 10);
      const email = $("migrateEmail")?.value?.trim();
      const birthDate = $("migrateBirthDate")?.value || "";
      const password = $("migratePassword")?.value || "";
      if (!name || !age || !email || !birthDate || password.length < 4) {
        alert("Preencha nome, idade, email, data de nascimento e senha (mín. 4 caracteres).");
        return;
      }
      migrateBtn.disabled = true;
      try {
        const mod = await import("./player-account.js?v=77");
        const res = await mod.migrateLegacyAccount(name, age, email, birthDate, password);
        if (res.ok) await enterMenuWithAccount(res.account?.name || name, mod, res.account);
        else alert(res.msg || "Não foi possível definir a senha.");
      } catch {
        alert("Servidor offline. Abra JOGAR.bat e tente de novo.");
      } finally {
        migrateBtn.disabled = false;
      }
    });

    // Enter nos campos de login
    $("loginPassword")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loginBtn?.click();
    });

    // Ao abrir: tentar sessão salva ou preencher último nome
    (async () => {
      try {
        const mod = await import("./player-account.js?v=77");
        const saved = mod.getSavedSession();
        if (saved?.account?.email) {
          $("loginEmail").value = saved.account.email;
        }
        if (saved?.name) {
          $("registerName").value = saved.name;
        }
        const account = await mod.tryRestoreSession();
        if (saved?.name && account) {
          await enterMenuWithAccount(saved.name, mod, account);
        }
      } catch { /* mostra tela de login */ }
    })();
  }

  function initShopModal() {
    import("./player-account.js?v=77").then((m) => {
      m.bindShopUI?.();
    });
  }

  function initMenu() {
    applyMenuDeviceLayout();
    initWelcome();
    initShopModal();
    import("./menu-hub.js").then((m) => m.showPlayHub?.()).catch(() => {});
    applyDeviceFromURL();
    applyMenuDeviceLayout();

    updateSelectedMapLabel();
    updateMapModeUI();

    document.addEventListener("click", (e) => {
      const optPanel = $("ffGameOptionsPanel");
      const topCorner = $("ffTopCorner");
      if (!optPanel || optPanel.classList.contains("hidden")) return;
      if (optPanel.contains(e.target) || topCorner?.contains(e.target)) return;
      optPanel.classList.add("hidden");
      optPanel.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll(".device-btn").forEach((btn) => {
      const pick = () => {
        document.querySelectorAll(".device-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        applyMenuDeviceLayout();
      };
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        pick();
      });
      btn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          pick();
        },
        { passive: false }
      );
    });

    const botSlider = $("botCount");
    const botLabel = $("botCountLabel");
    const syncBots = () => {
      if (botLabel && botSlider) botLabel.textContent = botSlider.value;
      updateBotDifficultyPreview();
    };
    botSlider?.addEventListener("input", syncBots);
    botSlider?.addEventListener("change", syncBots);
    $("useBotDifficulty")?.addEventListener("change", syncBots);
    syncBots();

    $("startBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      tryStartGame();
    });

    $("ffOptionsBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      const panel = $("ffGameOptionsPanel");
      if (!panel) return;
      const open = panel.classList.contains("hidden");
      panel.classList.toggle("hidden", !open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    });

    $("ffOptionsCloseBtn")?.addEventListener("click", () => {
      const panel = $("ffGameOptionsPanel");
      if (panel) {
        panel.classList.add("hidden");
        panel.setAttribute("aria-hidden", "true");
      }
    });

    $("restartBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      $("endScreen")?.classList.add("hidden");
      $("endScreen")?.classList.remove("active");
      tryStartGame();
    });

    $("menuBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      resetMenuShell();
    });

    watchGameLoad();

    import("./player-character.js")
      .then((m) => m.preloadPlayerCharacterModels?.())
      .catch(() => {});
  }

  window.addEventListener("error", (e) => {
    const file = e.filename || "";
    if (file.includes("game.js") || file.includes("three")) {
      showLoadError(
        (e.message || "Erro desconhecido") +
          ". Confirme que o servidor esta online com internet para o Three.js."
      );
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMenu);
  } else {
    initMenu();
  }

  window.resetStrikeZoneMenu = resetMenuShell;
  window.applyMenuDeviceLayout = applyMenuDeviceLayout;
  window.strikeZoneSelectMap = selectMapBtn;
  window.updateMapModeUI = updateMapModeUI;
  window.updateSelectedMapLabel = updateSelectedMapLabel;
})();
