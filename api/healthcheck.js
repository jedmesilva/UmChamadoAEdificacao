// Endpoint de healthcheck para a Vercel
// Este arquivo será usado para verificar se a aplicação está funcionando corretamente

// Exportamos diretamente a função handler para o Vercel
module.exports = async (req, res) => {
  try {
    // Retorna informações básicas sobre a aplicação
    res.status(200).json({
      status: 'ok',
      message: 'API Um Chamado à Edificação está funcionando!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isVercel: process.env.VERCEL === '1' ? true : false
    });
  } catch (error) {
    console.error('Erro no healthcheck:', error);
    res.status(500).json({ status: 'error', message: 'Erro interno do servidor' });
  }
};