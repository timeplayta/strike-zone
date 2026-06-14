/** Stripe — rotas de checkout e webhook */

const { COIN_PACKS, STRIPE_PRICE_IDS } = require("./stripe-config.js");
const { getPlayerById, creditCoins } = require("./account-db.js");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function getStripe() {
  if (!STRIPE_SECRET_KEY) return null;
  try {
    return require("stripe")(STRIPE_SECRET_KEY);
  } catch {
    return null;
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

async function createCheckoutSession(packId, accountId, token, origin) {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Pagamentos não configurados — chave Stripe ausente" };

  const pack = COIN_PACKS.find((p) => p.id === packId);
  if (!pack) return { ok: false, error: "Pacote inválido" };

  const player = getPlayerById(accountId);
  if (!player) return { ok: false, error: "Conta não encontrada" };
  if (!player.sessionToken || player.sessionToken !== token) return { ok: false, error: "Não autorizado" };
  if (Date.now() > (player.sessionExpires || 0)) return { ok: false, error: "Sessão expirada — faça login novamente" };

  const priceId = STRIPE_PRICE_IDS[packId];

  const lineItems = priceId
    ? [{ price: priceId, quantity: 1 }]
    : [{
        price_data: {
          currency: "brl",
          unit_amount: pack.price_brl,
          product_data: {
            name: `${pack.label} — ${pack.coins} moedas Strike Zone`,
            description: pack.bonus
              ? `${pack.coins} moedas ${pack.bonus}`
              : `${pack.coins} moedas para usar na loja`,
            images: [`${origin}/icon-192.png`],
          },
        },
        quantity: 1,
      }];

  const sessionParams = {
    mode: "payment",
    payment_method_types: ["card", "pix"],
    payment_method_options: {
      pix: { expires_after_seconds: 3600 },
    },
    line_items: lineItems,
    metadata: {
      accountId,
      packId,
      coins: String(pack.coins),
      playerId: player.playerId || "",
    },
    success_url: `${origin}/?payment=success&pack=${packId}&coins=${pack.coins}`,
    cancel_url: `${origin}/?payment=cancel`,
    locale: "pt-BR",
  };

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[Stripe] createCheckoutSession:", err.message);
    return { ok: false, error: err.message || "Erro ao criar sessão de pagamento" };
  }
}

async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe não configurado" };
  if (!STRIPE_WEBHOOK_SECRET) return { ok: false, error: "Webhook secret não configurado" };

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Assinatura inválida:", err.message);
    return { ok: false, error: `Assinatura inválida: ${err.message}` };
  }

  if (event.type !== "checkout.session.completed") {
    return { ok: true, ignored: true, type: event.type };
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") return { ok: true, skipped: true };

  const { accountId, packId, coins } = session.metadata || {};
  if (!accountId || !packId || !coins) {
    console.error("[Stripe Webhook] Metadata incompleta:", session.metadata);
    return { ok: false, error: "Metadata do pagamento incompleta" };
  }

  const amount = Number(coins);
  if (!amount || amount <= 0) return { ok: false, error: "Quantidade de moedas inválida" };

  const result = creditCoins(accountId, session.id, amount);
  if (!result.ok) {
    console.warn("[Stripe Webhook] creditCoins:", result.error, "sessionId:", session.id);
  } else {
    console.log(`[Stripe] +${amount} moedas creditadas → accountId: ${accountId}`);
  }

  return { ok: true, credited: result.ok, coins: amount, error: result.ok ? undefined : result.error };
}

async function handleStripeApi(req, res, pathname) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, stripe-signature");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const sendJson = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    res.end(JSON.stringify(data));
  };

  if (pathname === "/api/stripe/packs" && req.method === "GET") {
    const packs = COIN_PACKS.map(({ id, label, coins, display, bonus, highlight, emoji }) => ({
      id, label, coins, display, bonus, highlight, emoji,
    }));
    return sendJson({ ok: true, packs });
  }

  if (pathname === "/api/stripe/checkout" && req.method === "POST") {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return sendJson({ ok: false, error: "JSON inválido" }, 400);
    }

    const origin = process.env.PUBLIC_URL ||
      `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

    const result = await createCheckoutSession(body.packId, body.accountId, body.token, origin);
    return sendJson(result, result.ok ? 200 : 400);
  }

  if (pathname === "/api/stripe/webhook" && req.method === "POST") {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"] || "";
    const result = await handleWebhook(rawBody, signature);
    return sendJson(result, result.ok ? 200 : 400);
  }

  sendJson({ error: "Rota não encontrada" }, 404);
}

module.exports = { handleStripeApi };
