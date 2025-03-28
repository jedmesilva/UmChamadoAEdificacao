// Healthcheck simples para a Vercel
module.exports = function(req, res) {
  // Configuração de resposta
  res.setHeader('Content-Type', 'application/json');
  
  // Resposta básica de healthcheck
  res.status(200).send(JSON.stringify({
    status: 'ok',
    message: 'API Um Chamado à Edificação está funcionando!',
    timestamp: new Date().toISOString()
  }));
}