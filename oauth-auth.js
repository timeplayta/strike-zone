const crypto = require("crypto");
const https = require("https");
const { loginWithOAuthProvider } = require("./account-db.js");

const states = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_KEY = "strikezone_session_v3";

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 32) {
  return b64url(crypto.randomBytes(bytes));
}

function pkceChallenge(verifier) {
  return b64url(crypto.createHash("sha256").update(verifier).digest());
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(data));
}

function html(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(body);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function originFromReq(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:8080";
  return `${proto}://${host}`;
}

function publicBaseUrl(req) {
  return (process.env.PUBLIC_BASE_URL || process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || originFromReq(req)).replace(/\/+$/, "");
}

function providerConfig(provider) {
  const google = {
    id: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
  };
  const vk = {
    id: process.env.VK_CLIENT_ID,
    secret: process.env.VK_CLIENT_SECRET,
  };
  const x = {
    id: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID,
    secret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET,
  };
  return { google, vk, twitter: x, x }[provider] || null;
}

function httpsRequest(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data = text;
          try { data = JSON.parse(text); } catch { /* text response */ }
          resolve({ status: res.statusCode, data, text });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function postForm(url, form, headers = {}) {
  const body = new URLSearchParams(form).toString();
  return httpsRequest("POST", url, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
      ...headers,
    },
    body,
  });
}

async function getJson(url, token) {
  return httpsRequest("GET", url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function saveState(provider, req) {
  const state = randomToken(24);
  const verifier = randomToken(48);
  const redirectUri = `${publicBaseUrl(req)}/api/oauth/callback/${provider}`;
  states.set(state, {
    provider,
    verifier,
    redirectUri,
    createdAt: Date.now(),
  });
  return { state, verifier, challenge: pkceChallenge(verifier), redirectUri };
}

function takeState(state, provider) {
  const entry = states.get(state);
  states.delete(state);
  if (!entry || entry.provider !== provider) return null;
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;
  return entry;
}

function buildAuthUrl(provider, req) {
  const cfg = providerConfig(provider);
  if (!cfg?.id) return null;
  const s = saveState(provider, req);

  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: cfg.id,
      redirect_uri: s.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: s.state,
      access_type: "online",
      prompt: "select_account",
    }).toString();
    return url.toString();
  }

  if (provider === "vk") {
    const url = new URL("https://id.vk.ru/authorize");
    url.search = new URLSearchParams({
      client_id: cfg.id,
      redirect_uri: s.redirectUri,
      response_type: "code",
      scope: "email",
      state: s.state,
      code_challenge: s.challenge,
      code_challenge_method: "S256",
    }).toString();
    return url.toString();
  }

  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    client_id: cfg.id,
    redirect_uri: s.redirectUri,
    response_type: "code",
    scope: "users.read tweet.read offline.access",
    state: s.state,
    code_challenge: s.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function exchangeGoogle(code, stateEntry) {
  const cfg = providerConfig("google");
  const token = await postForm("https://oauth2.googleapis.com/token", {
    client_id: cfg.id,
    client_secret: cfg.secret,
    redirect_uri: stateEntry.redirectUri,
    grant_type: "authorization_code",
    code,
  });
  if (token.status >= 400) throw new Error("Google recusou o login");
  const user = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token.data.access_token);
  if (user.status >= 400) throw new Error("Google não retornou usuário");
  return {
    id: user.data.sub,
    email: user.data.email,
    name: user.data.name || user.data.given_name,
  };
}

async function exchangeVk(code, stateEntry, deviceId) {
  const cfg = providerConfig("vk");
  const token = await postForm("https://id.vk.ru/oauth2/auth", {
    client_id: cfg.id,
    client_secret: cfg.secret || "",
    grant_type: "authorization_code",
    code_verifier: stateEntry.verifier,
    redirect_uri: stateEntry.redirectUri,
    code,
    device_id: deviceId || "",
  });
  if (token.status >= 400) throw new Error("VK recusou o login");
  const user = await postForm("https://id.vk.ru/oauth2/user_info", {
    client_id: cfg.id,
    access_token: token.data.access_token,
  });
  const info = user.data?.user || user.data || {};
  if (user.status >= 400 || !info.user_id && !info.id && !token.data.id_token) throw new Error("VK não retornou usuário");
  return {
    id: info.user_id || info.id || token.data.user_id || token.data.id_token,
    email: info.email || token.data.email,
    name: [info.first_name, info.last_name].filter(Boolean).join(" ") || info.name || "Jogador VK",
  };
}

