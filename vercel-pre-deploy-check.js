// Script de verificação de pré-deploy para o Vercel
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para cores no console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Obter o diretório atual do módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função auxiliar para logs coloridos
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Função para verificar e relatar conflitos potenciais
function checkForConflicts(directory) {
  const conflictPatterns = [
    { base: 'index', extensions: ['.js', '.mjs', '.ts', '.tsx', '.jsx'] },
    { base: 'main', extensions: ['.js', '.mjs', '.ts', '.tsx', '.jsx'] },
    { base: 'app', extensions: ['.js', '.mjs', '.ts', '.tsx', '.jsx'] }
  ];
  
  let conflicts = [];
  
  conflictPatterns.forEach(pattern => {
    let matchingFiles = [];
    
    pattern.extensions.forEach(ext => {
      const filePath = path.join(directory, pattern.base + ext);
      if (fs.existsSync(filePath)) {
        matchingFiles.push(filePath);
      }
    });
    
    if (matchingFiles.length > 1) {
      conflicts.push({
        base: pattern.base,
        files: matchingFiles
      });
    }
  });
  
  return conflicts;
}

log('🔍 Verificando setup para deploy no Vercel...', colors.bold);

// Verificar estrutura de diretórios
log('\n1. Verificando estrutura de diretórios:', colors.cyan);

const requiredDirs = ['src', 'api'];
const requiredFiles = ['index.html', 'vercel.json', 'vite.config.ts'];

let allRequirementsMet = true;

// Verificar diretórios
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    log(`  ✅ Diretório ${dir} encontrado`, colors.green);
  } else {
    log(`  ❌ Diretório ${dir} não encontrado`, colors.red);
    allRequirementsMet = false;
  }
});

// Verificar arquivos
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    log(`  ✅ Arquivo ${file} encontrado`, colors.green);
  } else {
    log(`  ❌ Arquivo ${file} não encontrado`, colors.red);
    allRequirementsMet = false;
  }
});

// Verificar configuração de build
log('\n2. Verificando configuração de build:', colors.cyan);

const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.build) {
    log(`  ✅ Script de build encontrado: "${packageJson.scripts.build}"`, colors.green);
  } else {
    log(`  ❌ Script de build não encontrado no package.json`, colors.red);
    allRequirementsMet = false;
  }
  
  // Verificar dependências
  const hasDeps = (packageJson.dependencies && (
    packageJson.dependencies.vite || 
    packageJson.dependencies.react
  )) || (packageJson.devDependencies && (
    packageJson.devDependencies.vite || 
    packageJson.devDependencies.react
  ));
  
  if (hasDeps) {
    log(`  ✅ Dependências React/Vite encontradas`, colors.green);
  } else {
    log(`  ⚠️ Possíveis dependências ausentes (React/Vite)`, colors.yellow);
  }
} else {
  log(`  ❌ Arquivo package.json não encontrado`, colors.red);
  allRequirementsMet = false;
}

// Verificar vercel.json
log('\n3. Verificando configuração do Vercel:', colors.cyan);

const vercelJsonPath = path.join(__dirname, 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  
  // Verificar framework
  if (vercelJson.framework === 'vite') {
    log(`  ✅ Framework configurado corretamente: ${vercelJson.framework}`, colors.green);
  } else {
    log(`  ⚠️ Framework possivelmente incorreto: ${vercelJson.framework || 'não especificado'} (deveria ser "vite")`, colors.yellow);
  }
  
  // Verificar build output
  if (vercelJson.outputDirectory === 'dist') {
    log(`  ✅ Diretório de saída configurado corretamente: ${vercelJson.outputDirectory}`, colors.green);
  } else {
    log(`  ⚠️ Diretório de saída possivelmente incorreto: ${vercelJson.outputDirectory || 'não especificado'} (deveria ser "dist")`, colors.yellow);
  }
  
  // Verificar rotas
  if (vercelJson.routes) {
    log(`  ✅ Rotas configuradas (${vercelJson.routes.length} regras)`, colors.green);
    
    // Verificar se há uma rota para lidar com SPA routing
    const hasSpaRoute = vercelJson.routes.some(route => 
      (route.src === '/(.*)'|| route.handle === 'filesystem') && route.dest === '/index.html');
    
    if (hasSpaRoute) {
      log(`  ✅ Configuração para SPA routing encontrada`, colors.green);
    } else {
      log(`  ⚠️ Possível ausência de configuração para SPA routing`, colors.yellow);
    }
  } else {
    log(`  ⚠️ Nenhuma configuração de rota encontrada`, colors.yellow);
  }
} else {
  log(`  ❌ Arquivo vercel.json não encontrado`, colors.red);
  allRequirementsMet = false;
}

