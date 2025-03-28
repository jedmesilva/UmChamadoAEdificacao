// Endpoint de healthcheck para a Vercel
// Este arquivo será usado para verificar se a aplicação está funcionando corretamente

// Exportamos diretamente a função handler para o Vercel usando CommonJS para compatibilidade
module.exports = async (req, res) => {
  try {
    // Retorna informações básicas sobre a aplicação
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      message: 'API Um Chamado à Edificação está funcionando!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isVercel: process.env.VERCEL === '1' ? true : false,
      nodeVersion: process.version
    }));
  } catch (error) {
    console.error('Erro no healthcheck:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      status: 'error', 
      message: 'Erro interno do servidor' 
    }));
  }
}