// Script para verificar a estrutura de diretórios e caminhos de assets após o build
import fs from 'fs';
import path from 'path';

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Função para exibir mensagem colorida
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Verificar se um diretório existe
function checkDir(dirPath) {
  const exists = fs.existsSync(dirPath);
  const isDir = exists ? fs.statSync(dirPath).isDirectory() : false;
  
  if (exists && isDir) {
    log(`✅ Diretório encontrado: ${dirPath}`, colors.green);
    const files = fs.readdirSync(dirPath);
    log(`   Contém ${files.length} arquivos/diretórios`, colors.cyan);
    return true;
  } else if (exists && !isDir) {
    log(`❌ Caminho existe mas não é um diretório: ${dirPath}`, colors.red);
    return false;
  } else {
    log(`❌ Diretório não encontrado: ${dirPath}`, colors.red);
    return false;
  }
}

// Verificar se um arquivo existe
function checkFile(filePath) {
  const exists = fs.existsSync(filePath);
  const isFile = exists ? fs.statSync(filePath).isFile() : false;
  
  if (exists && isFile) {
    const stats = fs.statSync(filePath);
    log(`✅ Arquivo encontrado: ${filePath} (${formatBytes(stats.size)})`, colors.green);
    return true;
  } else if (exists && !isFile) {
    log(`❌ Caminho existe mas não é um arquivo: ${filePath}`, colors.red);
    return false;
  } else {
    log(`❌ Arquivo não encontrado: ${filePath}`, colors.red);
    return false;
  }
}

// Formatar tamanho em bytes para exibição
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Verificar estrutura do HTML e referências a assets
function checkHtmlAssetReferences(htmlPath) {
  log(`\n📋 Verificando referências a assets em ${htmlPath}`, colors.blue);
  
  if (!fs.existsSync(htmlPath)) {
    log(`❌ Arquivo HTML não encontrado: ${htmlPath}`, colors.red);
    return;
  }
  
  try {
    const content = fs.readFileSync(htmlPath, 'utf8');
    
    // Procurar por referências a assets
    const scriptMatches = content.match(/<script[^>]+src=["']([^"']+)["'][^>]*>/g) || [];
    const cssMatches = content.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/g) || [];
    const imgMatches = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/g) || [];
    
    log(`Encontradas ${scriptMatches.length} referências a scripts`, colors.cyan);
    log(`Encontradas ${cssMatches.length} referências a CSS`, colors.cyan);
    log(`Encontradas ${imgMatches.length} referências a imagens`, colors.cyan);
    
    // Extrair e verificar URLs
    const scriptUrls = scriptMatches.map(m => m.match(/src=["']([^"']+)["']/)[1]);
    const cssUrls = cssMatches.map(m => m.match(/href=["']([^"']+)["']/)[1]);
    const imgUrls = imgMatches.map(m => m.match(/src=["']([^"']+)["']/)[1]);
    
    log('\nReferências a scripts:', colors.yellow);
    scriptUrls.forEach(url => log(`  - ${url}`));
    
    log('\nReferências a CSS:', colors.yellow);
    cssUrls.forEach(url => log(`  - ${url}`));
    
    log('\nReferências a imagens:', colors.yellow);
    imgUrls.forEach(url => log(`  - ${url}`));
    
    // Analisar padrões de caminhos para assets
    const allUrls = [...scriptUrls, ...cssUrls, ...imgUrls];
    const assetsPatterns = allUrls
      .filter(url => !url.startsWith('http'))
      .map(url => url.split('/')[1])
      .filter((v, i, a) => a.indexOf(v) === i);
    
    log('\nPadrões de diretórios de assets detectados:', colors.magenta);
    assetsPatterns.forEach(pattern => log(`  - /${pattern}/`));
    
    return { scriptUrls, cssUrls, imgUrls, assetsPatterns };
  } catch (error) {
    log(`❌ Erro ao analisar HTML: ${error.message}`, colors.red);
  }
}

// Função principal
function runTests() {
  log('🔍 Iniciando testes de estrutura de build e caminhos...', colors.cyan);
  
  // 1. Verificar diretórios principais
  log('\n📋 Teste #1: Verificando diretórios principais', colors.blue);
  checkDir('dist');
  checkDir('dist/public');
  checkDir('dist/assets');
  checkDir('dist/public/assets');
  
  // 2. Verificar arquivos principais
  log('\n📋 Teste #2: Verificando arquivos principais', colors.blue);
  checkFile('dist/index.html');
  checkFile('dist/index.js');
  checkFile('dist/index.mjs');
  checkFile('vercel.json');
  
  // 3. Verificar referências em index.html
  const distHtml = 'dist/index.html';
  const rootHtml = 'index.html';
  
  if (fs.existsSync(distHtml)) {
    checkHtmlAssetReferences(distHtml);
  } else if (fs.existsSync(rootHtml)) {
    checkHtmlAssetReferences(rootHtml);
  }
  
  // 4. Verificar configuração do Vercel
  log('\n📋 Teste #4: Verificando configuração do Vercel', colors.blue);
  if (fs.existsSync('vercel.json')) {
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      
      log('Configuração do Vercel:', colors.cyan);
      if (vercelConfig.rewrites) {
        log(`Rewrites: ${vercelConfig.rewrites.length}`, colors.yellow);
        vercelConfig.rewrites.forEach((rewrite, i) => {
          log(`  [${i}] ${rewrite.source} -> ${rewrite.destination}`);
        });
      } else {
        log('Sem regras de rewrite definidas', colors.yellow);
      }
      
      if (vercelConfig.headers) {
        log(`Headers: ${vercelConfig.headers.length}`, colors.yellow);
        vercelConfig.headers.forEach((header, i) => {
          log(`  [${i}] ${header.source}`);
        });
      }
      
      if (vercelConfig.builds) {
        log(`Builds: ${vercelConfig.builds.length}`, colors.yellow);
        vercelConfig.builds.forEach((build, i) => {
          log(`  [${i}] ${build.src} -> ${build.use}`);
        });
      }
    } catch (error) {
      log(`❌ Erro ao analisar vercel.json: ${error.message}`, colors.red);
    }
  } else {
    log('❌ Arquivo vercel.json não encontrado', colors.red);
  }
  
  log('\n🏁 Testes concluídos!', colors.cyan);
}

// Executar os testes
runTests();