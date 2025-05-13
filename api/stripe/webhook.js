import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não está definida no ambiente');
}

// Validar ambientes Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis de ambiente do Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) não estão definidas');
}

// Inicializa o cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Inicializa o cliente Supabase com a service role key (necessário para bypass de RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Mapeamento dos price_ids para identificar o tipo de produto
const PRICE_IDS = {
  'price_1RN17rK1jF3lhVXRLlkKZ1Ya': 'email',     // Chamado EDF E-mail
  'price_1RN19lK1jF3lhVXR5eCkEZ9i': 'physical'   // Chamado EDF Parchment
};

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
    
    // Formatando mensagem de erro para o cliente
    const formattedError = formatStripeError(error);
    
    res.status(500).json({ 
      error: `Erro ao processar webhook`, 
      message: formattedError 
    });
  }
}

/**
 * Formata erros do Stripe para uma mensagem amigável ao usuário
 */
function formatStripeError(error) {
  const errorMsg = error.message || "";
  
  // Lista de erros específicos do Stripe que devem ser mostrados ao usuário
  const stripeSpecificErrors = [
    "card_declined", "insufficient_funds", "expired_card", "invalid_card",
    "cartão recusado", "saldo insuficiente", "cartão expirado", 
    "payment_intent_unexpected_state", "payment_method_unverified",
    "requires_payment_method"
  ];
  
  const isStripeSpecificError = stripeSpecificErrors.some(
    specificError => errorMsg.toLowerCase().includes(specificError.toLowerCase())
  );
  
  // Retornar erro específico do Stripe ou mensagem genérica amigável
  return isStripeSpecificError ? error.message : "Ocorreu um erro, tente novamente!";
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

    if (subscription) {
      // Se a sessão incluir uma assinatura, vamos buscar os detalhes adicionais
      try {
        const subscriptionDetails = await stripe.subscriptions.retrieve(subscription, {
          expand: ['items.data.price.product']
        });
        await processSubscriptionData(subscriptionDetails, customer_email, customer);
      } catch (error) {
        console.error(`[Webhook] Erro ao buscar detalhes da assinatura:`, error);
      }
    }
    
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
  
  try {
    // Buscar detalhes completos da assinatura
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product', 'customer']
    });
    
    // Buscar o email do cliente
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customer_email = customer.email;
    
    await processSubscriptionData(subscriptionDetails, customer_email, subscription.customer);
    
  } catch (error) {
    console.error(`[Webhook] Erro ao processar criação de assinatura:`, error);
  }
}

/**
 * Processa eventos de atualização de assinatura
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`[Webhook] Assinatura atualizada: ${subscription.id}, status: ${subscription.status}`);
  
  try {
    // Buscar detalhes completos da assinatura
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product', 'customer']
    });
    
    // Buscar o email do cliente
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customer_email = customer.email;
    
    await processSubscriptionData(subscriptionDetails, customer_email, subscription.customer);
    
  } catch (error) {
    console.error(`[Webhook] Erro ao processar atualização de assinatura:`, error);
  }
}

/**
 * Processa eventos de exclusão de assinatura
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`[Webhook] Assinatura cancelada: ${subscription.id}`);
  
  try {
    // Buscar detalhes completos da assinatura
    const subscriptionDetails = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product'],
    });
    
    // Buscar o email do cliente
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customer_email = customer.email;
    
    // Atualizar o status para cancelado
    await processSubscriptionData({
      ...subscriptionDetails,
      status: 'canceled'
    }, customer_email, subscription.customer);
    
  } catch (error) {
    console.error(`[Webhook] Erro ao processar cancelamento de assinatura:`, error);
  }
}

/**
 * Processa os dados da assinatura e atualiza o Supabase
 */
async function processSubscriptionData(subscription, customer_email, stripe_customer_id) {
  try {
    if (!subscription.items?.data?.length) {
      console.log('[Webhook] Nenhum item encontrado na assinatura');
      return;
    }
    
    // Extrair detalhes da assinatura
    const item = subscription.items.data[0];
    const price_id = item.price.id;
    const product_id = item.price.product.id;
    const status = mapStripeStatusToAppStatus(subscription.status);
    
    console.log(`[Webhook] Processando assinatura: 
      Email: ${customer_email}
      Price ID: ${price_id}
      Product ID: ${product_id}
      Status: ${status}
      Stripe Customer ID: ${stripe_customer_id}
    `);
    
    // Determinar o tipo de assinatura (email ou física)
    const subscriptionType = getSubscriptionType(price_id);
    
    if (!subscriptionType) {
      console.log(`[Webhook] Tipo de assinatura não identificado para price_id: ${price_id}`);
      return;
    }
    
    // Obter o user_id pelo email
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error('[Webhook] Erro ao buscar usuários:', userError);
      return;
    }
    
    const user = userData.users.find(u => u.email?.toLowerCase() === customer_email?.toLowerCase());
    if (!user) {
      console.log(`[Webhook] Usuário não encontrado para o email: ${customer_email}`);
      return;
    }
    
    const user_id = user.id;
    
    // Atualizar a tabela correta com base no tipo de assinatura
    if (subscriptionType === 'email') {
      await updateEmailSignature(user_id, stripe_customer_id, price_id, product_id, status);
    } else if (subscriptionType === 'physical') {
      await updateParchmentSignature(user_id, stripe_customer_id, price_id, product_id, status);
    }
    
  } catch (error) {
    console.error('[Webhook] Erro ao processar dados da assinatura:', error);
  }
}

