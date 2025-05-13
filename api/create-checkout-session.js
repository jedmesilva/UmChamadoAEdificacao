import Stripe from 'stripe';

// Verifica se a chave de API do Stripe está configurada
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida no ambiente');
}

// Inicializa o cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Preços reais das assinaturas no Stripe
const PRICE_IDS = {
  email: process.env.STRIPE_PRICE_EMAIL || 'price_1RN17rK1jF3lhVXRLlkKZ1Ya', // Chamado EDF E-mail - R$ 9,99/mês
  physical: process.env.STRIPE_PRICE_PHYSICAL || 'price_1RN19lK1jF3lhVXR5eCkEZ9i' // Chamado EDF Parchment - R$ 99,99/mês
};

/**
 * Endpoint API para criar sessão de checkout do Stripe
 */
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Responder às requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas aceitar requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  try {
    const { userEmail, type, successUrl, cancelUrl } = req.body;

    console.log(`[Vercel API] Recebida requisição para checkout: ${JSON.stringify(req.body, null, 2)}`);

    if (!userEmail || !type || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados incompletos. userEmail, type, successUrl e cancelUrl são obrigatórios' 
      });
    }

    // Verificar se tipo é válido
    if (!['email', 'physical'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tipo de assinatura inválido. Use "email" ou "physical"' 
      });
    }

    // Obter preço baseado no tipo
    const priceId = PRICE_IDS[type];
    if (!priceId) {
      return res.status(400).json({ 
        success: false, 
        error: `Preço não configurado para tipo: ${type}` 
      });
    }

    // Procurar cliente no Stripe ou criar novo
    console.log(`[Vercel API] Procurando cliente no Stripe com email: ${userEmail}`);
    let customer;
    
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log(`[Vercel API] Cliente encontrado: ${customer.id}`);
    } else {
      console.log(`[Vercel API] Nenhum cliente encontrado para o email: ${userEmail}`);
      console.log(`[Vercel API] Criando cliente no Stripe para: ${userEmail}`);
      
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          subscription_type: type
        }
      });
      
      console.log(`[Vercel API] Cliente criado: ${customer.id}`);
    }

    // Formatar URLs corretamente
    const formattedSuccessUrl = successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}';

    // Criar sessão de checkout
    console.log(`[Vercel API] Criando sessão de checkout para cliente ${customer.id}, tipo: ${type}`);
    console.log(`[Vercel API] Usando price_id: ${priceId} para assinatura ${type}`);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: formattedSuccessUrl,
      cancel_url: cancelUrl,
      locale: 'pt-BR',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Removendo completamente o objeto subscription_data para evitar problemas
      // com o parâmetro payment_behavior
    });

    console.log(`[Vercel API] Sessão de checkout criada: ${session.id}, URL: ${session.url}`);

    // Retornar detalhes da sessão
    return res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    });

  } catch (error) {
    console.error('[Vercel API] Erro ao criar sessão de checkout:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Erro ao criar sessão de checkout: ${error.message}` 
    });
  }
}