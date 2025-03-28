// Arquivo principal para iniciar o servidor do projeto
// UM CHAMADO À EDIFICAÇÃO

import { app } from './dist/server/index.js';

// Exportamos uma função que manipula a requisição
// Isso é compatível com o formato de serverless functions do Vercel
export default async function handler(req, res) {
  return app(req, res);
}