// Teste de redirecionamento para o Stripe
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Endpoint de teste de redirecionamento para o Stripe');
    
    // URL do Stripe (apenas para teste)
    const stripeUrl = 'https://stripe.com/';
    
    // Responder com a URL para o frontend redirecionar
    res.status(200).json({
      success: true,
      redirectUrl: stripeUrl
    });
    
  } catch (error) {
    console.error('Erro no teste de redirecionamento:', error);
    res.status(500).json({
      success: false,
      error: 'Falha no teste de redirecionamento'
    });
  }
}