async function exchangeTwitter(code, stateEntry) {
  const cfg = providerConfig("twitter");
  const headers = {};
  if (cfg.secret) {
    headers.Authorization = `Basic ${Buffer.from(`${cfg.id}:${cfg.secret}`).toString("base64")}`;
  }
  const token = await postForm("https://api.x.com/2/oauth2/token", {
    client_id: cfg.id,
    grant_type: "authorization_code",
    redirect_uri: stateEntry.redirectUri,
    code_verifier: stateEntry.verifier,
    code,
  }, headers);
  if (token.status >= 400) throw new Error("Twitter/X recusou o login");
  const user = await getJson("https://api.x.com/2/users/me?user.fields=username,name,profile_image_url", token.data.access_token);
  if (user.status >= 400 || !user.data?.data?.id) throw new Error("Twitter/X não retornou usuário");
  const u = user.data.data;
  return {
    id: u.id,
    username: u.username,
    name: u.name || u.username,
  };
}

function configuredProviders() {
  return {
    google: !!providerConfig("google")?.id,
    vk: !!providerConfig("vk")?.id,
    twitter: !!providerConfig("twitter")?.id,
  };
}

function successPage(result) {
  const payload = JSON.stringify({
    name: result.account?.name || "Jogador",
    token: result.token,
    accountId: result.account?.id,
    account: result.account,
  }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Strike Zone</title></head>
<body style="background:#0a0c10;color:#f4d47a;font-family:Arial,sans-serif;display:grid;place-items:center;height:100vh;text-align:center">
<main><h1>Login conectado</h1><p>Entrando no Strike Zone...</p></main>
<script>
localStorage.setItem(${JSON.stringify(SESSION_KEY)}, JSON.stringify(${payload}));
location.replace("/");
</script>
</body>
</html>`;
}

function errorPage(message) {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Strike Zone</title></head>
<body style="background:#0a0c10;color:#ff9a9a;font-family:Arial,sans-serif;display:grid;place-items:center;height:100vh;text-align:center">
<main><h1>Login social indisponível</h1><p>${escapeHtml(message)}</p><p><a style="color:#f0a030" href="/">Voltar</a></p></main>
</body>
</html>`;
}

async function handleOAuthApi(req, res, pathname) {
  if (pathname === "/api/oauth/providers") {
    return json(res, 200, { ok: true, providers: configuredProviders() });
  }

  const start = pathname.match(/^\/api\/oauth\/start\/(google|vk|twitter|x)$/);
  if (start) {
    const provider = start[1] === "x" ? "twitter" : start[1];
    const url = buildAuthUrl(provider, req);
    if (!url) return html(res, 400, errorPage(`Configure as credenciais de ${provider.toUpperCase()} no Render.`));
    res.writeHead(302, { Location: url, "Cache-Control": "no-cache" });
    return res.end();
  }

  const cb = pathname.match(/^\/api\/oauth\/callback\/(google|vk|twitter|x)$/);
  if (cb) {
    const provider = cb[1] === "x" ? "twitter" : cb[1];
    const url = new URL(req.url, publicBaseUrl(req));
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const deviceId = url.searchParams.get("device_id");
    const entry = takeState(state, provider);
    try {
      if (!code || !entry) throw new Error("Login expirou. Tente novamente.");
      const profile = provider === "google"
        ? await exchangeGoogle(code, entry)
        : provider === "vk"
          ? await exchangeVk(code, entry, deviceId)
          : await exchangeTwitter(code, entry);
      const result = loginWithOAuthProvider(provider, profile);
      if (!result.ok) throw new Error(result.error || "Não foi possível entrar");
      return html(res, 200, successPage(result));
    } catch (err) {
      return html(res, 400, errorPage(err.message || "Falha no login social."));
    }
  }

  return json(res, 404, { error: "Rota OAuth inválida" });
}

module.exports = { handleOAuthApi };
