# Diagnóstico de Problemas de Deploy no Vercel

## Problema: Exibição do Código-Fonte em vez da Aplicação Renderizada

Se ao acessar a aplicação no Vercel você visualiza o código-fonte (HTML, JavaScript) em vez da aplicação renderizada, isso indica um problema na configuração do servidor de arquivos estáticos.

### Causas Comuns

1. **Configuração Incorreta no vercel.json**
   - A propriedade `rewrites` ou `routes` não está direcionando corretamente para o arquivo index.html
   - Conflito entre diferentes regras de roteamento

2. **Headers HTTP Incorretos**
   - Content-Type incorreto sendo definido para arquivos HTML (deve ser text/html)
   - Headers conflitantes que afetam como o navegador interpreta os arquivos

3. **Estrutura de Diretórios Inválida**
   - Os arquivos estáticos não estão no diretório correto após o build
   - O build não está gerando a estrutura de arquivos esperada pelo Vercel

### Soluções Implementadas

1. **Revisão da Configuração do vercel.json**
   - Simplificado regras de roteamento para reduzir conflitos
   - Adicionado configuração `public: true` para servir arquivos estáticos
   - Ajustado caminho do frontend para `/public/index.html`

2. **Melhor Separação entre API e Frontend**
   - Regras de API claramente separadas do frontend
   - Adicionado fallback para filesystem antes de redirecionar para index.html

3. **Arquivos de Diagnóstico**
   - Adicionado arquivo `static-index.html` para testar entrega de conteúdo estático
   - Implementado verificação via `/api/healthcheck` para validar ambiente

### Como Testar

1. Após o deploy, acesse o endpoint `/static-index.html`
   - Se esta página for exibida corretamente como HTML renderizado, o servidor de arquivos estáticos está funcionando
   - Se ainda mostrar código-fonte, o problema está nos headers HTTP ou configuração básica do servidor

2. Acesse `/api/healthcheck`
   - Se retornar um JSON válido, a API está funcionando corretamente
   - Se retornar erro ou mostrar código-fonte, verifique a configuração das funções serverless

3. Verifique os logs de função no painel do Vercel
   - Busque por erros relacionados ao Content-Type ou roteamento
   - Verifique se há erros de permissão ou acesso a arquivos

### Próximos Passos em Caso de Persistência

Se o problema persistir mesmo após as correções implementadas:

1. Tente uma configuração mais simples do vercel.json, removendo regras complexas
2. Verifique se o processo de build está gerando corretamente o diretório `dist/public`
3. Considere adicionar um script de pós-build que valide a estrutura de arquivos gerada
4. Utilize o recurso de Preview Deployments do Vercel para testar mudanças antes de fazer deploy para produção