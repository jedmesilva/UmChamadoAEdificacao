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
  
  // Verifica se o diretório dist existe
  if (!fs.existsSync('dist')) {
    console.log('Criando diretório dist...');
    fs.mkdirSync('dist', { recursive: true });
  }
  
  // Garantir que a pasta api exista em dist
  if (!fs.existsSync(path.join('dist', 'api'))) {
    console.log('Criando diretório dist/api...');
    fs.mkdirSync(path.join('dist', 'api'), { recursive: true });
  }
  
  // Cópia arquivos .mjs para a pasta dist
  console.log('Copiando arquivos .mjs para a pasta dist...');
  
  // Copiar index.mjs e package.json para a raiz de dist
  if (fs.existsSync('index.mjs')) {
    console.log('Copiando index.mjs para dist...');
    fs.copyFileSync('index.mjs', path.join('dist', 'index.mjs'));
  }
  
  // Copiar package.json para dist para referência de dependências
  if (fs.existsSync('package.json')) {
    console.log('Copiando package.json para dist...');
    fs.copyFileSync('package.json', path.join('dist', 'package.json'));
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
    const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
    const cssFiles = assetFiles.filter(file => file.endsWith('.css'));
    
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
        fallbackContent = fallbackContent.replace(
          '<script>',
          `<script>
// Tentar carregar a aplicação principal dinamicamente
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se há assets da aplicação
  fetch('/assets/')
    .then(response => {
      if (response.ok) {
        console.log('Assets da aplicação encontrados, tentando carregar...');
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/assets/index.js'; // Nome do arquivo principal do build
        document.head.appendChild(script);
      }
    })
    .catch(err => console.error('Erro ao verificar assets:', err));
});
`
        );
        
        fs.writeFileSync(path.join('dist', 'index.html'), fallbackContent);
      } else {
        // Criar um index.html básico
        console.log('Criando index.html básico para carregamento da aplicação...');
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
  </style>
</head>
<body>
  <div class="container">
    <h1>Um Chamado à Edificação</h1>
    <p>Carregando aplicação...</p>
    <div id="root"></div>
  </div>
  <script>
    // Tentar carregar os assets da aplicação principal
    document.addEventListener('DOMContentLoaded', function() {
      const mainScript = document.createElement('script');
      mainScript.type = 'module';
      mainScript.src = '/assets/index.js';
      mainScript.onerror = function() {
        document.querySelector('.container').innerHTML = '<h1>Um Chamado à Edificação</h1><p>Não foi possível carregar a aplicação. Por favor, tente novamente mais tarde.</p>';
      };
      document.body.appendChild(mainScript);
      
      // Verificar o status da API
      fetch('/api/healthcheck')
        .then(response => response.json())
        .then(data => {
          console.log('API status:', data);
        })
        .catch(error => {
          console.error('Erro ao verificar API:', error);
        });
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