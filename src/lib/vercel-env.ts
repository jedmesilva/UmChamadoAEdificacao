/**
 * Utilitário para lidar com variáveis de ambiente no Vercel
 * 
 * Este módulo facilita o acesso às variáveis de ambiente em diferentes
 * ambientes de execução (browser, servidor, Vercel functions, etc)
 */

type EnvVarName = 
  | 'SUPABASE_URL'
  | 'SUPABASE_ANON_KEY'
  | 'STORAGE_TYPE'
  | 'NODE_ENV';

interface EnvVars {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  STORAGE_TYPE: string;
  NODE_ENV: string;
}

/**
 * Obtém uma variável de ambiente com prefixo diferente dependendo do ambiente
 * 
 * No ambiente de browser, todas as variáveis devem ter prefixo VITE_
 * No ambiente do servidor, usamos sem prefixo
 */
function getEnvVar(name: EnvVarName): string | undefined {
  // Verificar ambiente de browser durante o runtime
  if (typeof window !== 'undefined') {
    // No browser, o Vite injeta variáveis como import.meta.env.VITE_*
    // Procura em import.meta.env primeiro
    const viteVarName = `VITE_${name}`;
    // @ts-ignore - Este acesso é válido no Vite
    if (import.meta.env && import.meta.env[viteVarName]) {
      // @ts-ignore
      return import.meta.env[viteVarName] as string;
    }
    
    // Fallback: procura em window.ENV que pode ser injetado pelo server-side
    // @ts-ignore
    if (window.ENV && window.ENV[`VITE_${name}`]) {
      // @ts-ignore
      return window.ENV[`VITE_${name}`];
    }
    
    console.warn(`Variável de ambiente ${name} não encontrada no browser`);
    return undefined;
  }
  
  // No ambiente do servidor ou funções serverless
  if (typeof process !== 'undefined' && process.env) {
    // Verificar primeiro sem prefixo
    if (process.env[name]) {
      return process.env[name];
    }
    
    // Tentar com prefixo VITE_ (para compatibilidade)
    const viteVarName = `VITE_${name}`;
    if (process.env[viteVarName]) {
      return process.env[viteVarName];
    }
    
    console.warn(`Variável de ambiente ${name} não encontrada no servidor`);
    return undefined;
  }
  
  console.warn(`Ambiente não reconhecido para variável ${name}`);
  return undefined;
}

/**
 * Variáveis de ambiente consolidadas
 */
export const env: EnvVars = {
  // @ts-ignore - Este acesso é válido no Vite
  SUPABASE_URL: getEnvVar('SUPABASE_URL') || (import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') || '',
  // @ts-ignore - Este acesso é válido no Vite
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY') || (import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || '',
  STORAGE_TYPE: getEnvVar('STORAGE_TYPE') || 'supabase',
  NODE_ENV: getEnvVar('NODE_ENV') || 'development'
};

/**
 * Verifica se estamos no ambiente de produção (Vercel)
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Verifica se estamos no ambiente Vercel
 */
export const isVercel = typeof process !== 'undefined' && !!process.env.VERCEL;

/**
 * Ambiente da Vercel (production, preview, development)
 */
export const vercelEnv = typeof process !== 'undefined' ? process.env.VERCEL_ENV : undefined;

/**
 * Verifica se todas as variáveis obrigatórias estão definidas
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const requiredVars: EnvVarName[] = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = requiredVars.filter(name => !env[name]);
  
  return {
    valid: missing.length === 0,
    missing
  };
}