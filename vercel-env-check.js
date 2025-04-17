// Script para verificar variáveis de ambiente necessárias para o Vercel
import { createClient } from '@supabase/supabase-js';

// Configuração para cores no console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Função auxiliar para logs coloridos
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

// Lista de variáveis necessárias
const requiredVars = [
  { name: 'VITE_SUPABASE_URL', description: 'URL do projeto Supabase' },
  { name: 'VITE_SUPABASE_ANON_KEY', description: 'Chave anônima do Supabase' }
];

log('🔍 Verificando variáveis de ambiente necessárias...', colors.bold);

let allVarsAvailable = true;

// Verificar cada variável
requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  if (value) {
    log(`  ✅ ${variable.name}: Configurada`, colors.green);
  } else {
    log(`  ❌ ${variable.name}: Não configurada - ${variable.description}`, colors.red);
    allVarsAvailable = false;
  }
});

// Se todas as variáveis do Supabase estiverem disponíveis, tenta uma conexão
if (allVarsAvailable) {
  log('\nTentando conectar ao Supabase...', colors.cyan);
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Testar a conexão com uma consulta simples
  supabase
    .from('subscription_um_chamado')
    .select('count', { count: 'exact' })
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        log(`  ❌ Erro ao conectar: ${error.message}`, colors.red);
      } else {
        log(`  ✅ Conexão bem-sucedida!`, colors.green);
        log(`  📊 Contagem de inscrições: ${data.count || 0}`, colors.green);
      }
    })
    .catch(err => {
      log(`  ❌ Erro ao conectar: ${err.message}`, colors.red);
    });
}

// Resumo
log('\n📋 Resumo:', colors.bold);

if (allVarsAvailable) {
  log('  ✅ Todas as variáveis necessárias estão configuradas!', colors.green);
} else {
  log('  ⚠️ Variáveis de ambiente ausentes. Configure-as no Vercel antes do deploy.', colors.yellow);
}

// Instruções
if (!allVarsAvailable) {
  log('\n🔧 Como configurar as variáveis no Vercel:', colors.cyan);
  log('  1. Vá para o Dashboard do Vercel e selecione seu projeto');
  log('  2. Clique na aba "Settings" e depois em "Environment Variables"');
  log('  3. Adicione cada variável ausente com seu valor correspondente');
  log('  4. Configure as variáveis para os ambientes "Production", "Preview" e "Development"');
  log('  5. Clique em "Save" para salvar as configurações');
}