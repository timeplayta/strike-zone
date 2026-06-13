# Strike Zone

FPS tático no navegador inspirado em CS:GO, com **2 mapas** e partida rápida contra bots.

**Requisitos completos do projeto:** [INSTRUCOES_DO_JOGO.md](INSTRUCOES_DO_JOGO.md)  
**Jogar no celular Android:** [COMO_JOGAR_NO_CELULAR.md](COMO_JOGAR_NO_CELULAR.md)

No menu, escolha **Computador** ou **Celular (Android)** antes de iniciar.

## Como jogar

1. Dê **duplo clique** em `iniciar.bat`, ou no terminal:
   ```bash
   node server.js
   ```

2. Acesse no navegador: **http://localhost:8080**

3. Escolha mapa, modo e clique em **INICIAR PARTIDA**.

### Controles

| Tecla | Ação |
|-------|------|
| WASD | Mover |
| Mouse | Mirar |
| Clique esquerdo | Atirar / abrir porta (mirando nela) |
| Botão direito | Mirar com mira (AK-47, SCAR, AWM) |
| R | Recarregar |
| 1 / 2 / 3 | AK-47 / Glock / Faca |
| B | Desarmar bomba (modo Desarmar, perto da bomba) |

### Mapas

- **Dust Alley** — deserto, corredores e coberturas abertas
- **Cold Storage** — armazém interno, salas e corredores estreitos

### Modos

- **Eliminação** — primeiro time a 15 abates vence
- **Desarmar bomba** — melhor de 5 rounds; elimine os Ts ou desarme com **B**

Você joga como **CT** contra 4 terroristas controlados por IA.
