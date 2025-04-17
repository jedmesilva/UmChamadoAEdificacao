#!/usr/bin/env node

/**
 * Este script verifica se a versão do Node.js está compatível
 * com as engines definidas no package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==================================================');
console.log('VERIFICAÇÃO DE VERSÃO DO NODE.JS PARA VERCEL');
console.log('==================================================');

// Obter a versão atual do Node.js
const nodeVersion = process.version;
console.log(`Versão atual do Node.js: ${nodeVersion}`);

try {
  // Ler o package.json
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json não encontrado');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Verificar a seção engines
  if (!packageJson.engines || !packageJson.engines.node) {
    console.log('⚠️ Nenhuma restrição de versão do Node.js encontrada em package.json');
    console.log('Recomendamos adicionar a seção "engines" ao package.json para garantir compatibilidade.');
    process.exit(0);
  }
  
  const engineRequirement = packageJson.engines.node;
  console.log(`Requisito de versão Node.js no package.json: ${engineRequirement}`);
  
  // Verificar se a versão atual atende aos requisitos
  if (semver.satisfies(nodeVersion, engineRequirement)) {
    console.log('✅ Versão do Node.js é compatível com os requisitos');
  } else {
    console.log('❌ Versão do Node.js não atende aos requisitos!');
    console.log(`A versão atual ${nodeVersion} não é compatível com ${engineRequirement}`);
    
    // Vercel usa Node.js 16 por padrão em builds
    console.log('\nRecomendações:');
    console.log('1. Atualizar o package.json para suportar a versão atual do Node.js');
    console.log('2. Ou definir a versão do Node.js no arquivo .nvmrc ou .node-version');
    console.log('3. Ou configurar a versão do Node.js no painel do Vercel');
    
    process.exit(1);
  }
  
  // Verificar configuração do Vercel específica para Node.js
  const vercelJsonPath = path.join(__dirname, 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    
    if (!vercelJson.buildCommand || !vercelJson.buildCommand.includes('node vercel-cleanup.js')) {
      console.log('\n⚠️ vercel.json pode não estar executando scripts de limpeza antes do build');
      console.log('Recomendamos atualizar vercel.json com:');
      console.log('  "buildCommand": "node vercel-cleanup.js && npm run build"');
    }
  }
  
} catch (error) {
  console.error('❌ Erro ao verificar compatibilidade:', error.message);
  process.exit(1);
}

// Verificar arquivos .nvmrc e .node-version
const nvmrcPath = path.join(__dirname, '.nvmrc');
const nodeVersionPath = path.join(__dirname, '.node-version');

console.log('\nVerificando arquivos de configuração de versão do Node.js:');

if (fs.existsSync(nvmrcPath)) {
  const nvmrcVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
  console.log(`✅ Arquivo .nvmrc encontrado, definindo versão: ${nvmrcVersion}`);
  
  if (!semver.satisfies(nodeVersion, nvmrcVersion)) {
    console.log(`⚠️ A versão atual do Node.js (${nodeVersion}) não corresponde ao .nvmrc (${nvmrcVersion})`);
  }
} else {
  console.log('❓ Arquivo .nvmrc não encontrado');
}

if (fs.existsSync(nodeVersionPath)) {
  const nodeVersionValue = fs.readFileSync(nodeVersionPath, 'utf8').trim();
  console.log(`✅ Arquivo .node-version encontrado, definindo versão: ${nodeVersionValue}`);
  
  if (!semver.satisfies(nodeVersion, nodeVersionValue)) {
    console.log(`⚠️ A versão atual do Node.js (${nodeVersion}) não corresponde ao .node-version (${nodeVersionValue})`);
  }
} else {
  console.log('❓ Arquivo .node-version não encontrado');
}

console.log('\n==================================================');
console.log('RESUMO:');
console.log('✅ Verificação de versão do Node.js concluída');
console.log('==================================================');