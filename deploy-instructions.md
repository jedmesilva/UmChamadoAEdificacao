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

## Estrutura de Arquivos para Deploy

A estrutura de arquivos esperada após o build:

```
dist/
├── assets/ (arquivos estáticos do frontend)
├── api/
│   ├── index.mjs (funções serverless para API)
│   ├── healthcheck.mjs (verificação de status)
│   └── package.json (dependências para as funções serverless)
├── index.html (página principal)
├── index.mjs (handler principal para a raiz)
└── vercel.json (configuração para o Vercel)
```

## Solução para Problemas Comuns

### Erro "require is not defined"
Este erro ocorre quando há conflito entre ESM e CommonJS. Certifique-se de que:
- Todos os arquivos `.mjs` usam apenas sintaxe ESM (imports/exports)
- Não misture `require()` com `import`
- No arquivo vercel.json, a configuração de `rewrites` está correta

### Erro com o NODE_ENV
Se a aplicação estiver retornando código-fonte em vez da interface, verifique:
- A variável NODE_ENV está definida corretamente como "production"
- O build foi concluído corretamente
- A estrutura de arquivos na pasta `dist` está conforme esperado

### Problemas com CORS
Para resolver problemas de CORS, verifique:
- Os cabeçalhos na seção `headers` do arquivo vercel.json
- As funções serverless estão configurando os cabeçalhos CORS corretamente