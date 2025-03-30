# Instruções para Deploy no Vercel

## Configuração Necessária

Antes de fazer o deploy da aplicação no Vercel, certifique-se de configurar as seguintes variáveis de ambiente:

### Variáveis de Ambiente Obrigatórias
- `NODE_ENV`: Defina como `production`
- `STORAGE_TYPE`: Defina como `supabase`
- `SUPABASE_URL`: URL da sua instância do Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase
- `VITE_SUPABASE_URL`: Mesma URL do Supabase (para o frontend)
- `VITE_SUPABASE_ANON_KEY`: Mesma chave anônima do Supabase (para o frontend)

## Configuração do Projeto Vercel

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Framework Preset**: Other
4. **Configurações do Runtime**:
   - Clique em "Advanced" e certifique-se de que o "Node.js Version" esteja configurado para 18.x

## Correção do Erro "require is not defined"

Se você estiver enfrentando este erro no Vercel, siga estes passos:

1. Verifique a versão do Node.js no seu projeto Vercel (deve ser 18.x ou superior)
2. Em "Settings" > "General" do seu projeto no Vercel:
   - Ative a opção "Include source files outside of the root directory"
   - Configure "Root Directory" para deixar vazio (raiz do projeto)

3. Em "Settings" > "Functions" do seu projeto no Vercel:
   - Defina "Node.js Version" para 18.x
   - Ative a opção "Include additional dependency files"

4. Adicione regras no vercel.json para resolver o problema:
```json
"functions": {
  "api/*.mjs": {
    "memory": 1024,
    "maxDuration": 10,
    "runtime": "nodejs18.x"
  },
  "*.mjs": {
    "memory": 1024,
    "maxDuration": 10,
    "runtime": "nodejs18.x"
  }
}
```

5. **IMPORTANTE**: No Vercel, você não pode usar `routes` e `rewrites` juntos. Use apenas `rewrites` e `fallback`:
```json
"rewrites": [
  { "source": "/api/healthcheck", "destination": "/api/healthcheck.mjs" },
  { "source": "/api/:path*", "destination": "/api/index.mjs" },
  { "source": "/static/:path*", "destination": "/static/:path*" },
  { "source": "/(.*)", "destination": "/$1" }
],
"fallback": {
  "404": "/static/index.html"
}
```

## Estrutura de Arquivos para Deploy

A estrutura de arquivos esperada após o build:

```
dist/
├── assets/ (arquivos estáticos do frontend)
├── api/
│   ├── index.mjs (funções serverless para API)
│   ├── healthcheck.mjs (verificação de status)
│   └── package.json (dependências para as funções serverless - com "type": "module")
├── static/ (arquivos estáticos de fallback)
│   └── index.html (página de fallback)
├── index.html (página principal)
├── fallback.html (cópia da página de fallback)
├── index.mjs (handler principal para a raiz)
└── vercel.json (configuração para o Vercel)
```

## Solução para Problemas Comuns

### Erro "require is not defined"
Este erro ocorre quando há conflito entre ESM e CommonJS no ambiente serverless do Vercel. Para corrigir:

1. **Verificar package.json**: Certifique-se que em `api/package.json` existe:
   ```json
   {
     "type": "module",
     "engines": {
       "node": ">=18.x"
     }
   }
   ```

2. **Use apenas importações ESM**: Em todos os arquivos `.mjs`:
   - Use apenas `import` (nunca `require()`)
   - Use `import { readFileSync } from 'fs'` em vez de `const fs = require('fs')`
   - Certifique-se que quaisquer bibliotecas importadas são compatíveis com ESM

3. **Remova o projeto e faça deploy novamente**: Às vezes, é necessário remover completamente o projeto do Vercel e criar um novo deploy.

### Erro com as Páginas do Frontend

Se o frontend não estiver carregando corretamente, verifique:

1. **Redirecionamento para API**: Certifique-se que o Vercel não está servindo a API quando deveria servir o frontend.
   - Verifique a configuração `"rewrites"` no vercel.json
   - A ordem dos redirecionamentos importa!

2. **Páginas de fallback**: Se o frontend ainda não estiver carregando:
   - Acesse `/static/index.html` para verificar se a página de fallback está funcionando
   - Acesse `/api/healthcheck` para verificar se a API está respondendo

3. **Logs no Vercel**: Verifique os logs de função no painel do Vercel para identificar erros específicos.

### Problemas com CORS

Se sua API estiver funcionando mas o frontend não conseguir acessá-la devido a erros de CORS:

1. **Headers no vercel.json**: Certifique-se que os headers estão configurados corretamente:
   ```json
   "headers": [
     {
       "source": "/(.*)",
       "headers": [
         { "key": "Access-Control-Allow-Origin", "value": "*" },
         { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
         { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
       ]
     }
   ]
   ```

2. **Cabeçalhos na API**: Verifique se cada handler de API também está configurando os cabeçalhos CORS corretamente.

3. **Preflight Requests**: Certifique-se que sua API responde adequadamente a requisições OPTIONS.