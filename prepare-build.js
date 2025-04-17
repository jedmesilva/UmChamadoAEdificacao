import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Obter o diretório atual do módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Verificação de diretórios importantes
log('🔍 Verificando estrutura de diretórios para build...', colors.bright);

// Verificar e criar diretório src na raiz se não existir
if (!fs.existsSync('src')) {
  log('Criando diretório src na raiz...', colors.yellow);
  fs.mkdirSync('src', { recursive: true });
}

// Verificar arquivos essenciais na pasta client/src
const essentialClientFiles = [
  { src: 'client/src/App.tsx', dest: 'src/App.tsx' },
  { src: 'client/src/main.tsx', dest: 'src/main.tsx' },
  { src: 'client/src/index.css', dest: 'src/index.css' }
];

log('Verificando arquivos principais...', colors.cyan);
essentialClientFiles.forEach(file => {
  if (fs.existsSync(file.src)) {
    if (!fs.existsSync(file.dest) || fs.readFileSync(file.src, 'utf8') !== fs.readFileSync(file.dest, 'utf8')) {
      log(`Copiando ${file.src} para ${file.dest}`, colors.yellow);
      fs.copyFileSync(file.src, file.dest);
    } else {
      log(`Arquivo ${file.dest} já existe e está atualizado`, colors.green);
    }
  } else {
    log(`ERRO: Arquivo essencial ${file.src} não encontrado!`, colors.red);
    process.exit(1);
  }
});

// Verificar diretórios e copiar se necessário
const directoriesToSync = [
  { src: 'client/src/components', dest: 'src/components' },
  { src: 'client/src/hooks', dest: 'src/hooks' },
  { src: 'client/src/lib', dest: 'src/lib' },
  { src: 'client/src/pages', dest: 'src/pages' }
];

log('Sincronizando diretórios...', colors.cyan);
directoriesToSync.forEach(dir => {
  if (fs.existsSync(dir.src)) {
    if (!fs.existsSync(dir.dest)) {
      log(`Criando diretório ${dir.dest}`, colors.yellow);
      fs.mkdirSync(dir.dest, { recursive: true });
    }
    
    // Lista todos os arquivos no diretório de origem
    const files = fs.readdirSync(dir.src, { withFileTypes: true });
    
    // Copia cada arquivo
    files.forEach(file => {
      const srcPath = path.join(dir.src, file.name);
      const destPath = path.join(dir.dest, file.name);
      
      if (file.isFile()) {
        if (!fs.existsSync(destPath) || fs.readFileSync(srcPath, 'utf8') !== fs.readFileSync(destPath, 'utf8')) {
          log(`Copiando ${srcPath} para ${destPath}`, colors.yellow);
          fs.copyFileSync(srcPath, destPath);
        }
      } else if (file.isDirectory()) {
        // Se for um diretório, cria o diretório de destino se não existir e copia recursivamente
        if (!fs.existsSync(destPath)) {
          log(`Criando diretório ${destPath}`, colors.yellow);
          fs.mkdirSync(destPath, { recursive: true });
        }
        
        // Copia o conteúdo do diretório recursivamente
        const dirFiles = fs.readdirSync(srcPath, { withFileTypes: true });
        dirFiles.forEach(dirFile => {
          const dirSrcPath = path.join(srcPath, dirFile.name);
          const dirDestPath = path.join(destPath, dirFile.name);
          
          if (dirFile.isFile()) {
            if (!fs.existsSync(dirDestPath) || fs.readFileSync(dirSrcPath, 'utf8') !== fs.readFileSync(dirDestPath, 'utf8')) {
              log(`Copiando ${dirSrcPath} para ${dirDestPath}`, colors.yellow);
              fs.copyFileSync(dirSrcPath, dirDestPath);
            }
          }
        });
      }
    });
  } else {
    log(`Aviso: Diretório ${dir.src} não encontrado. Isso pode ser um problema se for um diretório essencial.`, colors.yellow);
  }
});

// Verificar index.html na raiz
if (!fs.existsSync('index.html') && fs.existsSync('client/index.html')) {
  log('Copiando index.html da pasta client para a raiz...', colors.yellow);
  fs.copyFileSync('client/index.html', 'index.html');
} else if (fs.existsSync('index.html')) {
  log('index.html já existe na raiz', colors.green);
  
  // Validar conteúdo do index.html
  const indexHtmlContent = fs.readFileSync('index.html', 'utf8');
  if (!indexHtmlContent.includes('src="/src/main.tsx"')) {
    log('AVISO: index.html não referencia corretamente o arquivo main.tsx', colors.yellow);
    log('Atualizando referência...', colors.yellow);
    
    // Atualizar referência para main.tsx
    const updatedContent = indexHtmlContent.replace(
      /<script\s+type="module"\s+src="[^"]*">/,
      '<script type="module" src="/src/main.tsx">'
    );
    
    fs.writeFileSync('index.html', updatedContent);
    log('index.html atualizado com a referência correta para main.tsx', colors.green);
  }
} else {
  log('ERRO: Nenhum arquivo index.html encontrado!', colors.red);
  process.exit(1);
}

// Verificar arquivo vite.config.ts
log('Verificando configuração do Vite...', colors.cyan);
if (fs.existsSync('vite.config.ts')) {
  const viteConfigContent = fs.readFileSync('vite.config.ts', 'utf8');
  log('vite.config.ts encontrado e validado', colors.green);
} else {
  log('ERRO: Arquivo vite.config.ts não encontrado!', colors.red);
  process.exit(1);
}

// Verificar .gitignore para não incluir a pasta dist
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  if (!gitignoreContent.split('\n').some(line => line.trim() === 'dist' || line.trim() === '/dist')) {
    log('Adicionando /dist ao .gitignore...', colors.yellow);
    fs.appendFileSync('.gitignore', '\n# Arquivos de build\n/dist\n');
  }
}

// Verificar configuração de build no package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
log('Verificando scripts de build no package.json...', colors.cyan);

// Verificar se existe um script de build
if (!packageJson.scripts || !packageJson.scripts.build) {
  log('ERRO: Script de build não encontrado no package.json!', colors.red);
  process.exit(1);
} else {
  log('Script de build encontrado: ' + packageJson.scripts.build, colors.green);
}

// Verificar dependências do Vite
if (!packageJson.dependencies['vite'] && !packageJson.devDependencies['vite']) {
  log('ERRO: Vite não encontrado nas dependências!', colors.red);
  process.exit(1);
}

log('\n✅ Tudo pronto para o build! Execute "npm run build" para gerar os arquivos estáticos.', colors.green);