// Verificar arquivos API
log('\n4. Verificando endpoints de API:', colors.cyan);

const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(apiDir)) {
  const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js'));
  
  if (apiFiles.length > 0) {
    log(`  ✅ ${apiFiles.length} arquivo(s) de API encontrado(s)`, colors.green);
    
    // Verificar formato das APIs
    let validApis = 0;
    apiFiles.forEach(file => {
      const content = fs.readFileSync(path.join(apiDir, file), 'utf8');
      if (content.includes('export default function handler') || content.includes('export default async function handler')) {
        validApis++;
      }
    });
    
    if (validApis === apiFiles.length) {
      log(`  ✅ Todos os ${validApis} arquivo(s) de API têm o formato correto`, colors.green);
    } else {
      log(`  ⚠️ Apenas ${validApis} de ${apiFiles.length} arquivo(s) de API têm o formato correto`, colors.yellow);
    }
  } else {
    log(`  ⚠️ Nenhum arquivo de API encontrado`, colors.yellow);
  }
} else {
  log(`  ❌ Diretório api/ não encontrado`, colors.red);
}

// Verificar conflitos de arquivos
log('\n5. Verificando conflitos de arquivos:', colors.cyan);

const rootConflicts = checkForConflicts(__dirname);
const srcConflicts = checkForConflicts(path.join(__dirname, 'src'));

if (rootConflicts.length === 0 && srcConflicts.length === 0) {
  log(`  ✅ Nenhum conflito de arquivo encontrado`, colors.green);
} else {
  log(`  ⚠️ Possíveis conflitos de arquivo encontrados:`, colors.yellow);
  
  if (rootConflicts.length > 0) {
    log(`    Na raiz do projeto:`, colors.yellow);
    rootConflicts.forEach(conflict => {
      log(`    - Múltiplos arquivos com base "${conflict.base}": ${conflict.files.join(', ')}`, colors.yellow);
    });
  }
  
  if (srcConflicts.length > 0) {
    log(`    No diretório src/:`, colors.yellow);
    srcConflicts.forEach(conflict => {
      log(`    - Múltiplos arquivos com base "${conflict.base}": ${conflict.files.map(f => path.relative(__dirname, f)).join(', ')}`, colors.yellow);
    });
  }
}

// Verificar index.html
log('\n6. Verificando index.html:', colors.cyan);

const indexHtmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  const content = fs.readFileSync(indexHtmlPath, 'utf8');
  
  if (content.includes('<div id="root"></div>')) {
    log(`  ✅ Elemento root encontrado no index.html`, colors.green);
  } else {
    log(`  ⚠️ Elemento root não encontrado no index.html`, colors.yellow);
  }
  
  if (content.includes('src="/src/main.tsx"')) {
    log(`  ✅ Referência ao arquivo main.tsx encontrada`, colors.green);
  } else {
    log(`  ⚠️ Referência ao arquivo main.tsx não encontrada ou em formato diferente`, colors.yellow);
  }
} else {
  log(`  ❌ Arquivo index.html não encontrado`, colors.red);
}

// Resumo
log('\n📋 Resumo da verificação:', colors.bold);

if (allRequirementsMet) {
  log(`  ✅ Todos os requisitos básicos para deploy no Vercel estão atendidos!`, colors.green);
  log(`  🚀 Sua aplicação está pronta para deploy.`, colors.green);
} else {
  log(`  ⚠️ Há problemas que precisam ser resolvidos antes do deploy.`, colors.yellow);
  log(`  📝 Revise os itens marcados com ❌ acima e corrija-os.`, colors.yellow);
}

log(`\n💡 Próximos passos:`, colors.cyan);
log(`  1. Execute node prepare-build.js para garantir que todos os arquivos estejam nos locais corretos`);
log(`  2. Faça o commit das alterações para o repositório Git`);
log(`  3. Configure o projeto no Vercel com as variáveis de ambiente necessárias:`);
log(`     - VITE_SUPABASE_URL`);
log(`     - VITE_SUPABASE_ANON_KEY`);
log(`  4. Inicie o deploy no Vercel`);