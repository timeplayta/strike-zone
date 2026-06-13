# Instruções do Jogo — Strike Zone

Este documento reúne **todas as solicitações e diretrizes** passadas para o desenvolvimento do jogo.

---

## 1. Conceito geral

- Jogo inspirado em **CS:GO** (Counter-Strike).
- **2 mapas** com a **mesma planta** — só mudam cores, escala e tint dos objetos.
- Partida tática com física (ragdoll, sangue, explosões).
- **Fluido e leve** para PCs fracos.
- **Tela inicial com rolagem** (barra lateral) para ver todas as opções e o botão INICIAR PARTIDA.

---

## 2. Mapas

1. **Dust Alley** — deserto, cores quentes (escala 1.0).
2. **Cold Storage** — armazém azulado (escala 0.92).

### Layout idêntico

- Mesmas paredes, mesas, props, pontos de patrulha e sala secreta.
- **Sem blocos gigantes** no centro — coberturas duplicadas nas mesas foram removidas.
- Mesas reais: **4 pernas com furo** + cadeiras ao redor (não blocos).
- Teto **unido às paredes**.

### Sala do chefão (centro do mapa)

- **Porta de madeira velha** alinhada ao vão da sala — **começa fechada** e só abre com **clique do jogador** (PC: clique esquerdo mirando nela; celular: botão ATIRAR mirando nela).
- Porta fechada **bloqueia passagem, visão e balas** — ninguém atira através dela.
- Inimigos comuns **não entram** na sala; o **guardião não sai** dela.
- **Decoração da sala (assalto recente):**
  - **Cofre arrombado** — porta arrancada pendendo torta, interior vazio, marcas de pé de cabra.
  - **Mesa derrubada** de lado com pernas para fora.
  - **Duas cadeiras jogadas** no chão.
  - Tapete vermelho com borda dourada, dinheiro e papéis espalhados, quadro torto.
  - **Luminária pendurada com luz quente** — destaca a sala no mapa escuro.
- Dentro: **boss musculoso** (200 HP, metralhadora rotativa, atira **70% mais rápido**) guardando bomba que explode em **1:30** após abrir a porta.
- Bandidos normais atiram **25% mais rápido** e usam **cobertura** (agacham atrás de objetos/paredes).
- Desarmar bomba interna com **B** (após eliminar o guardião).

---

## 3. Dificuldade pela quantidade de bots

- Opção **“Usar quantidade de bots para mudar a dificuldade”** (ligada por padrão).
- **1 bot:** um **super bandido** no mapa com **500 HP**, atira **3× mais rápido**, mais dano e velocidade. A cada **100 de vida perdida**, **teleporta** para outro ponto seguro do mapa (sem atravessar paredes).
- **20 bots:** inimigos **mais fracos** — andam **devagar**, atiram **20% mais devagar** que o normal, **100 HP**.
- Entre 1 e 20 a dificuldade é **interpolada** (prévia colorida abaixo do controle).
- Desmarque a opção para usar sempre stats normais (100 HP, cadência padrão), independente do número.

---

## 4. Menu inicial

- Dispositivo (PC / Celular)
- Nome do jogador
- Mapa (Dust / Warehouse)
- Arma principal (AK-47, SCAR, AWM, Doze)
- Modo (Eliminação / Defuse)
- **Seleção de NPCs antes da partida:** botões para 1, 4, 8, 12 ou 20 inimigos + botão **+2 Ajudantes CT** (aliados)
- Ajuste fino com slider (1–20) e opção de dificuldade dinâmica
- **Layout PC:** dispositivo, mapas, armas e NPCs em **fileira horizontal**
- **Layout celular:** mesmas opções **empilhadas na vertical**
- **Rolagem vertical** na tela inicial para acessar o botão INICIAR PARTIDA

---

## 5. Ajudantes CT (opcionais)

- **2 operadores aliados** se marcado no menu.
- Uniforme azul CT, seguem o jogador e atiram nos bandidos.
- Se forem eliminados, **T ganha pontos** e os inimigos são alertados.
- **Stats escalam com a quantidade de inimigos** (1 bot = básicos, 20 bots = elite):

