// index.mjs - Handler simplificado para a rota raiz
export default function handler(req, res) {
  try {
    // Log da requisição recebida
    console.log(`Requisição recebida: ${req.method} ${req.url}`);
    
    // Configurar headers corretos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // HTML simplificado para diagnóstico
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Um Chamado à Edificação</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      color: #333;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      padding: 2rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
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
      overflow: auto;
      max-height: 200px;
      white-space: pre;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Um Chamado à Edificação</h1>
    <p>Carregando aplicação...</p>
    <div>
      <a href="/api/healthcheck" class="button">Verificar API</a>
      <a href="/" class="button">Recarregar Página</a>
    </div>
    <div class="logs" id="logs">Verificando status do servidor...</div>
  </div>
  <div id="root"></div>
  
  <script>
    const logs = document.getElementById('logs');
    
    function addLog(message) {
      console.log(message);
      logs.textContent += "\n" + message;
      logs.scrollTop = logs.scrollHeight;
    }
    
    function checkApi() {
      addLog("Verificando API...");
      fetch('/api/healthcheck')
        .then(function(response) {
          if (response.ok) {
            return response.json();
          } else {
            addLog("Erro na API: " + response.status);
            throw new Error("Erro na API: " + response.status);
          }
        })
        .then(function(data) {
          addLog("API respondeu: " + JSON.stringify(data));
          
          if (data.status === 'ok') {
            addLog("API está funcionando!");
            loadApp();
          }
        })
        .catch(function(error) {
          addLog("Erro ao verificar API: " + (error.message || error));
        });
    }
    
    function loadApp() {
      addLog("Tentando carregar aplicação...");
      var scripts = [
        '/assets/index.js',
        '/assets/main.js'
      ];
      
      function tryNextScript(index) {
        if (index >= scripts.length) {
          addLog("Não foi possível carregar os assets da aplicação");
          return;
        }
        
        var src = scripts[index];
        addLog("Verificando: " + src);
        
        fetch(src)
          .then(function(response) {
            if (response.ok) {
              addLog("Encontrado: " + src);
              var script = document.createElement('script');
              script.type = 'module';
              script.src = src;
              script.onload = function() {
                addLog("Script carregado");
              };
              script.onerror = function() {
                addLog("Erro ao carregar script: " + src);
                tryNextScript(index + 1);
              };
              document.head.appendChild(script);
            } else {
              tryNextScript(index + 1);
            }
          })
          .catch(function() {
            addLog("Falha ao carregar " + src);
            tryNextScript(index + 1);
          });
      }
      
      tryNextScript(0);
    }
    
    // Iniciar verificação
    setTimeout(checkApi, 1000);
  </script>
</body>
</html>`;
    
    // Retorna o HTML simplificado
    return res.status(200).send(html);
    
  } catch (error) {
    console.error('Erro:', error);
    
    // Em caso de erro, retorna um HTML mínimo de erro
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Erro</title></head>
        <body>
          <h1>Erro no servidor</h1>
          <p>Ocorreu um erro ao processar a solicitação.</p>
          <p>Detalhes: ${error.message}</p>
        </body>
      </html>
    `);
  }
}