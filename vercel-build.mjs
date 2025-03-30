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
  
  // Verificar se o index.html principal existe, caso contrário, copiar o fallback
  if (!fs.existsSync(path.join('dist', 'index.html'))) {
    console.log('Index principal não encontrado, usando fallback...');
    if (fs.existsSync('static-index.html')) {
      // Usar o fallback estático se disponível
      fs.copyFileSync('static-index.html', path.join('dist', 'index.html'));
    } else if (fs.existsSync(path.join('client', 'index.html'))) {
      // Tentar usar o index.html do cliente
      fs.copyFileSync(path.join('client', 'index.html'), path.join('dist', 'index.html'));
    } else {
      // Criar um index.html básico
      console.log('Criando index.html básico para redirecionamento...');
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Um Chamado à Edificação</title>
  <script>
    // Redirecionar para a aplicação frontend
    window.location.href = '/client/';
  </script>
</head>
<body>
  <h1>Carregando aplicação...</h1>
  <p>Você será redirecionado automaticamente. Se não for redirecionado, <a href="/client/">clique aqui</a>.</p>
</body>
</html>`;
      fs.writeFileSync(path.join('dist', 'index.html'), htmlContent);
    }
  }
  
  console.log('Build para Vercel concluído com sucesso!');
} catch (error) {
  console.error('Erro durante o build para Vercel:', error);
  process.exit(1);
}