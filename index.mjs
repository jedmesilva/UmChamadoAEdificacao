// Este arquivo é usado pela Vercel como o handler padrão para a raiz do projeto
// Usando formato ESM (com extensão .mjs)

// Handler principal - formato ESM
export default function handler(req, res) {
  // Configuração básica
  res.setHeader('Content-Type', 'application/json');
  
  // Resposta simples
  return res.status(200).json({
    app: 'Um Chamado à Edificação',
    status: 'online',
    timestamp: new Date().toISOString()
  });
}