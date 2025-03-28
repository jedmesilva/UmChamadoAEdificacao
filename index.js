// Arquivo principal para iniciar o servidor do projeto
// UM CHAMADO À EDIFICAÇÃO

// Usando require para compatibilidade com Vercel
let serverExports;

try {
  // Tenta primeiramente importar usando ESM (se estiver configurado como ESM)
  serverExports = require('./dist/server/index.js');
} catch (error) {
  console.error('Erro ao importar módulo ESM:', error);
  try {
    // Fallback para CommonJS
    serverExports = require('./dist/index.js');
  } catch (secondError) {
    console.error('Erro ao importar módulo CommonJS:', secondError);
    throw new Error('Não foi possível carregar o servidor');
  }
}

// Inicializa a Promise se for necessário
const getApp = async () => {
  if (serverExports.serverPromise) {
    try {
      const { app } = await serverExports.serverPromise;
      return app;
    } catch (error) {
      console.error('Erro ao inicializar o servidor:', error);
      throw error;
    }
  }
  return serverExports.app;
};

// Exportamos uma função que manipula a requisição
// Isso é compatível com o formato de serverless functions do Vercel
module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};