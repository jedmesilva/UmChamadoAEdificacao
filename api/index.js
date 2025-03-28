// API Serverless para Vercel - Endpoint principal usando CommonJS para compatibilidade

// Handler para o ambiente Vercel (serverless)
module.exports = async (req, res) => {
  try {
    console.log(`Recebida requisição API: ${req.method} ${req.url}`);
    
    // Configuração básica para responder a requisições da API
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    
    const response = {
      message: 'API Um Chamado à Edificação',
      path: req.url,
      method: req.method,
      status: 'online',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      vercel: true
    };
    
    // Responde à requisição
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error('Erro ao processar requisição API:', error);
    
    // Resposta de erro
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
};