/** Configuração dos pacotes de moedas e Price IDs do Stripe */

const COIN_PACKS = [
  {
    id: "starter",
    label: "Starter",
    coins: 500,
    price_brl: 490,
    display: "R$ 4,90",
    bonus: null,
    highlight: false,
    emoji: "🪙",
  },
  {
    id: "popular",
    label: "Popular",
    coins: 1800,
    price_brl: 1490,
    display: "R$ 14,90",
    bonus: "+16% bônus",
    highlight: true,
    emoji: "💰",
  },
  {
    id: "pro",
    label: "Pro",
    coins: 4500,
    price_brl: 2990,
    display: "R$ 29,90",
    bonus: "+25% bônus",
    highlight: false,
    emoji: "💎",
  },
  {
    id: "mega",
    label: "Mega",
    coins: 12000,
    price_brl: 5990,
    display: "R$ 59,90",
    bonus: "+40% bônus",
    highlight: false,
    emoji: "🚀",
  },
];

/**
 * Price IDs do Stripe Dashboard.
 * Vá em https://dashboard.stripe.com/products, crie 4 produtos one-time e
 * cole os IDs (price_...) no seu .env — ou deixe vazio para usar price_data dinâmico.
 */
const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || "",
  popular: process.env.STRIPE_PRICE_POPULAR || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  mega: process.env.STRIPE_PRICE_MEGA || "",
};

module.exports = { COIN_PACKS, STRIPE_PRICE_IDS };
