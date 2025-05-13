import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida no ambiente');
}

// Inicializa o cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Webhook do Stripe para processar eventos
 * Este endpoint deve ser registrado no dashboard do Stripe
 */
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Stripe-Signature');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verificar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  // Para testes na Vercel, vamos logging detalhado
  console.log(`[Webhook] Recebido evento Stripe`);
  
  try {
    // Para debugar em produção - registrar o evento recebido
    console.log(`[Webhook] Corpo da requisição:`, JSON.stringify(req.body).substring(0, 500) + '...');
    
    // Extrair o evento
    let event;
    
    try {
      // Se um webhook está configurado com um secret, verificamos a assinatura
      const signature = req.headers['stripe-signature'];
      
      if (signature && process.env.STRIPE_WEBHOOK_SECRET) {
        console.log(`[Webhook] Verificando assinatura do webhook`);
        // Verificar a assinatura do webhook
        const body = await buffer(req);
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        // Caso contrário, confiamos no corpo da requisição (não recomendado para produção)
        console.log(`[Webhook] Usando corpo da requisição diretamente (sem verificação)`);
        event = req.body;
      }
    } catch (err) {
      console.error(`[Webhook] Erro ao validar webhook:`, err);
      return res.status(400).json({ error: `Erro de validação do webhook: ${err.message}` });
    }
    
    // Processar o evento
    switch (event.type) {
      case 'checkout.session.completed':
        console.log(`[Webhook] Evento checkout.session.completed recebido`);
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        console.log(`[Webhook] Evento customer.subscription.created recebido`);
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        console.log(`[Webhook] Evento customer.subscription.updated recebido`);
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        console.log(`[Webhook] Evento customer.subscription.deleted recebido`);
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        console.log(`[Webhook] Evento não processado: ${event.type}`);
    }
    
    // Resposta de sucesso
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error(`[Webhook] Erro ao processar webhook:`, error);
    res.status(500).json({ error: `Erro ao processar webhook: ${error.message}` });
  }
}

/**
 * Auxiliar para obter o buffer de uma requisição
 */
async function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    req.on('error', reject);
  });
}

/**
 * Processa eventos de checkout completo
 */
async function handleCheckoutCompleted(session) {
  console.log(`[Webhook] Processando checkout completo: ${session.id}`);
  
  try {
    // Registrar o evento para debug
    console.log(`[Webhook] Detalhes da sessão: ${JSON.stringify(session).substring(0, 500)}...`);
    
    // Extrair informações importantes
    const { customer, subscription, customer_email } = session;
    
    console.log(`[Webhook] Cliente: ${customer}, Assinatura: ${subscription}, Email: ${customer_email}`);
    
    // Aqui você enviaria um request para a sua API para atualizar o status da assinatura
    // ou registraria diretamente no banco de dados
    
    console.log(`[Webhook] Checkout processado com sucesso para o cliente ${customer}`);
    
  } catch (error) {
    console.error(`[Webhook] Erro ao processar checkout:`, error);
  }
}

/**
 * Processa eventos de criação de assinatura
 */
async function handleSubscriptionCreated(subscription) {
  console.log(`[Webhook] Assinatura criada: ${subscription.id} para cliente ${subscription.customer}`);
  // Atualizar status de assinatura no banco de dados
}

/**
 * Processa eventos de atualização de assinatura
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`[Webhook] Assinatura atualizada: ${subscription.id}, status: ${subscription.status}`);
  // Atualizar status de assinatura no banco de dados
}

/**
 * Processa eventos de exclusão de assinatura
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`[Webhook] Assinatura cancelada: ${subscription.id}`);
  // Atualizar status de assinatura no banco de dados
}

// Configure a exportação para o handler da API
export const config = {
  api: {
    bodyParser: false, // Desabilitar o parser para processar o buffer bruto
  },
};