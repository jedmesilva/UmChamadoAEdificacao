
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
        paths: ['/assets', '/dist/assets', '/client/assets']
      }
    };

    // Retornar as informações
    return res.status(200).json(info);
  } catch (error) {
    // Em caso de erro, ainda retornar um JSON válido
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Erro interno no servidor'
    });
  }
}
