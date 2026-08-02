# Sistema Financeiro da Igreja

Projeto React + Vite conectado ao Supabase.

## Estrutura

```text
Sistema-Financeiro-Igreja-React/
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest
├── src/
│   ├── components/
│   │   └── Ui.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── supabase/
│   └── schema.sql
├── index.html
├── package.json
├── vite.config.js
├── wrangler.jsonc
└── README.md
```

## Publicar pelo GitHub + Cloudflare

1. Extraia o ZIP.
2. Envie **todo o conteúdo da pasta extraída** para a raiz do repositório GitHub.
3. Confirme que `src` e `public` aparecem como pastas no GitHub.
4. No Cloudflare:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
5. Clique em Deploy.

O arquivo `wrangler.jsonc` já informa ao Cloudflare que os ativos ficam em `dist`.

## Login

Use o e-mail e a senha cadastrados em Supabase > Authentication > Users.

## Segurança

O frontend utiliza somente a Publishable Key do Supabase. Nunca coloque `service_role` ou `sb_secret_` no frontend.
