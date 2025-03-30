export default function handler(req, res) {
  try {
    // Adicionar headers CORS para permitir acesso de qualquer origem
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responder com status OK e incluir timestamp para evitar cache
    res.status(200).json({ 
      status: 'ok', 
      message: 'API is running', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Healthcheck error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal server error' 
    });
  }
}