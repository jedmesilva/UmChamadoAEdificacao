// API Serverless para Vercel - Formato CommonJS
module.exports = function(req, res) {
  // Configuração básica de resposta
  res.setHeader('Content-Type', 'application/json');
  
  // Resposta simples
  res.status(200).send(JSON.stringify({
    message: 'API Um Chamado à Edificação',
    status: 'online',
    timestamp: new Date().toISOString()
  }));
};