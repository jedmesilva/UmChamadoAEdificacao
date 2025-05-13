import Stripe from 'stripe';
import { User, Subscription } from '@shared/schema';

// Validação explícita da chave secreta do Stripe
let stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Verificação adicional para garantir que estamos usando uma chave secreta válida
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY não configurada no ambiente.');
}

// Verificação se a chave é do tipo correto (deve começar com sk_)
if (!stripeSecretKey.startsWith('sk_')) {
  console.error('AVISO: A chave secreta do Stripe não começa com "sk_", o que indica que pode não ser uma chave secreta válida.');
  console.error('A integração com o Stripe pode falhar se a chave não for do tipo correto.');
  
  // Configuração alternativa para ambiente de produção na Vercel
  if (process.env.VERCEL_ENV === 'production') {
    console.log('Tentando usar variável STRIPE_SECRET alternativa em ambiente Vercel');
    const alternativeKey = process.env.STRIPE_SECRET;
    
    if (alternativeKey && alternativeKey.startsWith('sk_')) {
      console.log('Usando chave secreta alternativa do Stripe encontrada em STRIPE_SECRET');
      stripeSecretKey = alternativeKey;
    }
  }
}

console.log(`Configuração do Stripe: Usando chave secreta que começa com "${stripeSecretKey.substring(0, 3)}..."`);

// Inicialização do cliente Stripe com a chave validada
const stripe = new Stripe(stripeSecretKey);

// Preços reais das assinaturas no Stripe
const PRECOS = {
  EMAIL: 'price_1ROAphK1jF3lhVXRB0JonXdX', // Chamado EDF E-mail - R$ 0,01/mês
  PHYSICAL: 'price_1RN19lK1jF3lhVXR5eCkEZ9i', // Chamado EDF Parchment - R$ 99,99/mês
};

