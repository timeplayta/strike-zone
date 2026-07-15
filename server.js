const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");

const PORT = Number(process.env.PORT) || 8080;
const IS_CLOUD = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
const ROOT = __dirname;
const { handleAccountApi, ensureBootstrapAdmin } = require("./account-db.js");
const { handleStripeApi } = require("./stripe-handlers.js");
const { handleOAuthApi } = require("./oauth-auth.js");
ensureBootstrapAdmin();
const VENDOR_DIR = path.join(ROOT, "vendor");
const THREE_FILE = path.join(VENDOR_DIR, "three.module.js");
const THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
};

const ROUTES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/celular": "celular.html",
  "/celular.html": "celular.html",
};

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, limit = 3_500_000) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > limit) {
        reject(new Error("Payload grande demais"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

function looksLikeQrDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return false;
  if (!dataUrl.startsWith("data:image/")) return true;
  // Servidor: bloqueio básico — cliente já valida; aqui só rejeita data URLs suspeitas demais
  if (dataUrl.length > 3_200_000) return true;
  return false;
}

async function handleTutorialReport(req, res) {
  const body = await readJsonBody(req);
  const message = String(body.message || "").trim().slice(0, 1200);
  if (message.length < 8) {
    return sendJson(res, { ok: false, error: "Mensagem muito curta." }, 400);
  }
  const imageDataUrl = body.imageDataUrl ? String(body.imageDataUrl) : null;
  if (imageDataUrl && looksLikeQrDataUrl(imageDataUrl)) {
    return sendJson(res, { ok: false, error: "Imagem inválida ou parecida com QR code." }, 400);
  }

  const dir = path.join(ROOT, "data", "tutorial-reports");
  fs.mkdirSync(dir, { recursive: true });

  const id = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  let imageFile = null;
  if (imageDataUrl && imageDataUrl.startsWith("data:image/")) {
    const m = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(imageDataUrl);
    if (!m) {
      return sendJson(res, { ok: false, error: "Formato de imagem não aceito." }, 400);
    }
    const ext = m[1].includes("png")
      ? "png"
      : m[1].includes("webp")
        ? "webp"
        : m[1].includes("gif")
          ? "gif"
          : "jpg";
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 2.6 * 1024 * 1024) {
      return sendJson(res, { ok: false, error: "Imagem grande demais." }, 400);
    }
    imageFile = `${id}.${ext}`;
    fs.writeFileSync(path.join(dir, imageFile), buf);
  }

  const entry = {
    id,
    at: new Date().toISOString(),
    message,
    phase: body.phase || null,
    playerName: String(body.playerName || "").slice(0, 40),
    userAgent: String(body.userAgent || "").slice(0, 240),
    url: String(body.url || "").slice(0, 240),
    imageFile,
  };
  fs.appendFileSync(path.join(dir, "reports.jsonl"), JSON.stringify(entry) + "\n", "utf8");
  return sendJson(res, { ok: true, id });
}

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

function resolveFile(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (ROUTES[clean]) return ROUTES[clean];
  return clean.replace(/^\//, "") || "index.html";
}

function openBrowser(url) {
  if (process.platform === "win32") exec(`start "" "${url}"`);
  else if (process.platform === "darwin") exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

function sendFile(res, file, cache = false) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<h1>404</h1><p>${path.basename(file)}</p><a href="/">Menu</a>`);
    }
    const ext = path.extname(file);
    const headers = { "Content-Type": MIME[ext] || "text/plain; charset=utf-8" };
    if (!cache) headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    res.writeHead(200, headers);
    res.end(data);
  });
}

function downloadThree(callback) {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  console.log("Baixando Three.js...");
  https
    .get(THREE_CDN, (cdnRes) => {
      if (cdnRes.statusCode !== 200) {
        callback(new Error("CDN " + cdnRes.statusCode));
        return;
      }
      const chunks = [];
      cdnRes.on("data", (c) => chunks.push(c));
      cdnRes.on("end", () => {
        fs.writeFileSync(THREE_FILE, Buffer.concat(chunks));
        console.log("Three.js OK em vendor/");
        callback(null);
      });
    })
    .on("error", callback);
}

function serveThree(res) {
  if (fs.existsSync(THREE_FILE)) {
    const stat = fs.statSync(THREE_FILE);
    if (stat.size > 100000) return sendFile(res, THREE_FILE, true);
  }
  return downloadThree((err) => {
    if (err) {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Three.js indisponivel. Verifique internet e recarregue.");
    }
    sendFile(res, THREE_FILE, true);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = req.url.split("?")[0];

  if (pathname === "/health") return sendJson(res, { ok: true });
  if (pathname === "/api/ip") return sendJson(res, { ip: getLocalIP() });
  if (pathname === "/celular" || pathname === "/celular.html") {
    res.writeHead(302, { Location: "/index.html?device=mobile", "Cache-Control": "no-cache" });
    return res.end();
  }
  if (pathname.startsWith("/api/account")) {
    try {
      return await handleAccountApi(req, res, pathname);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Erro no servidor" }));
    }
  }
  if (pathname.startsWith("/api/oauth")) {
    try {
      return await handleOAuthApi(req, res, pathname);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Erro no OAuth" }));
    }
  }
  if (pathname.startsWith("/api/stripe")) {
    try {
      return await handleStripeApi(req, res, pathname);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Erro no servidor" }));
    }
  }
  if (pathname === "/api/tutorial-report" && req.method === "POST") {
    try {
      return await handleTutorialReport(req, res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: err.message || "Erro ao salvar report" }));
    }
  }
  if (pathname === "/stripe-handlers.js" || pathname === "/stripe-config.js" || pathname === "/.env") {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (pathname.startsWith("/data/") || pathname === "/account-db.js") {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (pathname === "/vendor/three.module.js") return serveThree(res);

  const rel = resolveFile(pathname);
  const file = path.resolve(ROOT, rel);
  const rootResolved = path.resolve(ROOT);
  if (!file.startsWith(rootResolved + path.sep) && file !== rootResolved) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("Not found: " + rel);
  }
  sendFile(res, file);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("\nERRO: porta " + PORT + " ocupada. Feche janelas pretas antigas.\n");
  } else {
    console.error("Erro:", err.message);
  }
  process.exit(1);
});

if (!fs.existsSync(THREE_FILE) || fs.statSync(THREE_FILE).size < 100000) {
  downloadThree((err) => {
    if (err) console.warn("Aviso Three.js:", err.message);
  });
}

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  if (IS_CLOUD) {
    console.log("\nStrike Zone online (Render) — porta " + PORT + "\n");
  } else {
    console.log("\nStrike Zone: http://localhost:" + PORT);
    if (ip) console.log("Celular: http://" + ip + ":" + PORT + "/celular");
    console.log("Deixe esta janela aberta.\n");
    openBrowser("http://localhost:" + PORT);
  }
});
