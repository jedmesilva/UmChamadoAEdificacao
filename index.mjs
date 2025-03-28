// Este é o handler principal para a rota raiz no formato ESM
export default function handler(req, res) {
  // Configurar para servir conteúdo estático
  res.setHeader('Content-Type', 'text/html');
  
  // Redirecionar para a página estática do Vite
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Um Chamado à Edificação</title>
        <meta http-equiv="refresh" content="0;url=/" />
      </head>
      <body>
        <p>Redirecionando para a aplicação principal...</p>
      </body>
    </html>
  `);
}