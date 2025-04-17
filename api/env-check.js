// API para verificar variáveis de ambiente no ambiente Vercel
// Sem acesso a valores sensíveis, apenas verifica a existência

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Respondendo a preflight request com 200 OK');
    return res.status(200).end();
  }

  // Apenas aceita requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido',
      method: req.method,
      allowedMethods: ['GET']
    });
  }

  // Lista todas as variáveis de ambiente necessárias
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ];

  // Verifica variáveis de ambiente alternativas do frontend
  const alternativeEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  // Verificar cada variável sem expor seus valores
  const envStatus = {};
  requiredEnvVars.forEach(envVar => {
    envStatus[envVar] = {
      exists: !!process.env[envVar],
      length: process.env[envVar] ? process.env[envVar].length : 0
    };
  });

  // Verificar variáveis alternativas
  const alternativeStatus = {};
  alternativeEnvVars.forEach(envVar => {
    alternativeStatus[envVar] = {
      exists: !!process.env[envVar],
      length: process.env[envVar] ? process.env[envVar].length : 0
    };
  });

  // Verificar se temos variáveis do Vercel
  const isVercel = !!process.env.VERCEL;
  const vercelEnv = process.env.VERCEL_ENV || 'não definido';
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'não definido';

  // Retornar status do ambiente
  return res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'não definido',
      isVercel,
      vercelEnv,
      commitSha: commitSha.substring(0, 7)  // apenas os primeiros 7 caracteres
    },
    env_vars: {
      required: envStatus,
      alternative: alternativeStatus,
      critical_missing: requiredEnvVars.filter(env => !envStatus[env].exists)
    },
    status: requiredEnvVars.every(env => envStatus[env].exists) || 
           alternativeEnvVars.every(env => alternativeStatus[env].exists) 
             ? 'OK' 
             : 'MISSING_ENV_VARS'
  });
}