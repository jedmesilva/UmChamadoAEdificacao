import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cria o cliente Supabase com as credenciais do ambiente
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente para operações com a chave anônima (seguro para usar no lado do cliente)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com a chave de serviço (apenas para uso no servidor, com privilégios elevados)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para obter um cliente que bypass as políticas de RLS quando necessário para operações admin
export const getRLSBypassClient = (): SupabaseClient => {
  // verifica se a chave service role está disponível
  if (!supabaseServiceRoleKey) {
    console.warn('Service role key não disponível, usando cliente anônimo');
    return supabaseClient;
  }
  
  // Retorna o cliente admin com headers especiais para garantir o bypass do RLS
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.x',
        // Headers especiais para contornar o RLS
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'X-Supabase-Auth': 'service_role',
        'Prefer': 'return=representation'
      },
    },
  });
};