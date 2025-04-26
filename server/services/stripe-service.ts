import Stripe from 'stripe';
import { User, Subscription } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não configurada no ambiente.');
}

// Inicialização do cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Preços das assinaturas (você pode criar esses produtos/preços no painel do Stripe)
const PRECOS = {
  EMAIL: 'price_email', // ID do preço para o plano de email (substitua por um ID real)
  PHYSICAL: 'price_physical', // ID do preço para o plano físico (substitua por um ID real)
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
    const priceId = tipoAssinatura === 'email' ? PRECOS.EMAIL : PRECOS.PHYSICAL;
    
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || null,
    };
  },

  /**
   * Pausar uma assinatura no Stripe
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