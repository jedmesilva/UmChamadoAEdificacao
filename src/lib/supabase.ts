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
    return value.startsWith('%') && value.endsWith('%') ? '' : value;
  }
  
  // Tentar obter das variáveis de ambiente do Vite
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  
  // Fallback
  return '';
}

// Obter as variáveis de ambiente do Supabase
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY');

// Registrar no console para depuração
console.log('Supabase URL disponível:', !!supabaseUrl);
console.log('Supabase Anon Key disponível:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('As variáveis de ambiente do Supabase não estão configuradas corretamente.');
}

// Cria o cliente Supabase para o frontend
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);