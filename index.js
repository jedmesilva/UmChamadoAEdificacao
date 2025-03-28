// Arquivo principal para iniciar o servidor do projeto
// UM CHAMADO À EDIFICAÇÃO

// Para ambiente Vercel (serverless)
if (process.env.VERCEL) {
  // Este arquivo é executado diretamente pelo Vercel
  const express = require('express');
  const { serveStatic } = require('./dist/server/vite.js');
  const { registerRoutes } = require('./dist/server/routes.js');
  
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Middleware para tratamento de erros
  app.use((err, _req, res, _next) => {
    console.error('Erro na aplicação:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({ message });
  });
  
  // Inicializa as rotas e exporta o middleware Express
  async function setupServer() {
    try {
      await registerRoutes(app);
      serveStatic(app);
      console.log('Servidor inicializado com sucesso no ambiente Vercel');
      return app;
    } catch (error) {
      console.error('Erro ao inicializar servidor:', error);
      throw error;
    }
  }
  
  // Exporta a função handler para o Vercel
  module.exports = async (req, res) => {
    try {
      const appInstance = await setupServer();
      return appInstance(req, res);
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
} else {
  // Para ambiente de desenvolvimento local
  require('./dist/server/index.js');
}