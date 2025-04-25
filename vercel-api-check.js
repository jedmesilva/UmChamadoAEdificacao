#!/usr/bin/env node

/**
 * Este script verifica se os arquivos de API estão configurados 
 * corretamente para o deploy na Vercel
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==================================================');
console.log('VERIFICAÇÃO DE ARQUIVOS DE API PARA VERCEL');
console.log('==================================================');

// 1. Verificar se a pasta api/ existe
console.log('\n1. Verificando pasta api/...');

let apiExists = false;
let apiFiles = [];

try {
  if (fs.existsSync('api') && fs.statSync('api').isDirectory()) {
    apiExists = true;
    apiFiles = fs.readdirSync('api').filter(file => 
      file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.mjs') || file.endsWith('.mts')
    );
    
    console.log(`✅ Pasta api/ encontrada com ${apiFiles.length} arquivos.`);
  } else {
    console.log('❌ Pasta api/ não encontrada ou não é um diretório.');
    console.log('   Crie uma pasta api/ na raiz do projeto para suas funções serverless.');
    
    // Criar diretório de API se não existir
    fs.mkdirSync('api', { recursive: true });
    console.log('✅ Pasta api/ criada.');
    
    // Criar um arquivo de exemplo
    const healthcheckContent = `export default function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    message: 'API está funcionando corretamente',
    timestamp: new Date().toISOString()
  });
}`;
    
    fs.writeFileSync('api/healthcheck.js', healthcheckContent);
    console.log('✅ Arquivo api/healthcheck.js de exemplo criado.');
    
    apiExists = true;
    apiFiles = ['healthcheck.js'];
  }
} catch (error) {
  console.error('❌ Erro ao verificar a pasta api/:', error.message);
}

// 2. Verificar se os arquivos de API usam o formato correto
if (apiExists && apiFiles.length > 0) {
  console.log('\n2. Verificando formato dos arquivos de API...');
  
  let inconsistentFiles = [];
  
  for (const file of apiFiles) {
    const filePath = path.join('api', file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar se o arquivo usa a sintaxe de exportação correta
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        if (!content.includes('export default') && !content.includes('module.exports')) {
          inconsistentFiles.push({ file, reason: 'não exporta uma função handler' });
        } else if (content.includes('.mjs') && !content.includes('export default')) {
          inconsistentFiles.push({ file, reason: 'usa module.exports em vez de export default em um arquivo .mjs' });
        }
      }
      
      // Verificar se estamos usando .mjs (que pode causar problemas)
      if (file.endsWith('.mjs') || file.endsWith('.mts')) {
        inconsistentFiles.push({ file, reason: 'usa extensão .mjs/.mts que pode causar problemas - use .js ou .ts' });
      }
    } catch (error) {
      console.error(`❌ Erro ao ler o arquivo ${filePath}:`, error.message);
    }
  }
  
  if (inconsistentFiles.length === 0) {
    console.log('✅ Todos os arquivos de API parecem estar formatados corretamente.');
  } else {
    console.log('⚠️ Alguns arquivos de API podem ter problemas:');
    inconsistentFiles.forEach(({ file, reason }) => {
      console.log(`   - ${file}: ${reason}`);
    });
  }
}

// 3. Verificar se vercel.json está configurado para a API
console.log('\n3. Verificando configuração de API no vercel.json...');

try {
  if (fs.existsSync('vercel.json')) {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    if (vercelConfig.rewrites && vercelConfig.rewrites.some(r => r.source && r.source.startsWith('/api/'))) {
      console.log('✅ vercel.json contém regras de rewrite para /api/');
    } else {
      console.log('⚠️ vercel.json não contém regras de rewrite específicas para /api/');
      console.log('   Considere adicionar esta configuração:');
      console.log('   "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }]');
    }
  } else {
    console.log('❌ vercel.json não encontrado. Crie este arquivo para configurar corretamente suas APIs.');
  }
} catch (error) {
  console.error('❌ Erro ao verificar vercel.json:', error.message);
}

// Resumo
console.log('\n==================================================');
console.log('RESUMO DE API:');

if (!apiExists) {
  console.log('❌ A pasta api/ não existe. Você precisa criar funções serverless para sua aplicação.');
} else if (apiFiles.length === 0) {
  console.log('⚠️ A pasta api/ está vazia. Adicione funções serverless para sua aplicação.');
} else {
  console.log(`✅ Encontrado(s) ${apiFiles.length} arquivo(s) de API.`);
}

console.log('==================================================');