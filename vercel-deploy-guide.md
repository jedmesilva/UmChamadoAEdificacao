# Guia de Implantação no Vercel

Este documento fornece instruções para implantar corretamente a aplicação React no Vercel.

## Preparação do Projeto

Antes de implantar, execute o script de preparação para garantir que a estrutura do projeto esteja correta:

```bash
node prepare-build.js
```

Este script irá:
1. Verificar e sincronizar os arquivos da pasta `client/src` para a pasta `src` na raiz
2. Verificar a presença do arquivo `index.html` na raiz
3. Validar a configuração do Vite e o arquivo `package.json`

## Estrutura de Arquivos Correta

A estrutura correta para implantação no Vercel com Vite deve ser:

```
.
├── api/                       # Funções serverless API
│   ├── healthcheck.js
│   └── index.js
├── src/                       # Código-fonte React
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html                 # Arquivo HTML principal na raiz
├── vercel.json                # Configuração do Vercel
├── vite.config.ts             # Configuração do Vite
└── package.json               # Dependências e scripts
```

## Configuração do Vercel

O arquivo `vercel.json` está configurado para:

1. Reconhecer este projeto como uma aplicação Vite
2. Servir corretamente os arquivos estáticos
3. Rotear solicitações para a API adequadamente
4. Gerenciar o client-side routing do React

## Passos para Implantação

1. Certifique-se de que seu repositório esteja no GitHub
2. No Vercel Dashboard, clique em "New Project"
3. Importe o repositório do GitHub
4. Na configuração do projeto:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Variáveis de ambiente: Configure as variáveis necessárias para o Supabase:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

5. Clique em "Deploy"

## Solução de Problemas

Se você encontrar problemas durante a implantação:

1. **Arquivo index.html não encontrado**: Certifique-se de que o arquivo `index.html` está na raiz do projeto
2. **Erro de build**: Verifique os logs de build para identificar o problema
3. **Arquivos estáticos não encontrados**: Verifique se a estrutura do projeto está seguindo o padrão descrito acima
4. **Erros com a API**: Verifique se as funções serverless na pasta `/api` estão configuradas corretamente

## Verificação Pós-Implantação

Depois que a implantação for concluída, verifique:

1. Acesse a URL do site implantado
2. Teste as APIs através dos endpoints `/api/healthcheck` e `/api/supabase-status`
3. Verifique se as variáveis de ambiente foram corretamente injetadas no cliente