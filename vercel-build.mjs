import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configura o ambiente
process.env.NODE_ENV = 'production';
process.env.STORAGE_TYPE = 'supabase';

console.log('🔨 Iniciando build para Vercel...');

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
  if (fs.existsSync('index.html')) {
    console.log('Copiando index.html raiz para dist/');
    fs.copyFileSync('index.html', path.join('dist', 'index.html'));
  } else if (fs.existsSync('dist/public/index.html')) {
    console.log('Copiando dist/public/index.html para dist/');
    fs.copyFileSync('dist/public/index.html', path.join('dist', 'index.html'));
  } else if (fs.existsSync('client/index.html')) {
    console.log('Copiando client/index.html para dist/');
    fs.copyFileSync('client/index.html', path.join('dist', 'index.html'));
  } else {
    console.warn('WARNING: Nenhum arquivo index.html encontrado. Criando fallback...');
    // Criar um arquivo de fallback simples
    const fallbackHTML = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Um Chamado à Edificação</title>
    <style>
      body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
      div { max-width: 500px; padding: 2rem; }
      h1 { margin-bottom: 1rem; }
    </style>
  </head>
  <body>
    <div>
      <h1>Um Chamado à Edificação</h1>
      <p>Carregando aplicação...</p>
      <button onclick="window.location.reload()">Recarregar</button>
    </div>
  </body>
</html>`;
    fs.writeFileSync(path.join('dist', 'index.html'), fallbackHTML);
    console.log('Arquivo de fallback criado.');
  }
  
  // Verificar se a pasta dist/assets existe (necessária para scripts)
  if (!fs.existsSync('dist/assets') && fs.existsSync('dist/public/assets')) {
    console.log('Copiando pasta de assets para diretório raiz do dist...');
    try {
      fs.cpSync('dist/public/assets', 'dist/assets', { recursive: true });
      console.log('Pasta assets copiada com sucesso para dist/assets.');
    } catch (err) {
      console.error('Erro ao copiar pasta assets:', err);
    }
  }


  console.log('✅ Build personalizado concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro durante o build personalizado:', error);
  process.exit(1);
}