| Stat | 1 inimigo | 20 inimigos |
|------|-----------|-------------|
| Vida | 85 | 180 |
| Cadência de tiro | 900 ms | 380 ms |
| Precisão | 50% | 90% |
| Dano | 9–15 | 17–27 |
| Velocidade | 2.6 | 4.4 |

- **Inteligência também escala:** com muitos inimigos, cada ajudante escolhe um **alvo diferente**, **flanqueia** mantendo distância, **pula** em combate e se **reposiciona** quando perde a visão do alvo.

---

## 6. Inimigos (T / bandidos)

- Humanos **realistas estilo FPS tático** (~1,72 m): botas, pernas proporcionais, colete tático, cinto com rádio, joelheiras, luvas, rifle nas mãos.
- **Rostos únicos por NPC:** pele variada, olhos, barba, cicatriz; ou **máscaras táticas** (caveira, listras, camuflagem), **bandana**, **boné** ou **óculos** — cada bandido tem visual diferente.
- Ajudantes CT: uniforme azul + **capacete tático** com rosto visível por baixo (Alpha e Bravo distintos).
- Boss: corpo musculoso maior + **máscara caveira vermelha** + metralhadora rotativa.
- **Barra de HP escondida:** só aparece quando **o jogador atira** no inimigo, e **some 2 segundos** após o último tiro — sem "wallhack" de vida à distância (jogo mais difícil).
- Barras dos **ajudantes CT** ficam sempre visíveis (aliados).
- **Patrulham o mapa inteiro** (15 pontos de patrulha).
- **IA inteligente:**
  - Andam pelo mapa em rotas de patrulha.
  - **Flanqueiam**, **recuam com vida baixa** e **pulam** ocasionalmente em combate.
  - Quando um morre, os outros **vão investigar** o local.
  - Depois **perseguem** a última posição conhecida do jogador.
  - Atiram com mais precisão ao perseguir.
- Podem **plantar bomba** no modo defuse (pontos para T).
- Boss fica na sala secreta.

---

## 7. Placar e vitória (CT e T)

- **CT ganha pontos:** abates, desarmar bomba, rounds vencidos.
- **T ganha pontos:** matar jogador, matar ajudantes, bomba explodir, plantar bomba, tempo esgotado (defuse).
- **Primeiro a 15** no modo eliminação vence a partida.
- **Terroristas podem vencer** — o jogo não favorece só o CT.
- Placar exibido no HUD: CT vs T.

---

## 8. Armas

| Arma | Tipo |
|------|------|
| AK-47 | Automática, alto dano |
| SCAR-H | Precisa, dano médio |
| AWM | Sniper, longo alcance |
| Doze | Escopeta, curto alcance |
| Glock | Secundária (tecla 2) |
| Faca | Corpo a corpo (tecla 3) |

Dano com queda por distância estilo CS (`weapons-data.js`).

---

## 9. Controles

### PC

| Ação | Tecla |
|------|-------|
| Mover | WASD |
| **Pular** | **Espaço** |
| Mirar | Mouse |
| Atirar | Clique esquerdo |
| Mirar com mira (AK / SCAR / AWM) | **Botão direito** (segurar) |
| Abrir porta | **Clique esquerdo na porta** (centro do mapa, mirando) |
| Recarregar | R |
| Armas | 1 / 2 / 3 |
| Bomba | B |
| **Lanterna** (só mapa terror) | **J** |

### Celular

- Joystick mover + **botão verde ↑ (pular)** + arrastar para mirar + ATIRAR.
- No **mapa terror**, botão **🔦** liga/desliga a lanterna (equivalente ao **J** no PC).
- Role o menu inicial para baixo para iniciar partida.

---

## 10. Visual do mapa (escuro e envelhecido)

- **Ambiente escurecido** — iluminação reduzida (lugar fechado), céu e névoa escuros, névoa mais próxima.
- **Visual velho:** texturas com **manchas, escorridos de infiltração e rachaduras** em chão e paredes; quadros tortos; entulho espalhado pelo mapa.
- **Texturas nos objetos:** madeira com tábuas e veios (caixas, paletes, lenha), metal riscado com ferrugem (barris, caçambas), tecido áspero (sacos de areia), porta de tábuas velhas com travessas de metal.
- **Objetos separados das paredes** — mesas, poste, barris, paletes e caçambas reposicionados para nada atravessar paredes; quadros encostados na face interna das paredes.

