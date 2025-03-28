// Script de configuração para o build do Vercel (ESM)
// Executa tarefas adicionais após o build padrão

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Executa o build normal primeiro
console.log('Iniciando build para o Vercel...');

try {
  // Configurando para ESM
  console.log('Configurando formato de build para ESM...');
  
  // Cria um arquivo .env para o ambiente de produção se não existir
  if (!fs.existsSync('.env')) {
    console.log('Criando arquivo .env padrão...');
    fs.writeFileSync('.env', 'STORAGE_TYPE=supabase\n');
  }
  
  // Verifica se o diretório dist existe
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  // Cópia arquivos .mjs para a pasta dist
  console.log('Copiando arquivos .mjs para a pasta dist...');
  if (fs.existsSync('index.mjs')) {
    fs.copyFileSync('index.mjs', path.join('dist', 'index.mjs'));
  }
  
  // Garantir que a pasta api exista em dist
  if (!fs.existsSync(path.join('dist', 'api'))) {
    fs.mkdirSync(path.join('dist', 'api'));
  }
  
  // Copiar arquivos de api
  if (fs.existsSync('api/index.mjs')) {
    fs.copyFileSync('api/index.mjs', path.join('dist', 'api', 'index.mjs'));
  }
  
  if (fs.existsSync('api/healthcheck.mjs')) {
    fs.copyFileSync('api/healthcheck.mjs', path.join('dist', 'api', 'healthcheck.mjs'));
  }
  
  console.log('Build para Vercel concluído com sucesso!');
} catch (error) {
  console.error('Erro durante o build para Vercel:', error);
  process.exit(1);
}