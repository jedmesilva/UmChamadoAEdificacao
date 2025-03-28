import { createClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente devem estar disponíveis
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('As variáveis de ambiente do Supabase não estão configuradas.');
}

// Cria o cliente Supabase para o frontend
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);