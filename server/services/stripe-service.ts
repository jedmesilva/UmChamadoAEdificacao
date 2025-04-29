import Stripe from 'stripe';
import { User, Subscription } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não configurada no ambiente.');
}

// Inicialização do cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Preços reais das assinaturas no Stripe
const PRECOS = {
  EMAIL: 'price_1RIxZy2fmZFrPmI8ninIzKB9', // ID do preço para o plano de email
  PHYSICAL: 'price_1RIxfk2fmZFrPmI8LTf4uC3s', // ID do preço para o plano físico (pergaminho)
};

export const stripeService = {
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
   * Criar uma assinatura no Stripe
   */
  async createSubscription(
    customerId: string, 
    tipoAssinatura: 'email' | 'physical'
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    try {
      console.log(`Criando assinatura para cliente ${customerId}, tipo: ${tipoAssinatura}`);
      const priceId = tipoAssinatura === 'email' ? PRECOS.EMAIL : PRECOS.PHYSICAL;
      
      // Primeiro criamos a assinatura sem expandir o payment_intent
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        // Não usamos expand aqui para evitar erros
      });
      
      console.log(`Assinatura criada com ID: ${subscription.id}`);
      
      // Acessando o ID do invoice para buscar o payment intent separadamente
      let clientSecret = null;
      const invoiceId = subscription.latest_invoice;
      
      if (invoiceId && typeof invoiceId === 'string') {
        console.log(`Buscando invoice: ${invoiceId}`);
        const invoice = await stripe.invoices.retrieve(invoiceId, {
          expand: ['payment_intent'],
        });
        
        console.log(`Invoice recuperado: ${invoice.id}, status: ${invoice.status}`);
        
        // Precisamos usar any aqui porque o tipo do invoice pode variar
        const paymentIntent = (invoice as any).payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object' && paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
          console.log(`Client secret obtido do payment intent`);
        } else {
          console.log(`Não foi possível obter payment_intent do invoice`, paymentIntent);
        }
      } else {
        console.log(`Invoice não encontrado ou não é string: ${invoiceId}`);
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