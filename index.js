// Arquivo principal para iniciar o servidor do projeto
// UM CHAMADO À EDIFICAÇÃO - Um chamado à edificação

// Verifica se está em ambiente de produção (Vercel)
if (process.env.VERCEL) {
  // Handler para o ambiente Vercel (serverless)
  module.exports = async (req, res) => {
    try {
      console.log(`Recebida requisição principal: ${req.method} ${req.url}`);
      // Configuração básica para responder a requisições
      if (req.url.startsWith('/api/')) {
        // Redireciona para o endpoint /api
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          message: 'API Um Chamado à Edificação',
          status: 'online',
          redirectTo: '/api'
        }));
      } else {
        // Resposta padrão
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          message: 'Um Chamado à Edificação',
          status: 'online',
          environment: process.env.NODE_ENV || 'production'
        }));
      }
    } catch (error) {
      console.error('Erro ao processar requisição principal:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message
      }));
    }
  };
} else {
  // Para ambiente local, usamos uma abordagem diferente
  // Este código é executado apenas no ambiente de desenvolvimento
  console.log('Iniciando servidor no ambiente de desenvolvimento...');
  
  // Inicia o servidor de desenvolvimento - usando require para CommonJS
  try {
    require('./dist/server/index.js');
  } catch (err) {
    console.error('Erro ao iniciar servidor de desenvolvimento:', err);
    
    // Tentativa alternativa usando dynamic import
    try {
      const dynamicImport = Function('return import("./dist/server/index.js")')();
      dynamicImport.catch(err => {
        console.error('Erro ao usar dynamic import:', err);
      });
    } catch (importErr) {
      console.error('Erro ao usar dynamic import como fallback:', importErr);
    }
  }
}