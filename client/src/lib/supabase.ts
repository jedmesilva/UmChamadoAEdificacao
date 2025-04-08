import { createClient } from '@supabase/supabase-js';

// Adicionar tipagem para o objeto ENV global na window
declare global {
  interface Window {
    ENV?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      [key: string]: string | undefined;
    };
  }
}

// Obter as variáveis de ambiente de múltiplas fontes possíveis
function getEnvVariable(key: string): string {
  // Tentar obter da janela primeiro (fallback para produção)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
    const value = window.ENV[key] || '';
    // Substituir os placeholders se necessário
    if (value && !(value.startsWith('%') && value.endsWith('%'))) {
      console.log(`Usando variável ${key} do objeto global window.ENV`);
      return value;
    }
  }
  
  // Tentar obter das variáveis de ambiente do Vite
  try {
    if (import.meta.env && import.meta.env[key]) {
      const value = import.meta.env[key] as string;
      if (value) {
        console.log(`Usando variável ${key} das variáveis de ambiente Vite`);
        return value;
      }
    }
  } catch (err) {
    console.warn(`Erro ao acessar import.meta.env[${key}]:`, err);
  }
  
  // Valores hardcoded de fallback apenas para desenvolvimento
  // Esses valores não funcionarão em produção e serão substituídos
  // pelos valores reais fornecidos através de window.ENV ou import.meta.env
  if (key === 'VITE_SUPABASE_URL' && process.env.NODE_ENV !== 'production') {
    console.warn('Usando valor de fallback para SUPABASE_URL - isso só deve ocorrer em desenvolvimento');
    // Vamos evitar hardcoded aqui, apenas notificamos
    return '';
  }
  
  if (key === 'VITE_SUPABASE_ANON_KEY' && process.env.NODE_ENV !== 'production') {
    console.warn('Usando valor de fallback para SUPABASE_ANON_KEY - isso só deve ocorrer em desenvolvimento');
    // Vamos evitar hardcoded aqui, apenas notificamos
    return '';
  }
  
  // Não encontrado em nenhum lugar
  console.warn(`Variável de ambiente ${key} não encontrada em nenhuma fonte`);
  return '';
}

// Obter as variáveis de ambiente do Supabase
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY');

// Registrar no console para depuração
console.log('Ambiente de execução:', process.env.NODE_ENV || 'desenvolvimento');
console.log('Supabase URL disponível:', !!supabaseUrl);
console.log('Supabase Anon Key disponível:', !!supabaseAnonKey);

// Valores de fallback para desenvolvimento (APENAS PARA PROPÓSITOS DE DEMONSTRAÇÃO)
// Esses valores não devem ser usados em produção e são apenas placeholders
let finalSupabaseUrl = supabaseUrl;
let finalSupabaseAnonKey = supabaseAnonKey;

if (!finalSupabaseUrl || !finalSupabaseAnonKey) {
  console.error('⚠️ Variáveis de ambiente do Supabase ausentes ou inválidas!');
  console.error('⚠️ Isso resultará em erros nas operações que envolvem o Supabase.');
  
  if (process.env.NODE_ENV !== 'production') {
    // Em desenvolvimento, podemos usar valores de demonstração para evitar erros imediatos
    // Isso não deve ser feito em produção
    console.warn('Ambiente de desenvolvimento: usando URLs e chaves de demonstração que não funcionarão com operações reais');
    
    // Garantimos valores não-vazios para evitar erros ao criar o cliente
    finalSupabaseUrl = finalSupabaseUrl || 'https://exemplo.supabase.co';
    finalSupabaseAnonKey = finalSupabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidW5hdXRoZW50aWNhdGVkIn0.example';
  }
}

// Cria o cliente Supabase para o frontend
export const supabaseClient = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Adiciona um método para verificar facilmente se o cliente está configurado corretamente
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey;
};