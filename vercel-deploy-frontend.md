# Guia de Deploy Frontend na Vercel

Este guia explica como fazer o deploy correto do seu projeto React na Vercel, garantindo que ele seja reconhecido como uma aplicação frontend e não como um backend Node.js.

## Passos para Deploy

### 1. Preparação do Repositório

Certifique-se de que seu repositório contém os arquivos de configuração atualizados:

- `vercel.json` - Define a configuração específica para a Vercel
- `vite.frontend.config.ts` - Configuração do Vite otimizada para frontend
- `vercel-build.js` - Script de build especializado para a Vercel
- `.vercelignore` - Lista de arquivos a serem ignorados no deploy

### 2. Fazer Deploy na Vercel

Há duas maneiras de fazer o deploy:

#### A) Via Interface Web da Vercel

1. Faça login na [Vercel](https://vercel.com)
2. Clique em "Add New" > "Project"
3. Importe o seu repositório Git
4. Na página de configuração:
   - **Framework Preset:** Selecione "Vite" ou "Other"
   - **Build Command:** Deixe o padrão (será substituído pelo vercel.json)
   - **Output Directory:** Deixe o padrão (será substituído pelo vercel.json)
   - **Environment Variables:** Configure as variáveis de ambiente necessárias:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
5. Clique em "Deploy"

#### B) Via Vercel CLI

1. Instale a CLI da Vercel: `npm i -g vercel`
2. Execute `vercel login` e siga as instruções
3. Na raiz do projeto, execute `vercel`
4. Responda às perguntas conforme necessário
5. Para fazer deploy de produção, use `vercel --prod`

### 3. Verificar o Deploy

Após o deploy, a Vercel fornecerá uma URL para acessar sua aplicação. Verifique se:

- A página inicial carrega corretamente
- A navegação entre páginas funciona
- As APIs estão respondendo como esperado

### 4. Solução de Problemas

Se enfrentar problemas:

1. **Exibição do código-fonte em vez da aplicação:**
   - Verifique se o arquivo `index.html` está na raiz da pasta de build (`dist`)
   - Confirme que as regras de rewrite estão corretas no `vercel.json`

2. **Falha no build:**
   - Verifique os logs de build na interface da Vercel
   - Execute o build localmente usando `node vercel-build.js` para depurar

3. **APIs não funcionam:**
   - Verifique se as variáveis de ambiente estão configuradas
   - Confirme que a configuração de API routes no `vercel.json` está correta

## Lembrete sobre Variáveis de Ambiente

Para APIs funcionarem corretamente, adicione estas variáveis de ambiente na Vercel:

- `VITE_SUPABASE_URL` - URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase