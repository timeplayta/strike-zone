# APK do Strike Zone

Este APK abre o jogo online em `https://strike-zone.onrender.com`.

Por que assim?

- O jogo usa servidor para login, conta, loja e Stripe.
- Um APK offline puro quebraria essas partes.
- O app Android funciona como um aplicativo WebView/TWA apontando para o servidor online.

## Como gerar pelo GitHub

1. Faça push para a branch `main`.
2. Abra o repositório no GitHub.
3. Vá em **Actions**.
4. Abra o workflow **Build Android APK**.
5. Quando terminar, baixe o artifact **strike-zone-debug-apk**.
6. Dentro dele estará o arquivo `app-debug.apk`.

## Como gerar localmente

Este PC precisa ter Java 21 e Android SDK instalados.

Depois disso, rode:

```bash
npm run apk:sync
npm run apk:debug
```

O APK ficará em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Observação: APK é para Android. No PC, ele abre via emulador Android. Para jogar direto no PC, use o navegador ou `JOGAR.bat`.
