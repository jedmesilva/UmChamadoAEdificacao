// Arquivo que configura o Express para o ambiente serverless do Vercel
// Este arquivo é específico para a pasta api/ e será usado pelo Vercel para rotas específicas

// Importações necessárias (utilizando CommonJS para compatibilidade)
const express = require('express');
const dotenv = require('dotenv');
const { StorageType } = require('../dist/server/storage.js');

// Configura o ambiente
dotenv.config();
process.env.STORAGE_TYPE = StorageType.SUPABASE;
process.env.VERCEL = '1';

// Configura o app Express
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de log para APIs
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Middleware de tratamento de erros
app.use((err, _req, res, _next) => {
  console.error('Erro na API:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(status).json({ message });
});

// Exporta o app para uso nos handlers da pasta api/
module.exports = app;