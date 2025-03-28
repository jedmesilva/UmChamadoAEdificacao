// API Serverless para Vercel - Formato ESM
export default function handler(req, res) {
  // Configuração básica de resposta
  res.setHeader('Content-Type', 'application/json');
  
  // Resposta simples
  return res.status(200).json({
    message: 'API Um Chamado à Edificação',
    status: 'online',
    timestamp: new Date().toISOString()
  });
}