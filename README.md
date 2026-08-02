# Gestão Financeira para Igrejas — React + Supabase

## Publicação no Cloudflare Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste projeto para a raiz do repositório.
3. No Cloudflare, vá em **Workers & Pages > Create application > Pages > Connect to Git**.
4. Selecione o repositório.
5. Configure:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
6. Clique em Deploy.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Banco de dados

O projeto usa o Supabase já configurado no arquivo:

`src/supabase.js`

A chave utilizada é a Publishable Key. Não inclua `service_role` nem `sb_secret_` no frontend.