---

## 11. Performance

- Sem sombras, antialias off, DPR ≤ 1.
- Materiais Lambert, geometrias simples.
- Texturas procedurais pequenas (canvas) com cache — sem downloads.

---

## 12. Como executar

1. `iniciar.bat` ou `node server.js`
2. Abrir **http://localhost:8080**
3. Role o menu, configure opções e clique INICIAR PARTIDA.

---

## 13. Jogar no celular Android (tipo APK)

O jogo é um **PWA** (app instalável pelo navegador) — não precisa de APK.

### Passo a passo

1. No PC, deixe o servidor rodando (`iniciar.bat` ou `node server.js`).
2. O celular precisa estar **na mesma rede Wi-Fi** do PC.
3. No Chrome do celular, abra o endereço que aparece na janela do servidor
   (ex.: `http://192.168.18.146:8080/celular`).
4. Menu do Chrome (⋮) → **"Adicionar à tela inicial"**.
5. O ícone do Strike Zone (mira laranja) aparece na tela do celular como um app.

### Arquivos do PWA

| Arquivo | Função |
|---------|--------|
| `manifest.webmanifest` | Nome, ícone, tela cheia, orientação paisagem |
| `sw.js` | Service worker — cache para abrir mais rápido |
| `icon-192.png` / `icon-512.png` | Ícones do app (mira laranja) |

### Por que não um APK de verdade?

- Compilar APK exige **Android Studio + Java + SDK** (vários GB) — pesado demais para o PC atual.
- O PWA dá a mesma experiência: ícone, tela cheia, sem barra do navegador.
- Se um dia quiser APK real: hospedar o jogo num site HTTPS (ex.: GitHub Pages) e usar o **PWABuilder** (pwabuilder.com), que gera o APK online de graça.

---

## 14. Histórico de melhorias

- [x] 2 mapas mesma planta (cores/escala diferentes).
- [x] Teto unido às paredes, mesas com pernas e cadeiras.
- [x] Porta clicável — só jogador abre e entra.
- [x] Sala secreta menor (sem bloco gigante no centro).
- [x] NPCs patrulham mapa + investigam mortes + perseguem jogador.
- [x] Opção de 2 ajudantes CT no menu.
- [x] CT **e** T podem vencer (placar equilibrado).
- [x] Menu inicial com **barra de rolagem**.
- [x] Escolha de arma AK / SCAR / AWM / Doze.
- [x] Boss + bomba 1:30 na sala secreta.
- [x] Corrigido erro "Unexpected end of input" (`world-decor.js` truncado — faltava `}` final).
- [x] PWA para Android: manifest, service worker e ícones — instala pela tela inicial do Chrome.
- [x] Sala do chefão decorada: cofre arrombado, mesa e 2 cadeiras derrubadas, tapete, luz quente.
- [x] Porta da sala alinhada ao vão, fechada no início, bloqueia visão/balas/passagem.
- [x] Texturas nos objetos (madeira, metal enferrujado, tecido) e nas paredes/chão.
- [x] Objetos reposicionados — nada atravessa paredes (poste, barril, mesas, quadros).
- [x] Ajudantes CT escalam com nº de inimigos (tiro, dano, velocidade, inteligência).
- [x] Vida dos inimigos só aparece ao atirar neles e some após 2 s.
- [x] Mapa escurecido + visual envelhecido (manchas, rachaduras, entulho).
- [x] Corrigido: luzes sumiam ao reiniciar a partida (eram removidas e não recriadas).
- [x] Personagens refeitos — corpos realistas estilo FPS tático (colete, botas, rifle, proporções humanas).
- [x] Mouse visível na tela de renascer (facilita clicar nos botões).
- [x] Lanterna no mapa terror — **J** (PC) ou botão **🔦** (celular) ilumina o ambiente escuro.

*Documento atualizado conforme pedidos do projeto Strike Zone.*