/**
 * Mapeia o status do Stripe para o formato usado no aplicativo
 */
function mapStripeStatusToAppStatus(stripeStatus) {
  const statusMap = {
    'active': 'active',
    'past_due': 'active', // Consideramos past_due como ativo
    'unpaid': 'inactive',
    'canceled': 'cancelled',
    'incomplete': 'pending',
    'incomplete_expired': 'inactive',
    'trialing': 'active',
    'paused': 'paused'
  };
  
  return statusMap[stripeStatus] || 'pending';
}

/**
 * Identifica o tipo de assinatura com base no price_id
 */
function getSubscriptionType(price_id) {
  return PRICE_IDS[price_id];
}

/**
 * Atualiza ou cria um registro na tabela signature_email
 */
async function updateEmailSignature(user_id, stripe_customer_id, price_id, product_id, status) {
  console.log(`[Webhook] Atualizando assinatura de email para usuário: ${user_id}`);
  
  try {
    // Buscar assinatura existente
    const { data: existingSignature, error: queryError } = await supabase
      .from('signature_email')
      .select('*')
      .eq('user_id', user_id)
      .not('status_signature', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (queryError) {
      console.error('[Webhook] Erro ao buscar assinatura de email existente:', queryError);
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    if (existingSignature && existingSignature.length > 0) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabase
        .from('signature_email')
        .update({
          status_signature: status,
          stripe_customer_id,
          price_id,
          product_id,
          updated_at: timestamp
        })
        .eq('id', existingSignature[0].id);
        
      if (updateError) {
        console.error('[Webhook] Erro ao atualizar assinatura de email:', updateError);
      } else {
        console.log(`[Webhook] Assinatura de email atualizada com sucesso para o usuário: ${user_id}`);
      }
    } else if (status !== 'cancelled') {
      // Criar nova assinatura (apenas se o status não for cancelado)
      const { error: insertError } = await supabase
        .from('signature_email')
        .insert([{
          user_id,
          status_signature: status,
          stripe_customer_id,
          price_id,
          product_id,
          updated_at: timestamp
        }]);
        
      if (insertError) {
        console.error('[Webhook] Erro ao criar assinatura de email:', insertError);
      } else {
        console.log(`[Webhook] Nova assinatura de email criada com sucesso para o usuário: ${user_id}`);
      }
    } else {
      console.log(`[Webhook] Nenhuma assinatura existente para cancelar para o usuário: ${user_id}`);
    }
  } catch (error) {
    console.error('[Webhook] Erro ao processar assinatura de email:', error);
  }
}

/**
 * Atualiza ou cria um registro na tabela signature_parchment
 */
async function updateParchmentSignature(user_id, stripe_customer_id, price_id, product_id, status) {
  console.log(`[Webhook] Atualizando assinatura física para usuário: ${user_id}`);
  
  try {
    // Buscar assinatura existente
    const { data: existingSignature, error: queryError } = await supabase
      .from('signature_parchment')
      .select('*')
      .eq('user_id', user_id)
      .not('status_signature', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (queryError) {
      console.error('[Webhook] Erro ao buscar assinatura física existente:', queryError);
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    if (existingSignature && existingSignature.length > 0) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabase
        .from('signature_parchment')
        .update({
          status_signature: status,
          stripe_customer_id,
          price_id,
          product_id,
          updated_at: timestamp
        })
        .eq('id', existingSignature[0].id);
        
      if (updateError) {
        console.error('[Webhook] Erro ao atualizar assinatura física:', updateError);
      } else {
        console.log(`[Webhook] Assinatura física atualizada com sucesso para o usuário: ${user_id}`);
      }
    } else if (status !== 'cancelled') {
      // Criar nova assinatura (apenas se o status não for cancelado)
      const { error: insertError } = await supabase
        .from('signature_parchment')
        .insert([{
          user_id,
          status_signature: status,
          stripe_customer_id,
          price_id,
          product_id,
          updated_at: timestamp
        }]);
        
      if (insertError) {
        console.error('[Webhook] Erro ao criar assinatura física:', insertError);
      } else {
        console.log(`[Webhook] Nova assinatura física criada com sucesso para o usuário: ${user_id}`);
      }
    } else {
      console.log(`[Webhook] Nenhuma assinatura física existente para cancelar para o usuário: ${user_id}`);
    }
  } catch (error) {
    console.error('[Webhook] Erro ao processar assinatura física:', error);
  }
}

// Configure a exportação para o handler da API
export const config = {
  api: {
    bodyParser: false, // Desabilitar o parser para processar o buffer bruto
  },
};