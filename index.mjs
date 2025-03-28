// Handler principal para a rota raiz no formato ESM
// Compatível com o ambiente serverless do Vercel

export default function handler(req, res) {
  // Servir conteúdo estático diretamente
  res.setHeader('Content-Type', 'text/html');
  
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Um Chamado à Edificação</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            text-align: center;
          }
          .container {
            max-width: 800px;
            padding: 2rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
          }
          p {
            color: #666;
            margin-bottom: 1.5rem;
          }
          .button {
            display: inline-block;
            background-color: #4a6cf7;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            text-decoration: none;
            transition: background-color 0.3s ease;
          }
          .button:hover {
            background-color: #3a5cf7;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Um Chamado à Edificação</h1>
          <p>Bem-vindo ao nosso site. O servidor está em funcionamento.</p>
          <a href="/api/healthcheck" class="button">Verificar Status da API</a>
        </div>
      </body>
    </html>
  `);
}