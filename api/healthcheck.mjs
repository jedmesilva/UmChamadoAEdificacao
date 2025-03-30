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

  // Resposta completa de healthcheck
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'API está funcionando corretamente!'
  });
}