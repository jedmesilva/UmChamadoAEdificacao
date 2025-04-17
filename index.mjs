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
      
      // Lista expandida de possíveis caminhos de assets
      var scripts = [
        // Verificar arquivos com padrão de hash no nome (padrão de build do Vite)
        '/assets/index-*.js',
        '/assets/main-*.js',
        '/client/dist/assets/index-*.js',
        '/client/dist/assets/main-*.js',
        // Possíveis localizações diretas
        '/assets/index.js',
        '/assets/main.js',
        '/client/dist/assets/index.js',
        '/client/assets/index.js',
        '/dist/assets/index.js',
        '/dist/client/assets/index.js'
      ];
      
      // Tentativa adicional para localizar arquivos com padrão de hash no nome
      function scanForAssets() {
        addLog("Escaneando possíveis assets...");
        
        // Lista de diretórios para verificar
        var directories = [
          '/assets',
          '/dist/assets',
          '/client/dist/assets',
          '/dist/client/assets'
        ];
        
        // Verificar cada diretório
        function checkDirectory(index) {
          if (index >= directories.length) {
            addLog("Nenhum diretório de assets encontrado. Iniciando carregamento direto...");
            tryNextScript(0);
            return;
          }
          
          var dir = directories[index];
          addLog("Verificando diretório: " + dir);
          
          fetch(dir)
            .then(function(response) {
              if (response.ok) {
                addLog("Diretório encontrado: " + dir);
                // Se for possível encontrar assets deste diretório, adicionamos à lista
                scripts.unshift(dir + '/index.js');
                scripts.unshift(dir + '/main.js');
              }
              // Passar para o próximo diretório
              checkDirectory(index + 1);
            })
            .catch(function() {
              // Diretório não encontrado, passar para o próximo
              checkDirectory(index + 1);
            });
        }
        
        // Iniciar verificação de diretórios
        checkDirectory(0);
      }
      
      // Função especial para lidar com padrões de arquivo com wildcard
      function tryWildcardScript(pattern) {
        // Se o padrão contiver '*', extrair o diretório base e verificar
        if (pattern.indexOf('*') !== -1) {
          var baseDir = pattern.substring(0, pattern.lastIndexOf('/'));
          var filePrefix = pattern.substring(pattern.lastIndexOf('/') + 1, pattern.indexOf('*'));
          var fileSuffix = pattern.substring(pattern.indexOf('*') + 1);
          
          addLog("Verificando diretório " + baseDir + " por arquivos que começam com " + filePrefix);
          
          // Tentar fazer request para o diretório para ver se está disponível
          return fetch(baseDir)
            .then(function() {
              // O diretório existe, agora precisamos uma maneira de descobrir os arquivos
              // No ambiente serverless não é possível listar diretórios, então vamos tentar
              // adivinhar baseado no padrão comum de nomes do Vite (index-[hash].js)
              
              // Tentativa 1: Verificar possíveis arquivos hash mais comuns
              var possibleHashes = ['abc123', 'def456', 'main', 'app', 'bundle', 'client'];
              
              // Criar promessas para todos os possíveis nomes de arquivo
              var fetchPromises = possibleHashes.map(function(hash) {
                var testFile = baseDir + '/' + filePrefix + hash + fileSuffix;
                return fetch(testFile)
                  .then(function(response) {
                    if (response.ok) {
                      addLog("Asset encontrado: " + testFile);
                      return testFile;
                    }
                    return null;
                  })
                  .catch(function() {
                    return null;
                  });
              });
              
              // Verificar resultados de todas as requisições
              return Promise.all(fetchPromises)
                .then(function(results) {
                  // Filtrar resultados para obter apenas os arquivos válidos
                  var foundFiles = results.filter(function(file) { return file !== null; });
                  return foundFiles.length > 0 ? foundFiles[0] : null;
                });
            })
            .catch(function() {
              addLog("Diretório " + baseDir + " não encontrado");
              return null;
            });
        } else {
          // Para arquivos sem wildcard, verificar diretamente
          return fetch(pattern)
            .then(function(response) {
              return response.ok ? pattern : null;
            })
            .catch(function() {
              return null;
            });
        }
      }
      
      // Função para tentar carregar scripts da lista
      function tryNextScript(index) {
        if (index >= scripts.length) {
          addLog("Não foi possível carregar os assets da aplicação");
          addLog("Tentando carregar a aplicação de cliente diretamente...");
          tryLoadClientIndex();
          return;
        }
        
        var src = scripts[index];
        addLog("Verificando: " + src);
        
        tryWildcardScript(src)
          .then(function(foundSrc) {
            if (foundSrc) {
              addLog("Encontrado: " + foundSrc);
              // Verificar se há CSS correspondente
              var cssPath = foundSrc.replace('.js', '.css');
              tryLoadCSS(cssPath);
              
              // Carregar o script
              var script = document.createElement('script');
              script.type = 'module';
              script.src = foundSrc;
              script.onload = function() {
                addLog("Script carregado com sucesso!");
              };
              script.onerror = function() {
                addLog("Erro ao carregar script: " + foundSrc);
                tryNextScript(index + 1);
              };
              document.head.appendChild(script);
            } else {
              tryNextScript(index + 1);
            }
          })
          .catch(function(error) {
            addLog("Falha ao verificar " + src + ": " + (error.message || "Erro desconhecido"));
            tryNextScript(index + 1);
          });
      }
      
      // Tentar carregar CSS associado
      function tryLoadCSS(cssPath) {
        fetch(cssPath)
          .then(function(response) {
            if (response.ok) {
              addLog("CSS encontrado: " + cssPath);
              var link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = cssPath;
              document.head.appendChild(link);
            }
          })
          .catch(function() {
            // Ignorar erro de CSS
          });
      }
      
      // Caso especial: tentar carregar o HTML do cliente diretamente
      function tryLoadClientIndex() {
        addLog("Tentando carregar index.html do cliente...");
        
        fetch('/client/index.html')
          .then(function(response) {
            if (response.ok) {
              return response.text();
            }
            throw new Error("Client index.html não encontrado");
          })
          .then(function(html) {
            addLog("index.html do cliente encontrado, extraindo scripts...");
            
            // Extrair script src do HTML
            var scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
            var match;
            var foundScripts = [];
            
            while ((match = scriptRegex.exec(html)) !== null) {
              foundScripts.push(match[1]);
            }
            
            if (foundScripts.length > 0) {
              addLog("Scripts encontrados: " + foundScripts.join(', '));
              
              // Adicionar scripts encontrados à nossa lista
              scripts = foundScripts.concat(scripts);
              tryNextScript(0);
            } else {
              addLog("Nenhum script encontrado no index.html do cliente");
            }
          })
          .catch(function(error) {
            addLog("Erro ao carregar index.html do cliente: " + error.message);
          });
      }
      
      // Iniciar o processo de detecção
      scanForAssets();
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