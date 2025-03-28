// API Serverless para Vercel - Endpoint principal
const app = require('./_app');
const { registerRoutes } = require('../dist/server/routes.js');
const { serveStatic } = require('../dist/server/vite.js');

// Variável para garantir que só inicializamos uma vez
let isInitialized = false;
let initializationPromise = null;

// Função para inicializar o servidor apenas uma vez
async function initialize() {
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Inicializando servidor API no Vercel...');
      
      if (!isInitialized) {
        await registerRoutes(app);
        serveStatic(app);
        isInitialized = true;
        console.log('API inicializada com sucesso no Vercel');
      }
      
      resolve(app);
    } catch (error) {
      console.error('Erro ao inicializar API:', error);
      reject(error);
    }
  });
  
  return initializationPromise;
}

// Handler para o Vercel - função que será executada para cada requisição
module.exports = async (req, res) => {
  try {
    console.log(`Recebida requisição: ${req.method} ${req.url}`);
    
    // Inicializa o servidor apenas na primeira requisição
    const appInstance = await initialize();
    
    // Passa a requisição para a instância do Express
    return appInstance(req, res);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};