// Healthcheck simples para a Vercel - Formato ESM puro
// Arquivo optimizado para ambiente serverless com ESM

/**
 * Handler de healthcheck para verificação do status da API
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 */
export default function handler(req, res) {
  // Configuração de resposta com headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Verificar variáveis de ambiente críticas
  const envStatus = {
    node_env: process.env.NODE_ENV || 'development',
    supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
    supabase_anon_key: process.env.SUPABASE_ANON_KEY ? 'configured' : 'missing',
    storage_type: process.env.STORAGE_TYPE || 'not set'
  };
  
  // Resposta completa de healthcheck
  return res.status(200).json({
    status: 'ok',
    message: 'API Um Chamado à Edificação está funcionando!',
    timestamp: new Date().toISOString(),
    environment: envStatus.node_env,
    services: {
      supabase: (envStatus.supabase_url === 'configured' && envStatus.supabase_anon_key === 'configured') 
        ? 'configured' 
        : 'not properly configured'
    },
    storage: envStatus.storage_type
  });
}