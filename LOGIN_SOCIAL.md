# Login social

O jogo agora tem botões para entrar com:

- VK
- Google
- Twitter/X

Os botões só ficam ativos quando as credenciais OAuth estão configuradas no Render.

## Variáveis no Render

Configure em **Render > Strike Zone > Environment**:

```text
PUBLIC_BASE_URL=https://strike-zone.onrender.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VK_CLIENT_ID=
VK_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
```

## URLs de callback

Use exatamente essas URLs nas plataformas:

```text
Google:
https://strike-zone.onrender.com/api/oauth/callback/google

VK:
https://strike-zone.onrender.com/api/oauth/callback/vk

Twitter/X:
https://strike-zone.onrender.com/api/oauth/callback/twitter
```

## Observação

Google costuma retornar email automaticamente.
Twitter/X normalmente não retorna email, então o jogo cria um email interno só para manter a conta salva.
