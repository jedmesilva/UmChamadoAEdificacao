// Este script é executado pela Vercel durante o processo de deploy
// Ele garante que a aplicação seja construída como um frontend React com Vite
// em vez de uma aplicação Node.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando o build especializado para a Vercel');

// Gera o arquivo vercel-env.js com as variáveis de ambiente
console.log('🔧 Gerando arquivo vercel-env.js com variáveis de ambiente');
try {
  execSync('node generate-vercel-env.cjs', { stdio: 'inherit' });
  console.log('✅ Arquivo vercel-env.js gerado com sucesso');
} catch (error) {
  console.error('⚠️ Aviso: Falha ao gerar vercel-env.js:', error.message);
  console.log('⚠️ Continuando o build mesmo assim...');
}

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