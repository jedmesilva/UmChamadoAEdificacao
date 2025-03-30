// index.mjs - Handler principal para a rota raiz no formato ESM puro
// Este arquivo foi projetado especificamente para funcionar no ambiente serverless do Vercel

// Importações são feitas apenas com sintaxe ESM, evitando 'require'
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Função de utilidade para obter o caminho do arquivo atual em ESM
// (substitui __dirname que não está disponível em ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// HTML de fallback caso não consiga ler o arquivo estático
const fallbackHTML = `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Um Chamado à Edificação</title>
    <style>
      :root {
        --primary: #4a6cf7;
        --primary-hover: #3a5cf7;
        --background: #f5f7fa;
        --card-bg: #ffffff;
        --text: #333333;
        --text-secondary: #666666;
        --border-radius: 8px;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: linear-gradient(135deg, var(--background) 0%, #c3cfe2 100%);
        color: var(--text);
        line-height: 1.6;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      
      .container {
        max-width: 800px;
        width: 100%;
        padding: 2rem;
        background-color: var(--card-bg);
        border-radius: var(--border-radius);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        text-align: center;
      }
      
      h1 {
        color: var(--text);
        margin-bottom: 1rem;
        font-size: 2rem;
      }
      
      p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
      }
      
      .button {
        display: inline-block;
        background-color: var(--primary);
        color: white;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        text-decoration: none;
        transition: background-color 0.3s ease;
        font-weight: 500;
        margin: 0.5rem;
      }
      
      .button:hover {
        background-color: var(--primary-hover);
      }
      
      .status-container {
        margin-top: 2rem;
        padding: 1rem;
        border-radius: var(--border-radius);
        background-color: rgba(0, 0, 0, 0.05);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Um Chamado à Edificação</h1>
      <p>Bem-vindo à nossa plataforma dedicada ao crescimento espiritual e à edificação pessoal.</p>
      
      <div>
        <a href="/api/healthcheck" class="button">Verificar Status da API</a>
        <a href="/" class="button">Ir para Página Principal</a>
      </div>
      
      <div class="status-container">
        <p>O servidor está ativo e disponível para atendê-lo.</p>
        <p>Se você encontrar algum problema, por favor, recarregue a página ou tente novamente em alguns instantes.</p>
      </div>
    </div>
    
    <script>
      // Verificar status da API automaticamente
      async function checkApiStatus() {
        try {
          const response = await fetch('/api/healthcheck');
          const data = await response.json();
          
          if (data.status === 'ok') {
            console.log('API está funcionando corretamente!');
            // Tentar redirecionar para a página principal após 2 segundos
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          }
        } catch (error) {
          console.error('Erro ao verificar status da API:', error);
        }
      }
      
      // Executar verificação após 1 segundo
      setTimeout(checkApiStatus, 1000);
    </script>
  </body>
</html>
`;

/**
 * Handler principal para a função serverless do Vercel
 */
