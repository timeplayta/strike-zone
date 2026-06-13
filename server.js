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

function sendJson(res, data) {
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(data));
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
  if (pathname.startsWith("/api/account")) {
    try {
      return await handleAccountApi(req, res, pathname);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err.message || "Erro no servidor" }));
    }
  }
  if (pathname.startsWith("/data/") || pathname === "/account-db.js") {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  if (pathname === "/vendor/three.module.js") return serveThree(res);

  const rel = resolveFile(pathname);
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
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
