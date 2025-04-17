// Este script é executado pela Vercel durante o processo de deploy
// Ele garante que a aplicação seja construída como um frontend React com Vite
// em vez de uma aplicação Node.js
// Também valida o ambiente antes do build

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Função para verificar variáveis de ambiente críticas
function validateEnvironment() {
  console.log('🔍 Verificando variáveis de ambiente...');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ];
  
  const alternativeVars = [
    'VITE_SUPABASE_URL', 
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  const alternative = alternativeVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Atenção: As seguintes variáveis de ambiente estão faltando: ${missing.join(', ')}`);
    
    if (alternative.length === 0) {
      console.log('✅ Alternativas VITE_ encontradas, o frontend deve funcionar.');
    } else {
      console.warn(`⚠️ As alternativas também estão faltando: ${alternative.join(', ')}`);
      console.warn('⚠️ O frontend pode não conseguir acessar o Supabase!');
    }
    
    // Verificar se as alternativas VITE_ estão disponíveis
    for (const envVar of alternativeVars) {
      if (process.env[envVar]) {
        // Criar uma versão sem VITE_ como fallback
        const standardName = envVar.replace('VITE_', '');
        if (!process.env[standardName]) {
          process.env[standardName] = process.env[envVar];
          console.log(`📝 Copiado ${envVar} para ${standardName} como fallback`);
        }
      }
    }
  } else {
    console.log('✅ Todas as variáveis de ambiente requiridas estão presentes.');
  }
}

console.log('🚀 Iniciando o build especializado para a Vercel');

// Valida o ambiente antes de continuar
validateEnvironment();

// Cria um arquivo .env na pasta api se não existir
const apiEnvPath = path.resolve('./api/.env');
if (!fs.existsSync(apiEnvPath)) {
  console.log('📝 Criando arquivo .env na pasta api para compatibilidade...');
  
  const envContent = [
    'SUPABASE_URL=' + (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
    'SUPABASE_SERVICE_ROLE_KEY=' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
    'SUPABASE_ANON_KEY=' + (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '')
  ].join('\n');
  
  fs.writeFileSync(apiEnvPath, envContent);
  console.log('✅ Arquivo .env criado na pasta api');
}

// Copia as variáveis de ambiente para .env.production local
const envProductionPath = path.resolve('./.env.production');
if (!fs.existsSync(envProductionPath)) {
  console.log('📝 Criando arquivo .env.production para o frontend...');
  
  const envContent = [
    'VITE_SUPABASE_URL=' + (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''),
    'VITE_SUPABASE_ANON_KEY=' + (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '')
  ].join('\n');
  
  fs.writeFileSync(envProductionPath, envContent);
  console.log('✅ Arquivo .env.production criado');
}

// Cria um arquivo vercel-env.js para injetar as variáveis também em runtime
const vercelEnvJsPath = path.resolve('./public/vercel-env.js');
if (!fs.existsSync(path.dirname(vercelEnvJsPath))) {
  fs.mkdirSync(path.dirname(vercelEnvJsPath), { recursive: true });
}

console.log('📝 Criando arquivo vercel-env.js para injeção em runtime...');
const envJsContent = `
// Arquivo gerado automaticamente durante o build na Vercel
window.ENV = {
  VITE_SUPABASE_URL: "${process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''}",
  VITE_SUPABASE_ANON_KEY: "${process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''}",
  DEPLOY_ID: "${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}",
  VERCEL_ENV: "${process.env.VERCEL_ENV || 'development'}"
};
`;

fs.writeFileSync(vercelEnvJsPath, envJsContent);
console.log('✅ Arquivo vercel-env.js criado');

// Usa a configuração de Vite específica para frontend
console.log('📦 Construindo o frontend React com Vite');
execSync('npx vite build --config vite.frontend.config.ts', { stdio: 'inherit' });

// Garante que o arquivo index.html esteja na raiz do diretório dist
// (O Vercel espera isso para sites estáticos)
const distDir = path.resolve('./dist');
const distPublicDir = path.resolve('./dist/public');

console.log('🔍 Verificando arquivos estáticos na pasta dist');

// Se a pasta dist/public existe, move seu conteúdo para dist
if (fs.existsSync(distPublicDir) && fs.statSync(distPublicDir).isDirectory()) {
  console.log('📂 Movendo arquivos de dist/public para dist');
  
  // Lista todos os arquivos em dist/public
  const files = fs.readdirSync(distPublicDir);
  
  // Move cada arquivo para dist
  files.forEach(file => {
    const srcPath = path.join(distPublicDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(destPath)) {
      fs.rmSync(destPath, { recursive: true, force: true });
    }
    
    fs.renameSync(srcPath, destPath);
    console.log(`  ✓ Movido: ${file}`);
  });
  
  // Remove a pasta dist/public vazia
  fs.rmdirSync(distPublicDir);
}

// Verifica se index.html existe na raiz de dist
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('❌ Erro: index.html não encontrado na pasta dist');
  process.exit(1);
} else {
  console.log('✅ index.html encontrado na raiz da pasta dist');
}

console.log('🎉 Build para Vercel concluído com sucesso!');