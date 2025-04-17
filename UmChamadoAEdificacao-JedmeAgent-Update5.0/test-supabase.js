// Script de teste para verificar a conexão com o Supabase
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Função de ajuda para obter variáveis de ambiente
function getEnvVar(key) {
  return process.env[key] || '';
}

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

// Função principal de teste
async function runTests() {
  log('🔍 Iniciando testes de integração com Supabase...', colors.cyan);
  
  // 1. Verificar variáveis de ambiente
  log('\n📋 Teste #1: Verificando variáveis de ambiente', colors.blue);
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
  
  if (!supabaseUrl) {
    log('❌ VITE_SUPABASE_URL não encontrada no ambiente', colors.red);
  } else {
    log(`✅ VITE_SUPABASE_URL encontrada: ${supabaseUrl.substring(0, 15)}...`, colors.green);
  }
  
  if (!supabaseKey) {
    log('❌ VITE_SUPABASE_ANON_KEY não encontrada no ambiente', colors.red);
  } else {
    log(`✅ VITE_SUPABASE_ANON_KEY encontrada: ${supabaseKey.substring(0, 5)}...`, colors.green);
  }
  
  if (!supabaseUrl || !supabaseKey) {
    log('⚠️ Não é possível continuar sem as variáveis de ambiente necessárias', colors.yellow);
    return;
  }
  
  // 2. Tentar criar cliente Supabase
  log('\n📋 Teste #2: Criando cliente Supabase', colors.blue);
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Cliente Supabase criado com sucesso', colors.green);
    
    // 3. Tentar fazer uma consulta simples
    log('\n📋 Teste #3: Testando consulta de dados', colors.blue);
    try {
      const { data, error } = await supabase
        .from('cartas_um_chamado_a_edificacao')
        .select('id, title, id_sumary_carta')
        .limit(5);
      
      if (error) throw error;
      
      log(`✅ Consulta bem-sucedida! Encontradas ${data.length} cartas`, colors.green);
      log('📝 Primeiros resultados:');
      console.table(data);
    } catch (error) {
      log(`❌ Erro ao consultar dados: ${error.message}`, colors.red);
      if (error.hint) {
        log(`🔍 Dica: ${error.hint}`, colors.yellow);
      }
      if (error.code) {
        log(`📋 Código do erro: ${error.code}`, colors.yellow);
      }
    }
  } catch (error) {
    log(`❌ Erro ao criar cliente Supabase: ${error.message}`, colors.red);
  }
  
  log('\n🏁 Testes concluídos!', colors.cyan);
}

// Executar os testes
runTests().catch(error => {
  log(`❌ Erro não tratado: ${error.message}`, colors.red);
  console.error(error);
});