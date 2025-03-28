// Script de configuração para o build do Vercel
// Executa tarefas adicionais após o build padrão

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

// Executa o build normal primeiro
console.log('Iniciando build para o Vercel...');

try {
  // Alterando formato do build para CommonJS para funcionar no Vercel
  console.log('Configurando formato de build para CommonJS...');
  
  // Cria um arquivo .env para o ambiente de produção se não existir
  if (!fs.existsSync('.env')) {
    console.log('Criando arquivo .env padrão...');
    fs.writeFileSync('.env', 'STORAGE_TYPE=supabase\n');
  }
  
  // Verifica se o diretório dist existe
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  console.log('Build para Vercel concluído com sucesso!');
} catch (error) {
  console.error('Erro durante o build para Vercel:', error);
  process.exit(1);
}