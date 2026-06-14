# Plano de Monetização — Strike Zone

> Modelo: **cosméticos + conveniência, zero pay-to-win**
> Inspiração: Free Fire, Valorant — status visual, sem vantagem de dano.

---

## O que já existe (aproveitar)

| Sistema | Status |
|--------|--------|
| Contas com ID único (`SZ-XXXXXX`) | ✅ Pronto |
| Loja com skins (arma, personagem, outfit) | ✅ Pronto |
| Compra com moedas (`/api/account/buy`) | ✅ Pronto |
| Moedas por kill no servidor | ✅ Pronto |
| Preview 3D na loja | ✅ Pronto |
| **Pagamento real via Stripe** | ✅ **Implementado neste PR** |

---

## Fase 1 — Pacotes de Moedas (MVP) ✅ Implementado

Jogador clica **"+ Moedas"** → seleciona pacote → Stripe Checkout → webhook credita.

| Pacote | Moedas | Preço | Bônus |
|--------|--------|-------|-------|
| Starter | 500 🪙 | R$ 4,90 | — |
| Popular 🔥 | 1.800 🪙 | R$ 14,90 | +16% |
| Pro | 4.500 🪙 | R$ 29,90 | +25% |
| Mega | 12.000 🪙 | R$ 59,90 | +40% |

**Fluxo:**
```
Jogador → POST /api/stripe/checkout → Stripe Checkout → Paga (Pix/cartão)
→ Stripe Webhook POST /api/stripe/webhook → creditCoins (idempotente) → jogo
```

**Arquivos criados:**
- `stripe-config.js` — pacotes, Price IDs do dashboard
- `stripe-handlers.js` — checkout + webhook + rota `/api/stripe/*`
- `.env.example` — variáveis de ambiente necessárias

---

## Fase 2 — Skins Premium Exclusivas (próxima sprint)

Novos itens com flag `premiumOnly: true` — só compráveis com moedas **premium** ou pagamento direto.

Exemplos:
- Skin horror modo trevas (personagem `trevas_horror` já existe no SHOP)
- Armas galaxy animadas
- Emote de morte (quando implementar)

Implementar: adicionar campo `premiumOnly` no `SHOP`, bloquear compra com moedas soft, criar rota `/api/stripe/buy-item`.

---

## Fase 3 — Battle Pass (30 dias)

Preço sugerido: **R$ 19,90/mês**

| Trilha | Recompensas |
|--------|-------------|
| Grátis | 1 skin comum + 100 moedas |
| Pago | 3 skins + 500 moedas + badge "Operador Elite" |

Usar `stripe.subscriptions` + campo `battlePassExpires` no player.

---

## Fase 4 — Strike Pass (assinatura mensal)

Preço: **R$ 9,90/mês**

Benefícios cosméticos:
- +20% moedas por kill
- 1 skin rotativa por mês
- Badge exclusiva no perfil
- Fila prioritária (quando tiver matchmaking)

**Zero vantagem de dano.**

---

## Economia de Moedas

| Ação | Ganho |
|------|-------|
| Kill em partida | 12 🪙 |
| Kill no modo solo | 55 🪙 |
| Aniversário | 3.000 🪙 |
| Pacote Starter | 500 🪙 |
| Pacote Popular | 1.800 🪙 |
| Pacote Pro | 4.500 🪙 |
| Pacote Mega | 12.000 🪙 |

Skin mais cara atual: ~2.200 🪙 (bazooka galaxy).
Com grind puro: ~40 kills de solo = 2.200 🪙. Razoável, incentiva comprar pacote.

---

## Setup Stripe — O que você precisa fazer

### 1. Criar conta Stripe Brasil
- Acesse [dashboard.stripe.com](https://dashboard.stripe.com)
- Ative **Pix** + **cartão** + **boleto**

### 2. Criar os 4 produtos

No dashboard: **Products → Add product** para cada pacote:

| Nome do produto | Preço | Moeda |
|----------------|-------|-------|
| Starter — 500 moedas Strike Zone | R$ 4,90 | BRL |
| Popular — 1.800 moedas Strike Zone | R$ 14,90 | BRL |
| Pro — 4.500 moedas Strike Zone | R$ 29,90 | BRL |
| Mega — 12.000 moedas Strike Zone | R$ 59,90 | BRL |

> Tipo: **One-time** (não recorrente)

Após criar, copie os **Price IDs** (começam com `price_...`) e coloque no `.env`:
```
STRIPE_PRICE_STARTER=price_xxxxxx
STRIPE_PRICE_POPULAR=price_xxxxxx
STRIPE_PRICE_PRO=price_xxxxxx
STRIPE_PRICE_MEGA=price_xxxxxx
```

> **Se não colocar os Price IDs**, o sistema ainda funciona — cria os preços dinamicamente com `price_data`. Funciona em teste.

### 3. Configurar Webhook

No dashboard: **Developers → Webhooks → Add endpoint**

- URL: `https://strike-zone.onrender.com/api/stripe/webhook`
- Evento: `checkout.session.completed`
- Copie o **Signing secret** (`whsec_...`) → `.env: STRIPE_WEBHOOK_SECRET`

### 4. Pegar as chaves

**Developers → API keys:**
- `sk_test_...` → modo teste
- `sk_live_...` → produção

Coloque em `.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_URL=https://strike-zone.onrender.com
```

### 5. No Render

Em [render.com](https://render.com) → seu serviço → **Environment → Add Environment Variable** e adicione as 3 variáveis acima.

### 6. Testar

Cartão de teste: `4242 4242 4242 4242` / qualquer data futura / qualquer CVC.
Pix teste: o Stripe simula o pagamento automaticamente.

---

## Compliance / Legal

| Regra | Implementado |
|-------|-------------|
| Produto digital sem resgate monetário | ✅ Descrito no checkout |
| Moedas não transferíveis | ✅ Apenas na conta |
| Idempotência no webhook (sem duplo crédito) | ✅ |
| Menores de 13 — bloquear compras | ⚠️ Implementar na Fase 2 |
| Termos de uso mencionando produto digital | ⚠️ Adicionar ao site |

---

## Estimativa de receita

| Jogadores ativos | 2% convertem | Ticket médio | Receita/mês |
|-----------------|--------------|--------------|-------------|
| 500 | 10 | R$ 15 | ~R$ 150 |
| 5.000 | 100 | R$ 18 | ~R$ 1.800 |
| 50.000 | 1.000 | R$ 20 | ~R$ 20.000 |

Stripe: ~3,4% + R$ 0,40 por transação no Brasil.

---

## Métricas para acompanhar

- Conversão: visitantes da loja → clicam em "+ Moedas"
- ARPPU: receita por usuário pagante
- % Pix vs cartão
- Tempo médio até 1ª compra
- Churn pós-compra (continuam jogando?)
