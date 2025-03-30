
export default function handler(req, res) {
  // Verifica método e responde apropriadamente
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verificar status da aplicação aqui (se necessário)
  const status = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    version: process.env.npm_package_version || "1.0.0"
  };

  // Adicionar redirecionamento para a página principal se for uma solicitação do navegador
  const userAgent = req.headers['user-agent'] || '';
  const isBrowser = userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
  
  if (isBrowser) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="refresh" content="0;url=/">
          <title>Redirecionando...</title>
        </head>
        <body>
          <h1>API Saudável</h1>
          <p>Redirecionando para a página principal...</p>
          <p>Se você não for redirecionado automaticamente, <a href="/">clique aqui</a>.</p>
          <script>window.location.href = "/";</script>
        </body>
      </html>
    `);
  } else {
    // Resposta padrão JSON para solicitações de API
    res.status(200).json(status);
  }
}
