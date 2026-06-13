const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, exec } = require("child_process");

const PORT = 8080;
const ROOT = __dirname;
const LINK_FILE = path.join(ROOT, "link-celular.txt");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
};

const ROUTES = {
  "/": "index.html",
  "/celular": "celular.html",
  "/testar": "testar.html",
};

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return null;
}

function sendJson(res, data) {
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(data));
}

function createServer() {
  return http.createServer((req, res) => {
    const pathname = req.url.split("?")[0];

    if (pathname === "/api/ip") {
      return sendJson(res, { ip: getLocalIP() });
    }

    const rel = ROUTES[pathname] || pathname.replace(/^\//, "");
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(file);
      const headers = { "Content-Type": MIME[ext] || "text/plain" };
      if (ext === ".js" || ext === ".html") headers["Cache-Control"] = "no-cache";
      res.writeHead(200, headers);
      res.end(data);
    });
  });
}

function openBrowser(url) {
  if (process.platform === "win32") {
    exec(`start "" "${url}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function saveLink(url) {
  fs.writeFileSync(LINK_FILE, url, "utf8");
  const testPage = `http://localhost:${PORT}/testar?public=${encodeURIComponent(url)}`;
  console.log("");
  console.log("========================================");
  console.log("  LINK PARA O CHROME DO CELULAR");
  console.log("========================================");
  console.log("");
  console.log("  " + url);
  console.log("");
  console.log("  Salvo em: link-celular.txt");
  console.log("  Abrindo pagina de teste no PC...");
  console.log("========================================");
  console.log("");
  openBrowser(testPage);
}

function startTunnel() {
  const tunnel = spawn(
    "npx",
    ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${PORT}`],
    { shell: true, stdio: ["ignore", "pipe", "pipe"] }
  );

  let saved = false;
  const onData = (chunk) => {
    const text = chunk.toString();
    process.stderr.write(text);
    if (saved) return;
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      saved = true;
      saveLink(`${match[0]}/celular`);
    }
  };

  tunnel.stdout.on("data", onData);
  tunnel.stderr.on("data", onData);
  tunnel.on("exit", (code) => {
    if (code !== 0 && code !== null) console.error("Tunel encerrado. Codigo:", code);
    process.exit(code || 0);
  });
}

const server = createServer();
server.listen(PORT, "0.0.0.0", () => {
  console.log("Gerando link publico para o celular...");
  console.log("(precisa de internet — aguarde ~15 segundos)");
  console.log("");
  startTunnel();
});
