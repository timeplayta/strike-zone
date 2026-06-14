# Instruções De Deploy No Render

Este projeto deve ser publicado na web pelo **Render**, não apenas testado no Wi-Fi local.

## Regra Principal

- Sempre que fizer uma nova implementação, salvar as mudanças em commit e enviar para o GitHub.
- O Render está configurado com `autoDeploy: true` em `render.yaml`.
- Depois do `git push`, aguardar o Render publicar a nova versão no link público.
- O objetivo é que qualquer pessoa consiga acessar pela web, sem estar no mesmo Wi-Fi do PC.

## Link Público

- Jogo web: `https://strike-zone.onrender.com`
- Celular: `https://strike-zone.onrender.com/celular`

Se o nome do serviço mudar no Render, trocar `strike-zone` pelo nome correto do serviço.

## Fluxo Obrigatório Para O Agente

1. Implementar a mudança pedida.
2. Rodar uma checagem básica local.
3. Criar commit.
4. Fazer `git push origin main`.
5. Avisar que o Render vai atualizar pelo auto-deploy.
6. Se possível, testar o link público depois do deploy.

## Observações

- O teste `http://192.168...:8080/celular` é só local e não serve para jogadores fora da rede.
- Para teste público, usar sempre o link `onrender.com`.
- Se o push falhar ou o Render não atualizar, avisar o motivo direto.
