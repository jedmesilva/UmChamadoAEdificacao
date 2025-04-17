import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configura o ambiente
process.env.NODE_ENV = 'production';
process.env.STORAGE_TYPE = 'supabase';

console.log('🔨 Iniciando build para Vercel...');

// Verificar variáveis de ambiente críticas
console.log('Verificando variáveis de ambiente do Supabase...');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('⚠️ AVISO: Variável VITE_SUPABASE_URL não está definida!');
} else {
  console.log('✅ VITE_SUPABASE_URL está configurada corretamente.');
}

if (!supabaseAnonKey) {
  console.warn('⚠️ AVISO: Variável VITE_SUPABASE_ANON_KEY não está definida!');
} else {
  console.log('✅ VITE_SUPABASE_ANON_KEY está configurada corretamente.');
}

try {
  // Executa o build da aplicação
  console.log('📦 Construindo o frontend...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verifica se o diretório dist/public existe
  if (!fs.existsSync('dist/public')) {
    console.log('⚠️ Diretório dist/public não encontrado, criando...');
    fs.mkdirSync('dist/public', { recursive: true });
  }

  // Verificar e criar diretórios necessários (from original code)
  var requiredDirs = [
    'dist',
    'dist/api',
    'dist/assets',
    'dist/static'
  ];

  for (var i = 0; i < requiredDirs.length; i++) {
    var dir = requiredDirs[i];
    if (!fs.existsSync(dir)) {
      console.log('Criando diretório ' + dir + '...');
      fs.mkdirSync(dir, { recursive: true });
    }
  }


  // Copiar arquivos .mjs para a pasta dist (from original code)
  console.log('Copiando arquivos .mjs para a pasta dist...');

  // Copiar index.mjs e package.json para a raiz de dist (from original code)
  if (fs.existsSync('index.mjs')) {
    console.log('Copiando index.mjs para dist...');
    fs.copyFileSync('index.mjs', path.join('dist', 'index.mjs'));

    // Copiar também como index.js para garantir compatibilidade total (from original code)
    console.log('Criando cópia como index.js para compatibilidade...');
    fs.copyFileSync('index.mjs', path.join('dist', 'index.js'));
  }

  // Copiar package.json para dist para referência de dependências (from original code)
  if (fs.existsSync('package.json')) {
    console.log('Copiando package.json para dist...');
    fs.copyFileSync('package.json', path.join('dist', 'package.json'));

    // Garantir que o tipo do módulo está definido como module (from original code)
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

  // Copiar todos os arquivos da pasta api para dist/api (from original code)
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

    //Copiar vercel.json (from original code)
    if (fs.existsSync('vercel.json')) {
        console.log('Copiando vercel.json para dist...');
        fs.copyFileSync('vercel.json', path.join('dist', 'vercel.json'));
    }

  // Verificar e copiar o index.html principal para a raiz do dist
  console.log('Copiando index.html para diretório raiz do dist...');
  
  // Buscar em todas as possíveis localizações
  const possibleIndexLocations = [
    'index.html',
    'dist/public/index.html',
    'dist/client/index.html',
    'client/index.html',
    'client/dist/index.html',
    'public/index.html'
  ];
  
  let indexFound = false;
  
  for (const indexLocation of possibleIndexLocations) {
    if (fs.existsSync(indexLocation)) {
      console.log(`Encontrado index.html em: ${indexLocation}`);
      fs.copyFileSync(indexLocation, path.join('dist', 'index.html'));
      indexFound = true;
      
      // Corrigir os caminhos dos assets no index.html
      try {
        console.log('Corrigindo caminhos dos assets no index.html...');
        let indexHTML = fs.readFileSync(path.join('dist', 'index.html'), 'utf8');
        
        // Adicionar script para injetar ENV no início do <head>
        if (!indexHTML.includes('window.ENV = {')) {
          const envScript = `<script>
    // Variáveis de ambiente para Supabase
    window.ENV = {
      VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
      VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
    };
    console.log("ENV carregado:", window.ENV);
  </script>`;
          
          indexHTML = indexHTML.replace('</head>', `${envScript}\n</head>`);
        }
        
        // Corrigir caminhos
        indexHTML = indexHTML.replace(/src="\/assets\//g, 'src="/assets/');
        indexHTML = indexHTML.replace(/href="\/assets\//g, 'href="/assets/');
        
        fs.writeFileSync(path.join('dist', 'index.html'), indexHTML);
        console.log('Caminhos e variáveis de ambiente adicionados com sucesso.');
      } catch (err) {
        console.error('Erro ao processar index.html:', err);
      }
      
      break;
    }
  }
  
  if (!indexFound) {
    console.warn('WARNING: Nenhum arquivo index.html encontrado. Criando fallback...');
    // Criar um arquivo de fallback com diagnóstico embutido
    const fallbackHTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Um Chamado à Edificação - Diagnóstico</title>
    <script>
      // Variáveis de ambiente para Supabase
      window.ENV = {
        VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
        VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
      };
      console.log("ENV carregado:", window.ENV);
    </script>
    <style>
      body { font-family: system-ui, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 1rem; }
      h1 { color: #1a365d; margin-bottom: 1rem; }
      .card { border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
      button { background: #3182ce; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.25rem; cursor: pointer; }
      button:hover { background: #2c5282; }
      pre { background: #f7fafc; padding: 1rem; border-radius: 0.25rem; overflow-x: auto; font-size: 0.875rem; }
      .success { color: #38a169; }
      .error { color: #e53e3e; }
    </style>
  </head>
  <body>
    <h1>Um Chamado à Edificação - Página de Diagnóstico</h1>
    <div class="card">
      <h2>Verificação de Variáveis de Ambiente</h2>
      <p>Testando a disponibilidade das variáveis críticas:</p>
      <pre id="env-output">Verificando...</pre>
      <button onclick="checkEnv()">Testar Variáveis</button>
    </div>
    
    <div class="card">
      <h2>Teste de Conexão com Supabase</h2>
      <p>Verificando a conectividade com o Supabase:</p>
      <pre id="supabase-output">Aguardando teste...</pre>
      <button onclick="testSupabase()">Testar Conectividade</button>
    </div>
    
    <script>
      // Função para verificar variáveis de ambiente
      function checkEnv() {
        const output = document.getElementById('env-output');
        try {
          const env = window.ENV || {};
          const result = [
            'Verificação de Variáveis:',
            '------------------------',
            'window.ENV existe? ' + (window.ENV ? 'Sim' : 'Não'),
            'VITE_SUPABASE_URL: ' + (env.VITE_SUPABASE_URL || 'Não definido'),
            'VITE_SUPABASE_ANON_KEY: ' + (env.VITE_SUPABASE_ANON_KEY ? 'Definido (valor oculto)' : 'Não definido'),
            '',
            'import.meta.env: ' + (typeof import.meta !== 'undefined' && import.meta.env ? 'Disponível' : 'Não disponível')
          ].join('\\n');
          
          output.textContent = result;
          output.className = window.ENV?.VITE_SUPABASE_URL ? 'success' : 'error';
        } catch (err) {
          output.textContent = 'Erro: ' + err.message;
          output.className = 'error';
        }
      }
      
      // Iniciar verificação automática
      checkEnv();
      
      // Função para testar conexão com Supabase
      async function testSupabase() {
        const output = document.getElementById('supabase-output');
        output.textContent = 'Conectando...';
        
        try {
          // Carregar o Supabase de um CDN para este teste
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
          script.onload = async () => {
            try {
              const { createClient } = window.supabase;
              
              if (!window.ENV?.VITE_SUPABASE_URL || !window.ENV?.VITE_SUPABASE_ANON_KEY) {
                throw new Error('Variáveis de ambiente do Supabase não estão definidas');
              }
              
              const supabase = createClient(
                window.ENV.VITE_SUPABASE_URL,
                window.ENV.VITE_SUPABASE_ANON_KEY
              );
              
              output.textContent = 'Cliente Supabase criado, tentando fazer consulta...';
              
              // Teste de consulta simples
              const { data, error } = await supabase
                .from('cartas_um_chamado_a_edificacao')
                .select('id')
                .limit(1);
              
              if (error) throw error;
              
              output.textContent = 'Conexão com Supabase estabelecida com sucesso!\\n' + 
                                  'Dados recebidos: ' + JSON.stringify(data);
              output.className = 'success';
            } catch (err) {
              output.textContent = 'Erro ao conectar: ' + err.message;
              output.className = 'error';
            }
          };
          
          script.onerror = () => {
            output.textContent = 'Erro ao carregar a biblioteca Supabase';
            output.className = 'error';
          };
          
          document.head.appendChild(script);
        } catch (err) {
          output.textContent = 'Erro: ' + err.message;
          output.className = 'error';
        }
      }
    </script>
  </body>
</html>`;
    fs.writeFileSync(path.join('dist', 'index.html'), fallbackHTML);
    console.log('Arquivo de diagnóstico criado como fallback.');
  }
  
  // Verificar e garantir que a pasta dist/assets existe (necessária para scripts)
  console.log('Verificando e preparando pasta de assets...');
  
  // Criar pasta dist/assets se não existir
  if (!fs.existsSync('dist/assets')) {
    console.log('Criando diretório dist/assets...');
    fs.mkdirSync('dist/assets', { recursive: true });
  }
  
  // Verificar possíveis localizações da pasta de assets
  const possibleAssetsPaths = [
    'dist/public/assets',
    'client/dist/assets',
    'public/assets',
    'dist/assets', // Verificar se já existe
    'client/assets',
    'client/public/assets'
  ];
  
  let assetsCopied = false;
  
  // Garantir que a pasta de destino existe
  if (!fs.existsSync('dist/assets')) {
    console.log('Criando diretório dist/assets...');
    fs.mkdirSync('dist/assets', { recursive: true });
  }
  
  // Garantir que dist/public/assets existe para uso pelo Vercel
  if (!fs.existsSync('dist/public/assets')) {
    console.log('Criando diretório dist/public/assets para garantir compatibilidade com Vercel...');
    fs.mkdirSync('dist/public/assets', { recursive: true });
  }
  
  console.log('Verificando todas as possíveis localizações de assets...');
  
  for (const assetPath of possibleAssetsPaths) {
    if (fs.existsSync(assetPath)) {
      console.log(`Encontrada pasta de assets em: ${assetPath}`);
      try {
        console.log(`Copiando assets de ${assetPath} para dist/assets...`);
        // Listar todos os arquivos na pasta de origem
        const files = fs.readdirSync(assetPath);
        console.log(`Encontrados ${files.length} arquivos em ${assetPath}`);
        
        // Copiar cada arquivo individualmente
        for (const file of files) {
          const srcFile = path.join(assetPath, file);
          const destFile = path.join('dist/assets', file);
          
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
            console.log(`Copiado: ${file}`);
          } else if (fs.statSync(srcFile).isDirectory()) {
            // Criar o diretório de destino se não existir
            if (!fs.existsSync(path.join('dist/assets', file))) {
              fs.mkdirSync(path.join('dist/assets', file), { recursive: true });
            }
            
            // Copiar todo o conteúdo do diretório recursivamente
            const nestedFiles = fs.readdirSync(srcFile);
            for (const nestedFile of nestedFiles) {
              const nestedSrcFile = path.join(srcFile, nestedFile);
              const nestedDestFile = path.join('dist/assets', file, nestedFile);
              
              if (fs.statSync(nestedSrcFile).isFile()) {
                fs.copyFileSync(nestedSrcFile, nestedDestFile);
                console.log(`Copiado: ${file}/${nestedFile}`);
              } else {
                fs.cpSync(nestedSrcFile, nestedDestFile, { recursive: true });
                console.log(`Copiado diretório: ${file}/${nestedFile}`);
              }
            }
          }
        }
        
        console.log(`Pasta de assets copiada com sucesso de ${assetPath} para dist/assets`);
        assetsCopied = true;
      } catch (err) {
        console.error(`Erro ao copiar pasta assets de ${assetPath}:`, err);
      }
    }
  }
  
  // Verificar também arquivos JS na raiz de dist/public
  if (fs.existsSync('dist/public')) {
    console.log('Verificando arquivos JS em dist/public...');
    try {
      const findJsFiles = (dir, fileList = []) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isDirectory()) {
            findJsFiles(filePath, fileList);
          } else if (file.endsWith('.js')) {
            fileList.push(filePath);
          }
        });
        return fileList;
      };
      
      const jsFiles = findJsFiles('dist/public');
      console.log(`Encontrados ${jsFiles.length} arquivos JS em dist/public`);
      
      if (jsFiles.length > 0) {
        // Se não encontramos assets em nenhum lugar, mas temos JS files, vamos copiá-los para dist/assets
        if (!assetsCopied) {
          console.log('Copiando arquivos JS para dist/assets...');
          for (const jsFile of jsFiles) {
            const relativePath = path.relative('dist/public', jsFile);
            const destPath = path.join('dist/assets', path.basename(relativePath));
            
            fs.copyFileSync(jsFile, destPath);
            console.log(`Copiado JS para assets: ${path.basename(relativePath)}`);
          }
          assetsCopied = true;
        }
      }
    } catch (err) {
      console.error('Erro ao buscar arquivos JS:', err);
    }
  }
  
  if (!assetsCopied) {
    console.warn('AVISO: Nenhuma pasta de assets encontrada para copiar!');
    
    // Verificar se há algum arquivo JavaScript em dist/public
    if (fs.existsSync('dist/public')) {
      console.log('Verificando arquivos JS em dist/public...');
      try {
        const findJsFiles = (dir, fileList = []) => {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              findJsFiles(filePath, fileList);
            } else if (file.endsWith('.js')) {
              fileList.push(filePath);
            }
          });
          return fileList;
        };
        
        const jsFiles = findJsFiles('dist/public');
        console.log(`Encontrados ${jsFiles.length} arquivos JS em dist/public`);
        
        if (jsFiles.length > 0) {
          for (const jsFile of jsFiles) {
            const relativePath = path.relative('dist/public', jsFile);
            const destDir = path.dirname(path.join('dist', relativePath));
            
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            
            fs.copyFileSync(jsFile, path.join('dist', relativePath));
            console.log(`Copiado JS: ${relativePath}`);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar arquivos JS:', err);
      }
    }
  }
  
  // Garantir que os assets estão tanto em dist/assets quanto em dist/public/assets
  if (fs.existsSync('dist/assets') && fs.existsSync('dist/public/assets')) {
    console.log('Sincronizando assets entre dist/assets e dist/public/assets...');
    
    // Copiar de dist/assets para dist/public/assets
    if (fs.existsSync('dist/assets')) {
      const assetsFiles = fs.readdirSync('dist/assets');
      for (const file of assetsFiles) {
        const srcFile = path.join('dist/assets', file);
        const destFile = path.join('dist/public/assets', file);
        
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copiado para public: ${file}`);
        } else if (fs.statSync(srcFile).isDirectory()) {
          fs.cpSync(srcFile, destFile, { recursive: true });
          console.log(`Copiado diretório para public: ${file}`);
        }
      }
    }
    
    // Copiar de dist/public/assets para dist/assets
    if (fs.existsSync('dist/public/assets')) {
      const publicAssetsFiles = fs.readdirSync('dist/public/assets');
      for (const file of publicAssetsFiles) {
        const srcFile = path.join('dist/public/assets', file);
        const destFile = path.join('dist/assets', file);
        
        if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copiado de public: ${file}`);
        } else if (fs.statSync(srcFile).isDirectory() && !fs.existsSync(destFile)) {
          fs.cpSync(srcFile, destFile, { recursive: true });
          console.log(`Copiado diretório de public: ${file}`);
        }
      }
    }
  }
  
  // Listar conteúdo da pasta dist/assets para verificação
  console.log('Verificando conteúdo final de dist/assets:');
  if (fs.existsSync('dist/assets')) {
    try {
      const assetsFiles = fs.readdirSync('dist/assets');
      console.log(`Conteúdo de dist/assets (${assetsFiles.length} itens):`);
      assetsFiles.forEach(file => console.log(` - ${file}`));
    } catch (err) {
      console.error('Erro ao listar conteúdo da pasta dist/assets:', err);
    }
  } else {
    console.warn('AVISO: Pasta dist/assets não existe após tentativa de cópia!');
  }
  
  // Listar conteúdo da pasta dist/public/assets para verificação
  console.log('Verificando conteúdo final de dist/public/assets:');
  if (fs.existsSync('dist/public/assets')) {
    try {
      const assetsFiles = fs.readdirSync('dist/public/assets');
      console.log(`Conteúdo de dist/public/assets (${assetsFiles.length} itens):`);
      assetsFiles.forEach(file => console.log(` - ${file}`));
    } catch (err) {
      console.error('Erro ao listar conteúdo da pasta dist/public/assets:', err);
    }
  } else {
    console.warn('AVISO: Pasta dist/public/assets não existe após tentativa de cópia!');
  }


  // Verificação final crítica: garantir que index.html está na raiz do dist
if (!fs.existsSync('dist/index.html')) {
  console.warn('⚠️ AVISO CRÍTICO: index.html não encontrado na raiz do dist!');
  
  // Tentar encontrar qualquer index.html e copiá-lo para a raiz
  const possibleLocations = [
    'static-index.html',
    'index-test.html',
    'dist/public/index.html',
    'client/index.html',
    'public/index.html'
  ];
  
  let found = false;
  for (const loc of possibleLocations) {
    if (fs.existsSync(loc)) {
      console.log(`Copiando ${loc} para dist/index.html como último recurso...`);
      fs.copyFileSync(loc, 'dist/index.html');
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log('Criando index.html de diagnóstico na raiz do dist...');
    const diagnosticHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico - Um Chamado à Edificação</title>
  <script>
    window.ENV = {
      VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || ''}",
      VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || ''}"
    };
  </script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 1rem; }
    h1 { color: #1a202c; }
    pre { background: #f7fafc; padding: 1rem; border-radius: 0.25rem; overflow: auto; }
  </style>
</head>
<body>
  <h1>Diagnóstico da Aplicação</h1>
  <p>Esta é uma página de diagnóstico gerada automaticamente.</p>
  <h2>Informações do Ambiente</h2>
  <pre id="env-info">Carregando...</pre>
  <script>
    document.getElementById('env-info').textContent = JSON.stringify({
      env: window.ENV,
      location: window.location.toString(),
      timestamp: new Date().toISOString()
    }, null, 2);
  </script>
</body>
</html>`;
    fs.writeFileSync('dist/index.html', diagnosticHtml);
  }
}

// Criar arquivo healthcheck.json na raiz para verificação rápida
const healthcheck = {
  status: 'ok',
  timestamp: new Date().toISOString(),
  build: {
    env: {
      node_env: process.env.NODE_ENV,
      supabase_url_set: !!process.env.VITE_SUPABASE_URL,
      supabase_anon_key_set: !!process.env.VITE_SUPABASE_ANON_KEY,
      storage_type: process.env.STORAGE_TYPE
    }
  }
};

fs.writeFileSync('dist/healthcheck.json', JSON.stringify(healthcheck, null, 2));
console.log('Arquivo healthcheck.json criado para diagnóstico rápido');

// Copiar as páginas estáticas de diagnóstico para a pasta dist
const diagnosticPages = ['static-index.html', 'test-js-css.html'];
for (const page of diagnosticPages) {
  if (fs.existsSync(page)) {
    console.log(`Copiando página de diagnóstico ${page} para dist/${page}`);
    fs.copyFileSync(page, `dist/${page}`);
  } else {
    console.warn(`AVISO: ${page} não encontrado para copiar`);
  }
}

console.log('✅ Build personalizado concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o build personalizado:', error);
  process.exit(1);
}