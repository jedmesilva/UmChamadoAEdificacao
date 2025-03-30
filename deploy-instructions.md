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

4. **IMPORTANTE**: Para o deploy no Vercel, não use a propriedade `functions` no vercel.json, pois ela está causando problemas com a versão atual do Vercel CLI. Em vez disso, defina a versão do Node.js via configurações do projeto no painel do Vercel:

5. **IMPORTANTE**: No Vercel, você não pode usar `routes` e `rewrites` juntos e a propriedade `fallback` também não é suportada. Use as propriedades corretas para configurar o Vercel:

```json
"rewrites": [
  { "source": "/api/healthcheck", "destination": "/api/healthcheck.mjs" },
  { "source": "/api/:path*", "destination": "/api/index.mjs" },
  { "source": "/static/:path*", "destination": "/static/:path*" },
  { "source": "/", "destination": "/index.html" },
  { "source": "/(.*)", "destination": "/$1" },
  { "source": "/(.*)", "destination": "/index.html" }
],
"cleanUrls": true,
"trailingSlash": false,
"builds": [
  { "src": "api/*.mjs", "use": "@vercel/node" },
  { "src": "index.mjs", "use": "@vercel/node" },
  { "src": "public/**/*", "use": "@vercel/static" },
  { "src": "*.html", "use": "@vercel/static" },
  { "src": "assets/**/*", "use": "@vercel/static" }
]
```

Importante: 
- A ordem das regras de rewrite é crucial. A última regra só será aplicada se nenhuma das anteriores corresponder.
- A propriedade `builds` especifica como cada tipo de arquivo deve ser tratado pelo Vercel.
- Arquivos `.mjs` são tratados como funções serverless Node.js.
- Arquivos estáticos como HTML, CSS, JS e imagens são tratados como ativos estáticos.

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

### Erro "Function Runtimes must have a valid version"

Este erro ocorre quando tentamos usar a propriedade `functions` no vercel.json. A partir das versões mais recentes do Vercel CLI, essa propriedade pode causar problemas.

**Solução:**
1. Remova completamente a seção `functions` do vercel.json
2. Configure a versão do Node.js diretamente no painel do Vercel em "Settings" > "General" > "Node.js Version"
3. Se necessário, use o arquivo `.nvmrc` ou `.node-version` na raiz do projeto para especificar a versão do Node.js

### Erro com as Páginas do Frontend

Se o frontend não estiver carregando corretamente, verifique:

1. **Redirecionamento para API**: Certifique-se que o Vercel não está servindo a API quando deveria servir o frontend.
   - Verifique a configuração `"rewrites"` no vercel.json
   - A ordem dos redirecionamentos importa!

2. **Páginas de fallback**: Se o frontend ainda não estiver carregando:
   - Acesse `/static/index.html` para verificar se a página de fallback está funcionando
   - Acesse `/api/healthcheck` para verificar se a API está respondendo

3. **Logs no Vercel**: Verifique os logs de função no painel do Vercel para identificar erros específicos.

### Problema: Código-fonte é mostrado em vez da aplicação

Se o Vercel estiver mostrando o código-fonte dos arquivos JavaScript em vez de executar a aplicação, isso indica que o servidor está tratando os arquivos como estáticos em vez de executá-los.

**Solução:**
1. Certifique-se de que a configuração `builds` está correta no vercel.json:
```json
"builds": [
  { "src": "api/*.mjs", "use": "@vercel/node" },
  { "src": "index.mjs", "use": "@vercel/node" },
  { "src": "public/**/*", "use": "@vercel/static" },
  { "src": "*.html", "use": "@vercel/static" },
  { "src": "assets/**/*", "use": "@vercel/static" }
]
```

2. Verifique se o index.html está sendo servido corretamente:
```json
"rewrites": [
  { "source": "/", "destination": "/index.html" },
  ...
]
```

3. Se o problema persistir, tente criar um arquivo `.vercel/output/config.json` personalizado durante o build para definir as rotas com mais precisão.

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