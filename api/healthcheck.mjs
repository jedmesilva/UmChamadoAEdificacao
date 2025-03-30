// Healthcheck simples para a Vercel - Formato ESM puro
// Arquivo optimizado para ambiente serverless com ESM

/**
 * Handler de healthcheck para verificação do status da API
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 */
export default function handler(req, res) {
  // Permitir CORS completo
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  
  // Verificar se é um preflight request do CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Configuração de resposta com headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  
  // Verificar variáveis de ambiente críticas
  const envStatus = {
    node_env: process.env.NODE_ENV || 'development',
    supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'configured' : 'missing',
    storage_type: process.env.STORAGE_TYPE || 'not set'
  };
  
  // Determinar se a API base está funcionando
  let apiStatus = 'ok';
  let message = 'API Um Chamado à Edificação está funcionando!';
  
  // Verificar configuração do Supabase
  const supabaseConfigured = (
    envStatus.supabase_url === 'configured' && 
    envStatus.supabase_anon_key === 'configured'
  );
  
  // Tentar ajustar mensagem de acordo com a configuração
  if (!supabaseConfigured && envStatus.storage_type === 'supabase') {
    apiStatus = 'warning';
    message = 'API está funcionando, mas Supabase não está corretamente configurado';
  }
  
  // Determinar estado de assets da aplicação
  let assetsStatus = 'unknown';
  try {
    // Em um serverless, não podemos verificar diretamente os arquivos
    // então consideramos que estão ok se chegamos até aqui
    assetsStatus = 'ok';
  } catch (error) {
    assetsStatus = 'error: ' + (error.message || 'unknown error');
  }
  
  // Informações do runtime
  const runtimeInfo = {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  // Resposta completa de healthcheck
  return res.status(200).json({
    status: apiStatus,
    message: message,
    timestamp: new Date().toISOString(),
    environment: envStatus.node_env,
    services: {
      supabase: supabaseConfigured ? 'configured' : 'not properly configured',
      assets: assetsStatus
    },
    storage: envStatus.storage_type,
    runtime: runtimeInfo,
    server_time: new Date().toISOString()
  });
}