// API de verificação de saúde para diagnóstico
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Verificar e coletar informações sobre o ambiente
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    platform: process.platform,
    memory: process.memoryUsage(),
    env: {
      supabase_url_set: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabase_anon_key_set: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      supabase_service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      storage_type: process.env.STORAGE_TYPE || 'não definido'
    },
    vercel: {
      is_vercel: !!process.env.VERCEL,
      vercel_env: process.env.VERCEL_ENV || 'não definido',
      region: process.env.VERCEL_REGION || 'não definido'
    }
  };
  
  // Responder com as informações coletadas
  res.status(200).json(health);
}