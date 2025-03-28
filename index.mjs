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
    // Configurar headers corretos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Tenta carregar o arquivo index.html gerado pelo build do Vite
    try {
      // Tentar ler o arquivo index.html do diretório atual
      const indexPath = join(__dirname, 'index.html');
      const htmlContent = readFileSync(indexPath, 'utf8');
      return res.status(200).send(htmlContent);
    } catch (readError) {
      console.error('Erro ao ler arquivo index.html:', readError);
      
      // Tenta ler a página de fallback
      try {
        const fallbackPath = join(__dirname, 'fallback.html');
        const fallbackContent = readFileSync(fallbackPath, 'utf8');
        return res.status(200).send(fallbackContent);
      } catch (fallbackError) {
        console.error('Erro ao ler fallback.html:', fallbackError);
        
        // Se não conseguir ler nenhum dos arquivos, envia o HTML de fallback incorporado
        return res.status(200).send(fallbackHTML);
      }
    }
  } catch (error) {
    console.error('Erro no handler:', error);
    
    // Em caso de erro, retorna o HTML de fallback incorporado
    return res.status(500).send(fallbackHTML);
  }
}