export const stripeService = {
  /**
   * Testa a conexão com o Stripe para verificar se a chave está válida
   */
  async testConnection() {
    try {
      // Usamos um método simples para testar a conexão
      const balance = await stripe.balance.retrieve();
      return balance;
    } catch (error) {
      console.error('Erro ao testar conexão com o Stripe:', error);
      throw error;
    }
  },
  
  /**
   * Criar cliente no Stripe
   */
  async createCustomer(user: User): Promise<string> {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id.toString(),
      },
    });
    return customer.id;
  },

  /**
   * Verificar se um usuário já existe como cliente no Stripe
   */
  async findCustomerByEmail(email: string): Promise<string | null> {
    try {
      console.log(`Procurando cliente no Stripe com email: ${email}`);
      
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        console.log(`Cliente encontrado no Stripe: ${customers.data[0].id}`);
        return customers.data[0].id;
      }
      
      console.log(`Nenhum cliente encontrado para o email: ${email}`);
      return null;
    } catch (error) {
      console.error('Erro ao buscar cliente no Stripe:', error);
      return null;
    }
  },

  /**
   * Criar uma assinatura no Stripe usando Checkout
   */
  async createSubscriptionCheckout(
    customerId: string, 
    tipoAssinatura: 'email' | 'physical',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    try {
      console.log(`Criando sessão de checkout para cliente ${customerId}, tipo: ${tipoAssinatura}`);
      
      // Verificar se o cliente existe no Stripe
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || (customer as any).deleted) {
          throw new Error(`Cliente não encontrado no Stripe: ${customerId}`);
        }
        console.log(`Cliente verificado no Stripe: ${customerId}`);
      } catch (err) {
        console.error(`Erro ao verificar cliente no Stripe:`, err);
        throw new Error(`Cliente inválido ou não encontrado no Stripe: ${customerId}`);
      }
      
      const priceId = tipoAssinatura === 'email' ? PRECOS.EMAIL : PRECOS.PHYSICAL;
      console.log(`Usando price_id: ${priceId} para assinatura ${tipoAssinatura}`);
      
      // Criar uma sessão de checkout para assinatura
      // Estamos usando a configuração básica do Stripe, que já faz a cobrança no início do ciclo
      // No painel do Stripe, você pode configurar para cobrar no momento da assinatura
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl,
        locale: 'pt-BR',
        allow_promotion_codes: true,
        billing_address_collection: 'auto'
      });
      
      console.log(`Sessão de checkout criada: ${session.id}, URL: ${session.url}`);
      
      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      throw error;
    }
  },
  
  /**
   * Método legado - criar uma assinatura no Stripe (mantido para compatibilidade)
   */
  async createSubscription(
    customerId: string, 
    tipoAssinatura: 'email' | 'physical'
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    try {
      console.log(`[DEPRECATED] Usando método legado de criação de assinatura para cliente ${customerId}`);
      console.log(`Recomendamos migrar para o método createSubscriptionCheckout`);
      
      // Verificar se o cliente existe no Stripe
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || (customer as any).deleted) {
          throw new Error(`Cliente não encontrado no Stripe: ${customerId}`);
        }
      } catch (err) {
        console.error(`Erro ao verificar cliente no Stripe:`, err);
        throw new Error(`Cliente inválido ou não encontrado no Stripe: ${customerId}`);
      }
      
      const priceId = tipoAssinatura === 'email' ? PRECOS.EMAIL : PRECOS.PHYSICAL;
      
      // Primeiro criar um PaymentIntent para a primeira cobrança
      const paymentIntent = await stripe.paymentIntents.create({
        amount: tipoAssinatura === 'email' ? 990 : 2990, // valores em centavos
        currency: 'brl',
        customer: customerId,
        setup_future_usage: 'off_session', // para permitir cobranças futuras sem cartão
      });
      
      // Criar a assinatura
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: 'pm_card_visa', // Método de pagamento padrão para testes
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Extrair o client_secret do payment_intent
      let clientSecret = null;
      
      // Verificar se temos latest_invoice com payment_intent expandido
      const invoice = subscription.latest_invoice as any;
      if (invoice && 
          typeof invoice !== 'string' &&
          invoice.payment_intent &&
          typeof invoice.payment_intent !== 'string') {
        clientSecret = invoice.payment_intent.client_secret;
      } else {
        // Tenta obter o client_secret do PaymentIntent criado separadamente
        clientSecret = paymentIntent.client_secret;
      }
      
      return {
        subscriptionId: subscription.id,
        clientSecret,
      };
    } catch (error) {
      console.error('Erro ao criar assinatura no Stripe:', error);
      throw error;
    }
  },

  /**
   * Pausar uma assinatura no Stripe por um período específico
   */
  async pauseSubscription(
    subscriptionId: string, 
    resumeDate: Date
  ): Promise<Stripe.Subscription> {
    // Converte para timestamp unix
    const resumeTime = Math.floor(resumeDate.getTime() / 1000);
    
    return await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeTime,
      },
    });
  },
  
  /**
   * Pausar uma assinatura no Stripe por um período específico em dias
   * @param subscriptionId ID da assinatura no Stripe
   * @param periodoDias Quantidade de dias para pausar (30, 60, 90 ou 180)
   */
  async pausarPorPeriodo(
    subscriptionId: string,
    periodoDias: 30 | 60 | 90 | 180
  ): Promise<Stripe.Subscription> {
    // Calcula a data de retorno baseada no período solicitado
    const dataAtual = new Date();
    const dataRetorno = new Date(dataAtual);
    dataRetorno.setDate(dataRetorno.getDate() + periodoDias);
    
    // Chama o método de pausar com a data calculada
    return this.pauseSubscription(subscriptionId, dataRetorno);
  },

  /**
   * Cancelar uma assinatura no Stripe
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
  },

  /**
   * Criar um payment intent para pagamento único
   */
  async createPaymentIntent(
    customerId: string, 
    amount: number, 
    currency: string = 'brl'
  ): Promise<{ clientSecret: string }> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Converte para centavos
      currency: currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret as string,
    };
  },

  /**
   * Obter uma assinatura do Stripe
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  },

  /**
   * Webhook para eventos do Stripe
   */
  async handleWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<Stripe.Event> {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }
  },
};