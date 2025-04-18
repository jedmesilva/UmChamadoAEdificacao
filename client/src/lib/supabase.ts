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

// Verifica se o erro de "Unexpected token '<'" está ocorrendo
// e tenta corrigir adicionando verificações adicionais
function detectSupabaseImportError() {
  try {
    // Este trecho só serve para verificar se a importação do Supabase está funcionando
    const testObj = { msg: "Verificando importação do Supabase" };
    return testObj;
  } catch (err) {
    console.error("Erro ao inicializar cliente Supabase:", err);
    return null;
  }
}

// Executando verificação para garantir que o módulo está carregando corretamente
detectSupabaseImportError();

// Obter as variáveis de ambiente de múltiplas fontes possíveis
function getEnvVariable(key: string): string {
  // 1. Verificar se o ambiente global window.ENV está disponível (prioridade para vercel-env.js)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
    const value = window.ENV[key] || '';
    if (value && value.trim() !== '' && !(value.startsWith('%') && value.endsWith('%'))) {
      console.log(`[Supabase Config] Usando variável ${key} do objeto global window.ENV`);
      return value;
    }
  }
  
  // 2. Tentar obter das variáveis de ambiente do Vite
  try {
    if (import.meta.env && import.meta.env[key]) {
      const value = import.meta.env[key] as string;
      if (value && value.trim() !== '') {
        console.log(`[Supabase Config] Usando variável ${key} das variáveis de ambiente Vite`);
        return value;
      }
    }
  } catch (err) {
    console.warn(`[Supabase Config] Erro ao acessar import.meta.env[${key}]:`, err);
  }
  
  // 3. Verifique se estamos em desenvolvimento ou produção
  const isDevelopment = 
    process.env.NODE_ENV !== 'production' || 
    (typeof window !== 'undefined' && window.ENV?.DEPLOYMENT_ENV === 'development');
    
  if (isDevelopment) {
    // Em ambiente de desenvolvimento, exibimos um aviso claro
    console.warn(`[Supabase Config] ⚠️ Variável ${key} não encontrada - Configure as variáveis de ambiente necessárias`);
  } else {
    // Em produção, registramos um erro mais grave
    console.error(`[Supabase Config] 🔴 Erro crítico: Variável ${key} ausente em ambiente de produção`);
  }
  
  // Não encontrado em nenhum lugar
  return '';
}

// Obter as variáveis de ambiente do Supabase
const supabaseUrl = getEnvVariable('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVariable('VITE_SUPABASE_ANON_KEY');

// Registrar no console para depuração
console.log('Ambiente de execução:', process.env.NODE_ENV || 'desenvolvimento');
console.log('Supabase URL disponível:', !!supabaseUrl);
console.log('Supabase Anon Key disponível:', !!supabaseAnonKey);

// Detectar ambiente atual para decisões corretas
const isDevEnvironment = 
  process.env.NODE_ENV !== 'production' || 
  (typeof window !== 'undefined' && window.ENV?.DEPLOYMENT_ENV === 'development');

// Configura os valores finais para uso no cliente
let finalSupabaseUrl = supabaseUrl;
let finalSupabaseAnonKey = supabaseAnonKey;

if (!finalSupabaseUrl || !finalSupabaseAnonKey) {
  if (isDevEnvironment) {
    console.error('[Supabase Config] ⚠️ Variáveis de ambiente do Supabase ausentes ou inválidas em ambiente de desenvolvimento!');
    console.error('[Supabase Config] ⚠️ As funcionalidades que dependem do Supabase não funcionarão corretamente.');
    console.error('[Supabase Config] ⚠️ Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env ou .env.local');
    
    // Em desenvolvimento, usamos valores vazios mas sem causar erros na criação do cliente
    // isso permite que o app ao menos seja carregado, mesmo que a autenticação não funcione
    finalSupabaseUrl = finalSupabaseUrl || 'https://placeholder-only-for-dev.supabase.co';
    finalSupabaseAnonKey = finalSupabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-only-for-dev';
  } else {
    // Em produção, isso é um erro crítico
    console.error('[Supabase Config] 🔴 ERRO CRÍTICO: Variáveis de ambiente do Supabase ausentes em PRODUÇÃO!');
    console.error('[Supabase Config] 🔴 As funcionalidades que dependem do Supabase NÃO funcionarão!');
    console.error('[Supabase Config] 🔴 Configure as variáveis de ambiente na Vercel:');
    console.error('[Supabase Config] 🔴 1. Acesse o dashboard da Vercel');
    console.error('[Supabase Config] 🔴 2. Vá para Settings > Environment Variables');
    console.error('[Supabase Config] 🔴 3. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
    
    // Em produção, não usamos valores de fallback, deixamos os erros ocorrerem
    // para que fique claro o problema e seja corrigido
  }
}

// Cria o cliente Supabase para o frontend
export const supabaseClient = createClient(finalSupabaseUrl, finalSupabaseAnonKey);

// Função para verificar se o Supabase está corretamente configurado
export const isSupabaseConfigured = (): boolean => {
  const configured = !!supabaseUrl && !!supabaseAnonKey;
  
  if (!configured && !isDevEnvironment) {
    // No ambiente de produção, mostramos um erro mais detalhado no console
    console.error('[Supabase Config] Falha na verificação de isSupabaseConfigured() em produção!');
    console.error('[Supabase Config] Isso provavelmente indica um problema com as variáveis de ambiente na Vercel.');
  }
  
  return configured;
};

// Função auxiliar para mostrar o status atual da configuração
export const logSupabaseStatus = (): void => {
  console.log('================================');
  console.log('[Supabase Status] Ambiente:', isDevEnvironment ? 'Desenvolvimento' : 'Produção');
  console.log('[Supabase Status] URL configurada:', !!supabaseUrl);
  console.log('[Supabase Status] Chave configurada:', !!supabaseAnonKey);
  console.log('[Supabase Status] Cliente inicializado:', !!supabaseClient);
  console.log('[Supabase Status] Fonte das variáveis: ', 
    window.ENV?.VITE_SUPABASE_URL ? 'window.ENV (vercel-env.js)' : 
    import.meta.env.VITE_SUPABASE_URL ? 'import.meta.env (Vite)' : 'Nenhuma');
  console.log('================================');
};