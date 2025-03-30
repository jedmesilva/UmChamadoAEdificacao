// Script de configuração para o build do Vercel (ESM)
// Executa tarefas adicionais após o build padrão

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função auxiliar para copiar diretório recursivamente 
function copyDir(src, dest) {
  // Criar diretório de destino se não existir
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Ler conteúdo do diretório fonte
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Recursivamente copiar subdiretórios
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      // Copiar arquivo
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Executa o build normal primeiro
console.log('Iniciando build para o Vercel...');

try {
  // Configurando para ESM
  console.log('Configurando formato de build para ESM...');
  
  // Cria um arquivo .env para o ambiente de produção se não existir
  if (!fs.existsSync('.env')) {
    console.log('Criando arquivo .env padrão...');
    fs.writeFileSync('.env', 'STORAGE_TYPE=supabase\nNODE_ENV=production\n');
  }
  
  // Verificar e criar diretórios necessários
  var requiredDirs = [
    'dist',
    'dist/api',
    'dist/assets',
    'dist/client',
    'dist/static'
  ];
  
  for (var i = 0; i < requiredDirs.length; i++) {
    var dir = requiredDirs[i];
    if (!fs.existsSync(dir)) {
      console.log('Criando diretório ' + dir + '...');
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Cópia arquivos .mjs para a pasta dist
  console.log('Copiando arquivos .mjs para a pasta dist...');
  
  // Copiar index.mjs e package.json para a raiz de dist
  if (fs.existsSync('index.mjs')) {
    console.log('Copiando index.mjs para dist...');
    fs.copyFileSync('index.mjs', path.join('dist', 'index.mjs'));
    
    // Copiar também como index.js para garantir compatibilidade total
    console.log('Criando cópia como index.js para compatibilidade...');
    fs.copyFileSync('index.mjs', path.join('dist', 'index.js'));
  }
  
  // Copiar package.json para dist para referência de dependências
  if (fs.existsSync('package.json')) {
    console.log('Copiando package.json para dist...');
    fs.copyFileSync('package.json', path.join('dist', 'package.json'));
    
    // Garantir que o tipo do módulo está definido como module
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      packageJson.type = 'module';
      fs.writeFileSync(
        path.join('dist', 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      console.log('package.json atualizado com "type": "module"');
    } catch (err) {
      console.error('Erro ao atualizar package.json:', err);
    }
  }
  
  // Copiar todos os arquivos da pasta api para dist/api
  if (fs.existsSync('api')) {
    console.log('Copiando arquivos da pasta api para dist/api...');
    const apiFiles = fs.readdirSync('api');
    
    for (const file of apiFiles) {
      const srcPath = path.join('api', file);
      const destPath = path.join('dist', 'api', file);
      
      if (fs.statSync(srcPath).isFile()) {
        console.log(`Copiando ${file} para dist/api...`);
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  // Copiar vercel.json para a raiz de dist
  if (fs.existsSync('vercel.json')) {
    console.log('Copiando vercel.json para dist...');
    fs.copyFileSync('vercel.json', path.join('dist', 'vercel.json'));
  }
  
  // Copiar página estática de fallback
  if (fs.existsSync('static-index.html')) {
    console.log('Copiando página estática de fallback...');
    // Se a pasta dist/api não existir, criá-la
    if (!fs.existsSync(path.join('dist', 'static'))) {
      fs.mkdirSync(path.join('dist', 'static'), { recursive: true });
    }
    fs.copyFileSync('static-index.html', path.join('dist', 'static', 'index.html'));
    
    // Também copiar para a raiz como backup
    fs.copyFileSync('static-index.html', path.join('dist', 'fallback.html'));
  }
  
  // Copiar as instruções de deploy
  if (fs.existsSync('deploy-instructions.md')) {
    console.log('Copiando instruções de deploy...');
    fs.copyFileSync('deploy-instructions.md', path.join('dist', 'deploy-instructions.md'));
  }
  
  // Copiar pasta client para dist/client se existir
  if (fs.existsSync('client')) {
    console.log('Copiando pasta client para dist/client...');
    
    // Verificar se client/dist existe e copiar todo o conteúdo para dist
    if (fs.existsSync(path.join('client', 'dist'))) {
      console.log('Copiando client/dist para dist...');
      copyDir(path.join('client', 'dist'), 'dist');
    }
    
    // Verificar se client/dist/assets existe para usar no carregamento da aplicação
    if (fs.existsSync(path.join('client', 'dist', 'assets'))) {
      console.log('Copiando client/dist/assets para dist/assets...');
      copyDir(path.join('client', 'dist', 'assets'), path.join('dist', 'assets'));
    }
    
    // Verificar se client/index.html existe e copiar para a raiz para facilitar o diagnóstico
    if (fs.existsSync(path.join('client', 'index.html'))) {
      console.log('Copiando client/index.html para dist/client/index.html...');
      
      // Garantir que dist/client exista
      if (!fs.existsSync(path.join('dist', 'client'))) {
        fs.mkdirSync(path.join('dist', 'client'), { recursive: true });
      }
      
      fs.copyFileSync(
        path.join('client', 'index.html'), 
        path.join('dist', 'client', 'index.html')
      );
    }
  }
  
  // Verificar arquivos presentes no diretório dist
  console.log('Arquivos na pasta dist:');
  const distFiles = fs.readdirSync('dist');
  console.log(distFiles);
  
  if (fs.existsSync(path.join('dist', 'api'))) {
    console.log('Arquivos na pasta dist/api:');
    const distApiFiles = fs.readdirSync(path.join('dist', 'api'));
    console.log(distApiFiles);
  }
  
  // Verificar e copiar o index.html principal para a raiz do dist
  console.log('Verificando e copiando o index.html...');
  
  // Verifica se o build foi feito corretamente
  const buildDir = path.join('dist', 'assets');
  const buildExists = fs.existsSync(buildDir);
  
  if (buildExists) {
    console.log('Diretório de assets encontrado, parece que o build foi concluído com sucesso');
    
    // Verificar arquivos em assets
    const assetFiles = fs.readdirSync(buildDir);
    console.log('Arquivos em assets:', assetFiles);
    
    // Procura por arquivos JS e CSS no diretório assets
    // Incluindo arquivos com padrão hash (ex: index-ab123c.js)
    const jsFiles = assetFiles.filter(file => file.endsWith('.js') || /\.js$/.test(file));
    const cssFiles = assetFiles.filter(file => file.endsWith('.css') || /\.css$/.test(file));
    
    // Identificar o arquivo principal do aplicativo (geralmente index ou main)
    const mainJsFile = jsFiles.find(file => file.startsWith('index-') || file.startsWith('main-')) || 
                       (jsFiles.length > 0 ? jsFiles[0] : null);
    
    if (jsFiles.length > 0) {
      console.log('Arquivos JS encontrados:', jsFiles);
    } else {
      console.warn('ATENÇÃO: Nenhum arquivo JS encontrado em assets!');
    }
    
    if (cssFiles.length > 0) {
      console.log('Arquivos CSS encontrados:', cssFiles);
    }
  } else {
    console.warn('ATENÇÃO: Diretório de assets não encontrado. O build pode ter falhado!');
  }
  
  // Verificar se o index.html principal existe, caso contrário, copiar o fallback
  if (!fs.existsSync(path.join('dist', 'index.html'))) {
    console.log('Index principal não encontrado no diretório dist, buscando alternativas...');
    
    // Procurar pelo index.html construído pelo Vite
    const possibleIndexLocations = [
      path.join('dist', 'client', 'index.html'),
      path.join('client', 'dist', 'index.html'),
      path.join('client', 'index.html')
    ];
    
    let indexFound = false;
    
    for (const location of possibleIndexLocations) {
      if (fs.existsSync(location)) {
        console.log(`Index.html encontrado em ${location}, copiando para dist...`);
        
        // Ler o conteúdo do index.html
        let indexContent = fs.readFileSync(location, 'utf8');
        
        // Se for do Vite, corrigir caminhos dos assets se necessário
        if (buildExists && location !== path.join('client', 'index.html')) {
          // Garantir que os caminhos de assets estejam corretos
          indexContent = indexContent.replace(/src="\/assets\//g, 'src="/assets/');
          indexContent = indexContent.replace(/href="\/assets\//g, 'href="/assets/');
        }
        
        // Se for o arquivo original do cliente, injetar os scripts do build
        if (location === path.join('client', 'index.html') && buildExists) {
          const jsImports = jsFiles.map(file => 
            `<script type="module" src="/assets/${file}"></script>`
          ).join('\n');
          
          const cssImports = cssFiles.map(file => 
            `<link rel="stylesheet" href="/assets/${file}">`
          ).join('\n');
          
          // Substituir a referência ao script original pelo compilado
          indexContent = indexContent.replace(
            '<script type="module" src="/src/main.tsx"></script>', 
            `${cssImports}\n${jsImports}`
          );
        }
        
        // Escrever o conteúdo modificado no index.html final
        fs.writeFileSync(path.join('dist', 'index.html'), indexContent);
        indexFound = true;
        break;
      }
    }
    
    // Se ainda não encontrou o index.html, usar o fallback
    if (!indexFound) {
      if (fs.existsSync('static-index.html')) {
        console.log('Usando página estática de fallback como index.html...');
        let fallbackContent = fs.readFileSync('static-index.html', 'utf8');
        
        // Modificar a página estática para tentar carregar a aplicação principal
        // Usar o arquivo principal identificado se disponível
        const mainJsPath = mainJsFile ? `/assets/${mainJsFile}` : '/assets/index.js';
        
        fallbackContent = fallbackContent.replace(
          '<script>',
          `<script>
// Tentar carregar a aplicação principal dinamicamente
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se há assets da aplicação
  var mainScriptPath = "${mainJsPath}";
  console.log("Tentando carregar script principal:", mainScriptPath);
  
  var script = document.createElement("script");
  script.type = "module";
  script.src = mainScriptPath;
  script.onload = function() {
    console.log("Script principal carregado com sucesso!");
  };
  script.onerror = function() {
    console.error("Erro ao carregar script principal. Tentando alternativas...");
    // Tentar arquivos alternativos
    var alternativeScripts = [
      "/assets/index.js",
      "/assets/main.js",
      "/assets/app.js",
      "/client/dist/assets/index.js"
    ];
    
    function tryNextAlternative(index) {
      if (index >= alternativeScripts.length) {
        console.error("Todos os scripts alternativos falharam.");
        return;
      }
      
      var altScript = document.createElement("script");
      altScript.type = "module";
      altScript.src = alternativeScripts[index];
      altScript.onload = function() {
        console.log("Script alternativo carregado:", alternativeScripts[index]);
      };
      altScript.onerror = function() {
        console.error("Falha ao carregar:", alternativeScripts[index]);
        tryNextAlternative(index + 1);
      };
      document.head.appendChild(altScript);
    }
    
    tryNextAlternative(0);
  };
  document.head.appendChild(script);
  
  // Também carregar o CSS se disponível
  ${cssFiles.length > 0 ? `
  var mainCssPath = "/assets/${cssFiles[0]}";
  var linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.href = mainCssPath;
  document.head.appendChild(linkElement);
  ` : ''}
});
`
        );
        
        fs.writeFileSync(path.join('dist', 'index.html'), fallbackContent);
      } else {
        // Criar um index.html básico
        console.log('Criando index.html básico para carregamento da aplicação...');
        // Usar o arquivo principal identificado se disponível
        const mainJsPath = mainJsFile ? `/assets/${mainJsFile}` : '/assets/index.js';
        
        const htmlContent = `<!DOCTYPE html>
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
    }
    .container {
      max-width: 800px;
      padding: 2rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .logs {
      margin-top: 20px;
      font-size: 12px;
      color: #666;
      text-align: left;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      height: 100px;
      overflow-y: auto;
    }
  </style>
  ${cssFiles.length > 0 ? `<link rel="stylesheet" href="/assets/${cssFiles[0]}">` : ''}
</head>
<body>
  <div class="container">
    <h1>Um Chamado à Edificação</h1>
    <p id="status-message">Carregando aplicação...</p>
    <div id="root"></div>
    <div class="logs" id="debug-logs"></div>
  </div>
  <script>
    // Função para adicionar logs
    function addLog(message) {
      var logElement = document.getElementById('debug-logs');
      var logItem = document.createElement('div');
      logItem.textContent = message;
      logElement.appendChild(logItem);
      logElement.scrollTop = logElement.scrollHeight;
      console.log(message);
    }
    
    // Atualizar mensagem de status
    function updateStatus(message) {
      document.getElementById('status-message').textContent = message;
    }
    
    // Tentar carregar os assets da aplicação principal
    document.addEventListener('DOMContentLoaded', function() {
      addLog("Iniciando carregamento da aplicação...");
      
      // Verificar o status da API
      fetch('/api/healthcheck')
        .then(function(response) { return response.json(); })
        .then(function(data) {
          addLog("API OK: " + JSON.stringify(data));
        })
        .catch(function(error) {
          addLog("Erro na API: " + error);
        });
      
      // Script principal a carregar
      var mainScriptPath = "${mainJsPath}";
      addLog("Tentando carregar script principal: " + mainScriptPath);
      
      var script = document.createElement('script');
      script.type = 'module';
      script.src = mainScriptPath;
      script.onload = function() {
        addLog("Script principal carregado com sucesso!");
        updateStatus("Aplicação carregada!");
      };
      script.onerror = function() {
        addLog("Erro ao carregar script principal. Tentando alternativas...");
        
        // Lista de scripts alternativos a tentar
        var alternativeScripts = [
          "/assets/index.js",
          "/assets/main.js",
          "/assets/app.js",
          "/dist/assets/index.js",
          "/client/dist/assets/index.js",
          "/client/assets/index.js"
        ];
        
        function tryNextAlternative(index) {
          if (index >= alternativeScripts.length) {
            addLog("Todos os scripts alternativos falharam.");
            updateStatus("Não foi possível carregar a aplicação. Por favor, tente novamente mais tarde.");
            return;
          }
          
          var altScript = document.createElement("script");
          altScript.type = "module";
          altScript.src = alternativeScripts[index];
          addLog("Tentando alternativa: " + alternativeScripts[index]);
          
          altScript.onload = function() {
            addLog("Script alternativo carregado: " + alternativeScripts[index]);
            updateStatus("Aplicação carregada!");
          };
          altScript.onerror = function() {
            addLog("Falha ao carregar: " + alternativeScripts[index]);
            tryNextAlternative(index + 1);
          };
          document.head.appendChild(altScript);
        }
        
        tryNextAlternative(0);
      };
      document.head.appendChild(script);
    });
  </script>
</body>
</html>`;
        fs.writeFileSync(path.join('dist', 'index.html'), htmlContent);
      }
    }
  } else {
    console.log('Index.html já existe no diretório dist, mantendo o existente.');
  }
  
  console.log('Build para Vercel concluído com sucesso!');
} catch (error) {
  console.error('Erro durante o build para Vercel:', error);
  process.exit(1);
}