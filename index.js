// Este arquivo é executado em ambiente de desenvolvimento
// e também serve como ponto de entrada para a Vercel

// Módulo principal para a Vercel
// Usando formato CommonJS para máxima compatibilidade
module.exports = (req, res) => {
  try {
    // Configuração básica
    res.setHeader('Content-Type', 'application/json');
    
    // Resposta simples
    return res.end(JSON.stringify({
      app: 'Um Chamado à Edificação',
      status: 'online',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    // Tratamento de erros simplificado
    console.error('Erro:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
  }
};