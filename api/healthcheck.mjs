// Endpoint de healthcheck para verificar se a API está funcionando
export default function handler(req, res) {
  try {
    // Garantir que retorna um JSON válido
    res.setHeader('Content-Type', 'application/json');

    // Coletar informações sobre o ambiente
    const info = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown',
      node: process.version,
      assets: {
        checked: ['/assets', '/dist/assets', '/client/assets'],
        found: []
      }
    };

    // Retornar as informações
    return res.status(200).json(info);
  } catch (error) {
    console.error('Erro no healthcheck:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}