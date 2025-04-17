// API de verificação de status da aplicação para Vercel Serverless

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

  // Coleta informações sobre o ambiente
  const isVercel = !!process.env.VERCEL;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const vercelEnv = process.env.VERCEL_ENV || 'não disponível';

  // Coleta informações sobre endpoints disponíveis
  const endpoints = [
    { 
      path: '/api/status', 
      method: 'GET',
      description: 'Este endpoint - Retorna informações sobre o status da API'
    },
    { 
      path: '/api/env-check', 
      method: 'GET',
      description: 'Verifica as variáveis de ambiente configuradas'
    },
    { 
      path: '/api/supabase-status', 
      method: 'GET',
      description: 'Verifica a conexão com o Supabase'
    },
    { 
      path: '/api/check-subscription-status', 
      method: 'POST',
      description: 'Verifica o status de inscrição de um usuário'
    },
    { 
      path: '/api/auth/register', 
      method: 'POST',
      description: 'Registra um novo usuário'
    },
    { 
      path: '/api/auth/login', 
      method: 'POST',
      description: 'Autentica um usuário existente'
    },
    { 
      path: '/api/subscribe', 
      method: 'POST',
      description: 'Inscreve um usuário para receber cartas'
    },
    { 
      path: '/api/dashboard-subscribe', 
      method: 'POST',
      description: 'Inscreve um usuário a partir do dashboard'
    }
  ];

  // Retorna informações de status
  return res.status(200).json({
    status: 'online',
    message: 'Servidor API está funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: {
      isVercel,
      nodeEnv,
      vercelEnv
    },
    api: {
      version: '1.0.0',
      endpoints
    },
    runtime: {
      node: process.version,
      platform: process.platform
    }
  });
}