export default function handler(req, res) {
  try {
    // Log da requisição recebida
    console.log(`[Handler] Requisição recebida: ${req.method} ${req.url}`);
    
    // Configurar headers corretos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Se for uma requisição para assets, permitir que passe pelo sistema de roteamento normal
    if (req.url.startsWith('/assets/')) {
      console.log('[Handler] Requisição para assets, deixando passar para o sistema de roteamento padrão');
      return res.status(404).send('Not found via serverless function');
    }

    // HTML funcional padrão caso nada funcione
    const simpleHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Um Chamado à Edificação</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      color: #333;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .container {
      max-width: 800px;
      padding: 2rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      margin-bottom: 20px;
    }
    #root {
      width: 100%;
      max-width: 1200px;
    }
    .button {
      display: inline-block;
      background-color: #4a6cf7;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      text-decoration: none;
      transition: background-color 0.3s ease;
      font-weight: 500;
      margin: 0.5rem;
      cursor: pointer;
    }
    .button:hover {
      background-color: #3a5cf7;
    }
    .logs {
      background-color: #f1f1f1;
      border-radius: 4px;
      padding: 10px;
      margin-top: 20px;
      text-align: left;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
      overflow: auto;
      max-height: 200px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Um Chamado à Edificação</h1>
    <p>Carregando aplicação...</p>
    <div>
      <button class="button" id="loadApp">Tentar Carregar Aplicação</button>
      <button class="button" id="checkApi">Verificar API</button>
    </div>
    <div class="logs" id="logs">Logs do carregamento:</div>
  </div>
  
  <div id="root"></div>

  <script>
    const logElement = document.getElementById('logs');
    
    function log(message) {
      console.log(message);
      const time = new Date().toLocaleTimeString();
      logElement.innerHTML += `\n[${time}] ${message}`;
      logElement.scrollTop = logElement.scrollHeight;
    }
    
    document.getElementById('loadApp').addEventListener('click', tryLoadMainApp);
    document.getElementById('checkApi').addEventListener('click', checkApiStatus);
    
    async function checkApiStatus() {
      log('Verificando status da API...');
      try {
        const response = await fetch('/api/healthcheck');
        const data = await response.json();
        log(`API respondeu: ${JSON.stringify(data)}`);
        
        if (data && data.status === 'ok') {
          log('API está funcionando corretamente!');
          tryLoadMainApp();
        }
      } catch (error) {
        log(`Erro ao verificar API: ${error.message}`);
      }
    }
    
    async function tryLoadMainApp() {
      log('Tentando carregar a aplicação principal...');
      
      try {
        // Verificar se os assets principais estão disponíveis
        const foundAssets = [];
        
        // Tentar carregar o script principal - diferentes variações de nome
        const possibleScripts = [
          '/assets/index.js',
          '/assets/index-*.js',
          '/assets/main.js',
          '/assets/app.js',
          '/client/dist/assets/index-*.js',
          '/client/assets/index-*.js'
        ];
        
        for (const scriptPattern of possibleScripts) {
          try {
            // Se for um padrão com wildcard, tentar fazer uma listagem
            if (scriptPattern.includes('*')) {
              log(`Tentando encontrar arquivos com padrão ${scriptPattern}...`);
              const baseUrl = scriptPattern.split('*')[0];
              
              try {
                // Fazer uma solicitação para ver se a página existe
                const dirResponse = await fetch(baseUrl);
                log(`Resposta da solicitação para ${baseUrl}: ${dirResponse.status}`);
                
                if (dirResponse.ok) {
                  foundAssets.push(baseUrl);
                }
              } catch (e) {
                log(`Erro ao verificar ${baseUrl}: ${e.message}`);
              }
            } else {
              // Tentar carregar o arquivo diretamente
              log(`Verificando se o script ${scriptPattern} existe...`);
              const response = await fetch(scriptPattern);
              
              if (response.ok) {
                log(`Script ${scriptPattern} encontrado!`);
                foundAssets.push(scriptPattern);
                break;
              }
            }
          } catch (e) {
            log(`Erro ao verificar script ${scriptPattern}: ${e.message}`);
          }
        }
        
        if (foundAssets.length > 0) {
          log(`Assets encontrados: ${foundAssets.join(', ')}`);
          
          // Criar o elemento script para o primeiro asset encontrado
          const script = document.createElement('script');
          script.type = 'module';
          script.src = foundAssets[0];
          script.onerror = (e) => log(`Erro ao carregar script: ${e.message || 'Erro desconhecido'}`);
          script.onload = () => log('Script carregado com sucesso!');
          document.head.appendChild(script);
          
          log('Script adicionado à página. Aguardando carregamento...');
        } else {
          log('Nenhum asset encontrado. Verifique se o build foi gerado corretamente.');
        }
      } catch (error) {
        log(`Erro ao carregar aplicação: ${error.message}`);
      }
    }
    
    // Executar verificação automaticamente
    log('Página carregada, verificando API em 1 segundo...');
    setTimeout(checkApiStatus, 1000);
  </script>
</body>
</html>
`;
    
    // Retorna o HTML simplificado que serve como loader inteligente
    console.log('[Handler] Enviando HTML simplificado com carregador inteligente');
    return res.status(200).send(simpleHtml);
    
  } catch (error) {
    console.error('[Handler] Erro no handler principal:', error);
    
    // Em caso de erro crítico, retorna o HTML de fallback incorporado
    return res.status(500).send(fallbackHTML);
  }
}