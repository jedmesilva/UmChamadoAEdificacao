// API Serverless para Vercel
import { app } from '../dist/server/index.js';

// Handler para ambiente serverless da Vercel
export default function handler(req, res) {
  // Passa a requisição para o Express
  return app(req, res);
}