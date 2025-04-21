// API para validar variáveis de ambiente no Vercel
// Útil para depurar problemas com o Supabase e inscrições

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }
  
  // Lista de variáveis de ambiente a verificar
  const envVars = [
    { name: 'NODE_ENV', prefix: false },
    { name: 'VERCEL', prefix: false },
    { name: 'VERCEL_ENV', prefix: false },
    { name: 'SUPABASE_URL', prefix: false },
    { name: 'SUPABASE_ANON_KEY', prefix: false },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', prefix: false },
    { name: 'VITE_SUPABASE_URL', prefix: false },
    { name: 'VITE_SUPABASE_ANON_KEY', prefix: false }
  ];
  
  // Coletar informações sobre cada variável
  const envInfo = {};
  let allVarsPresent = true;
  let supabaseVarsPresent = true;
  
  for (const { name, prefix } of envVars) {
    const value = process.env[name];
    
    envInfo[name] = {
      present: !!value,
      value: value ? (name.includes('KEY') ? 'REDACTED' : value) : undefined,
      length: value ? value.length : 0
    };
    
    // Verificar se é uma variável do Supabase e está ausente
    if (!value && (name.includes('SUPABASE'))) {
      supabaseVarsPresent = false;
    }
    
    // Verificar se alguma variável está faltando
    if (!value) {
      allVarsPresent = false;
    }
  }
  
  // Analisar especificamente as variáveis do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Compilar resultados
  const result = {
    timestamp: new Date().toISOString(),
    platform: {
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
      isVercel: process.env.VERCEL === '1',
      vercelEnv: process.env.VERCEL_ENV
    },
    status: {
      allVarsPresent,
      supabaseVarsPresent,
      supabaseConfigured: !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
    },
    environment: envInfo,
    supabaseStatus: {
      urlAvailable: !!supabaseUrl,
      anonKeyAvailable: !!supabaseAnonKey,
      serviceKeyAvailable: !!supabaseServiceKey
    }
  };
  
  // Responder com as informações
  res.status(200).json(result);
}