// Healthcheck simples para a Vercel - Formato ESM
export default function handler(req, res) {
  // Configuração de resposta
  res.setHeader('Content-Type', 'application/json');
  
  // Resposta básica de healthcheck
  return res.status(200).json({
    status: 'ok',
    message: 'API Um Chamado à Edificação está funcionando!',
    timestamp: new Date().toISOString()
  });
}