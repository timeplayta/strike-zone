ramente dentro do projeto,
> sem pagar nenhum serviço externo, sem Hyper3D, sem Rodin, sem nada além do que já temos.o 

---

## Por que deu trabalho antes?

Modelos 3D orgânicos (mãos com dedos, rostos, cor# Plano: Modelos 3D Sem Plataforma Externa

> **Objetivo:** Criar/melhorar todos os modelos 3D do Strike Zone inteipos humanos) normalmente exigem
um artista 3D ou uma IA geradora de mesh. O Hyper3D/Rodin tentado anteriormente
bloqueou por falta de crédito. A solução: fazer tudo em código, dentro do próprio projeto.

---

## Abordagens disponíveis (todas gratuitas)

### A — Three.js Procedural Avançado
- Modelos feitos 100% em JavaScript com Three.js
- Usa `LatheGeometry`, `ExtrudeGeometry`, `BufferGeometry` customizado
- Dedos com cilindros articulados, cano de arma cilíndrico real, coronhas orgânicas
- **Zero dependência nova — funciona agora**

### B — Script Gerador de GLB no projeto
- Arquivo `generate-models.js` que roda com Node.js
- Gera arquivos `.glb` reais salvos em `public/models/`
- Jogo carrega com `GLTFLoader` — formato profissional com UV, materiais, esqueleto
- Dependência: `@gltf-transform/core` (open source, gratuito)
- **Você roda `npm install` 1 vez — eu escrevo tudo**

### C — Estilo Voxel/Blocky Intencional
- Personagem em blocos pequenos (visual Minecraft/Fortnite estilizado)
- Identidade visual forte, leve, fácil de animar
- **Zero dependência — funciona agora**

---

## O que você precisa fazer?

| Fase | Você faz |
|------|----------|
| 1, 2, 3C | **Nada** — só esperar |
| Fase 3 (GLB) | `npm install @gltf-transform/core` uma vez |
| Fase 4, 5 | `node generate-models.js` uma vez |

---

## Plano de execução — 5 fases

---

### Fase 1 — Mãos FPS com Dedos Reais
**Abordagem:** Three.js procedural avançado  
**Arquivo:** `fps-hands-hd.js`  
**Você faz:** nada

**O que muda:**
- Mão atual = 1 bloco simples
- Nova mão = palma + 5 dedos articulados (3 falanges cada) + polegar oposto
- Textura de pele com `MeshStandardMaterial` + roughness realista
- Luva tática com costura modelada
- Mão esquerda estabilizando o cano da arma

**Resultado esperado:** Visão FPS com mãos que parecem mãos de verdade

---

### Fase 2 — Personagem Principal com Proporções Humanas
**Abordagem:** Three.js procedural avançado  
**Arquivo:** `character-model-hd.js`  
**Você faz:** nada

**O que muda:**
- Cabeça com formato oval (não cúbica)
- Tronco com ombros, cintura, quadril diferenciados
- Braços com bíceps/antebraço/pulso
- Pernas com coxa/canela/pé separados
- Colete tático com bolsos modelados
- Capacete com viseira

**Resultado esperado:** Soldado reconhecível como humano, não boneco de caixas

---

### Fase 3 — Script Gerador de GLB
**Abordagem:** Gerador Node.js com `@gltf-transform/core`  
**Arquivo:** `generate-models.js`  
**Você faz:** `npm install @gltf-transform/core` → `node generate-models.js`

**O que faz:**
- Gera geometry com vértices customizados (curvas reais)
- Exporta `.glb` com múltiplos materiais e UV maps
- Salva em `public/models/` automaticamente
- Roda uma vez, resultado fica no projeto para sempre

---

### Fase 4 — Armas em GLB com Formas Reais
**Abordagem:** Gerador de GLB (Fase 3)  
**Arquivos gerados:** `public/models/ak47.glb`, `awm.glb`, `glock.glb`, etc.  
**Você faz:** `node generate-models.js` (mesmo script da fase 3)

**O que muda por arma:**

#### AK-47
- Cano cilíndrico com câmara e bocal de chama
- Carregador curvo com parafusos laterais
- Coronha de madeira com grão texturizado
- Punho pistol ergonômico
- Trilho Picatinny no topo (para mira)

#### AWM (sniper)
- Cano longo com supressor opcional
- Bipé dobrável nas pernas dianteiras
- Luneta com escopo modelado
- Coronha ajustável com almofada

#### Glock 17
- Slide com ranhuras de tração
- Cano com câmara de extração
- Carregador com base texturizada
- Mira dianteira e traseira integradas

---

### Fase 5 — Personagem Animado com Esqueleto (GLB rigged)
**Abordagem:** Gerador de GLB com bones/skinning  
**Arquivo gerado:** `public/models/player.glb`  
**Você faz:** rodar o gerador

**O que muda:**
- Modelo com esqueleto (bones) para animação suave
- Animações: andar, correr, atirar, recarregar, morrer, agachar
- Pesos de skinning por região (ombro, cotovelo, joelho)
- Substitui os personagens atuais em todos os mapas

---

## Cronograma estimado

| Fase | Complexidade | Tempo de código |
|------|-------------|-----------------|
| 1 — Mãos FPS | Média | ~1 sessão |
| 2 — Personagem | Média | ~1 sessão |
| 3 — Setup Gerador GLB | Média | ~1 sessão |
| 4 — Armas em GLB | Alta | ~1–2 sessões |
| 5 — Personagem rigged | Alta | ~2 sessões |

---

## Resultado final

Ao final das 5 fases, o Strike Zone terá:
- Mãos FPS com dedos reais visíveis
- Soldado com proporções humanas
- Armas AK47, AWM e Glock com geometria profissional em GLB
- Personagem com animações suaves via esqueleto
- **Tudo feito 100% no projeto, sem pagar nada, sem plataforma externa**

---

*Criado em: Junho 2026 — Strike Zone Online*
