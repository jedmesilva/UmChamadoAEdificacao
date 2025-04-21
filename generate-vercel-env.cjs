/**
 * Este script gera o arquivo vercel-env.js durante o build na Vercel
 * O arquivo contém as variáveis de ambiente necessárias para o frontend
 */

const fs = require('fs');
const path = require('path');

// Configuração para cores no console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Lista de variáveis de ambiente que queremos exportar para o frontend
const envVarsToExport = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

// Verifica se estamos na Vercel
const isVercel = process.env.VERCEL === '1';

log(`🔄 Gerando arquivo vercel-env.js ${isVercel ? 'para Vercel' : 'para desenvolvimento local'}...`, colors.cyan);

// Constrói o objeto de variáveis de ambiente
const exportedVars = {};
let missingVars = [];

envVarsToExport.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    exportedVars[varName] = value;
    // Não mostramos os valores reais no log por segurança
    log(`  ✅ ${varName}: Configurada`, colors.green);
  } else {
    exportedVars[varName] = '';
    missingVars.push(varName);
    log(`  ⚠️ ${varName}: Não configurada`, colors.yellow);
  }
});

// Adiciona a variável de ambiente identificando o ambiente
exportedVars.DEPLOYMENT_ENV = isVercel ? 'production' : 'development';

// Constrói o conteúdo do arquivo
const fileContent = `/**
 * Este arquivo foi gerado automaticamente em: ${new Date().toISOString()}
 * Contém as variáveis de ambiente para uso no frontend
 */

window.ENV = ${JSON.stringify(exportedVars, null, 2)};

console.log('Ambiente carregado via vercel-env.js:', window.ENV.DEPLOYMENT_ENV);
`;

// Diretório de saída
const outDir = path.resolve(isVercel ? './dist/public' : './client/public');
const outFile = path.join(outDir, 'vercel-env.js');

// Garante que o diretório existe
if (!fs.existsSync(outDir)) {
  log(`  📁 Criando diretório: ${outDir}`, colors.cyan);
  fs.mkdirSync(outDir, { recursive: true });
}

// Escreve o arquivo
try {
  fs.writeFileSync(outFile, fileContent);
  log(`  📄 Arquivo criado: ${outFile}`, colors.green);
} catch (error) {
  log(`  ❌ Erro ao criar arquivo: ${error.message}`, colors.red);
  process.exit(1);
}

// Aviso sobre variáveis ausentes
if (missingVars.length > 0) {
  log('\n⚠️ Atenção: Algumas variáveis de ambiente não estão configuradas:', colors.yellow);
  missingVars.forEach(varName => {
    log(`  - ${varName}`, colors.yellow);
  });
  
  if (isVercel) {
    log('\n📋 Como configurar na Vercel:', colors.bold);
    log('  1. Acesse o painel de controle da Vercel', colors.reset);
    log('  2. Vá em Project Settings > Environment Variables', colors.reset);
    log('  3. Adicione as variáveis ausentes', colors.reset);
    log('  4. Faça um novo deploy', colors.reset);
  }
} else {
  log('\n✅ Todas as variáveis de ambiente necessárias estão configuradas!', colors.green);
}

log(`\n🚀 Processo concluído!`, colors.bold);