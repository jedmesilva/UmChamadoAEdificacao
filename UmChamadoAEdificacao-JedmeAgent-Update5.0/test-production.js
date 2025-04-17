const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configurações
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Verificar se o diretório dist existe
if (!fs.existsSync(DIST_DIR)) {
  log(`Diretório ${DIST_DIR} não encontrado. Execute npm run build primeiro.`, colors.red);
  process.exit(1);
}

// Injetar variáveis de ambiente no HTML se necessário
function injectEnvVars(htmlContent) {
  // Verificar se o script de injeção de ENV já existe
  if (htmlContent.includes('window.ENV = {')) {
    log('Variáveis de ambiente já injetadas no HTML', colors.green);
    return htmlContent;
  }

  log('Injetando variáveis de ambiente no HTML...', colors.yellow);
  
  // Criar script para injetar ENV
  const envScript = `<script>
  // Variáveis de ambiente para Supabase
  window.ENV = {
    VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
    VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
  };
  console.log("ENV carregado:", window.ENV);
</script>`;

  // Inserir antes do fechamento do head
  return htmlContent.replace('</head>', `${envScript}\n</head>`);
}

// Criar servidor HTTP para servir os arquivos estáticos
const server = http.createServer((req, res) => {
  // Normalizar URL
  let url = req.url;
  
  if (url === '/') {
    url = '/index.html';
  }
  
  // Lidar com API
  if (url.startsWith('/api/')) {
    // Verificar se é um endpoint conhecido
    const apiPath = url.substring(5);
    
    if (apiPath === 'healthcheck' || apiPath === 'status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'production',
        url: url
      }));
    }
    
    // Se não for um endpoint conhecido, retornar 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
  }
  
  // Caminho do arquivo
  const filePath = path.join(DIST_DIR, url);
  
  // Obter extensão para determinar o tipo de conteúdo
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  }[extname] || 'application/octet-stream';
  
  // Verificar se o arquivo existe
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Se for uma requisição HTML para uma rota desconhecida, servir index.html
        // Este comportamento simula o rewrite do Vercel para SPA
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
          fs.readFile(path.join(DIST_DIR, 'index.html'), (err, indexContent) => {
            if (err) {
              res.writeHead(500);
              res.end('Erro interno do servidor');
              return;
            }
            
            // Injetar variáveis de ambiente se necessário
            const processedContent = injectEnvVars(indexContent.toString());
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedContent, 'utf-8');
          });
          return;
        }
        
        // Não encontrado
        res.writeHead(404);
        res.end('Não encontrado: ' + filePath);
      } else {
        // Erro do servidor
        res.writeHead(500);
        res.end('Erro: ' + error.code);
      }
      return;
    }
    
    // Sucesso
    let processedContent = content;
    
    // Para arquivos HTML, injetar variáveis de ambiente se necessário
    if (contentType === 'text/html') {
      processedContent = injectEnvVars(content.toString());
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(processedContent, 'utf-8');
  });
});

server.listen(PORT, () => {
  log(`Servidor rodando em: http://localhost:${PORT}`, colors.green);
  log(`Modo: Produção (servindo arquivos estáticos da pasta dist)`, colors.cyan);
  
  // Abrir automaticamente o navegador no Linux
  exec(`xdg-open http://localhost:${PORT}`);
});

// Exibir informações sobre o processo
log(`ID do Processo: ${process.pid}`, colors.gray);
log(`Para encerrar o servidor, pressione Ctrl+C\n`, colors.gray);