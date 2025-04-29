import Stripe from 'stripe';
import { User, Subscription } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY não configurada no ambiente.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRECOS = {
  EMAIL: 'price_1RIxZy2fmZFrPmI8ninIzKB9',
  PHYSICAL: 'price_1RIxfk2fmZFrPmI8LTf4uC3s',
};

export const stripeService = {
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

  async createSubscription(
    customerId: string, 
    tipoAssinatura: 'email' | 'physical'
  ): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    try {
      console.log(`Criando assinatura para cliente ${customerId}, tipo: ${tipoAssinatura}`);

      // 1. Garantir que o customer existe e está válido
      let customer;
      try {
        customer = await stripe.customers.retrieve(customerId);
        if ((customer as any).deleted) {
          throw new Error('Customer deletado');
        }
      } catch (error) {
        throw new Error(`Cliente inválido ou não encontrado no Stripe: ${customerId}`);
      }

      // 2. Definir o preço baseado no tipo de assinatura
      const priceId = tipoAssinatura === 'email' ? PRECOS.EMAIL : PRECOS.PHYSICAL;

      // Criar a assinatura com coleta de pagamento
      // 1. Criar a subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        }
      });

      // 2. Buscar a invoice
      const invoice = await stripe.invoices.retrieve(
        subscription.latest_invoice as string,
        {
          expand: ['payment_intent']
        }
      );

      // 3. Obter o client_secret do payment_intent
      const clientSecret = (invoice.payment_intent as Stripe.PaymentIntent).client_secret;

      return {
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      };
    } catch (error) {
      console.error('Erro ao criar assinatura no Stripe:', error);
      throw error;
    }
  },

  async pauseSubscription(
    subscriptionId: string, 
    resumeDate: Date
  ): Promise<Stripe.Subscription> {
    const resumeTime = Math.floor(resumeDate.getTime() / 1000);

    return await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeTime,
      },
    });
  },

  async pausarPorPeriodo(
    subscriptionId: string,
    periodoDias: 30 | 60 | 90 | 180
  ): Promise<Stripe.Subscription> {
    const dataAtual = new Date();
    const dataRetorno = new Date(dataAtual);
    dataRetorno.setDate(dataRetorno.getDate() + periodoDias);

    return this.pauseSubscription(subscriptionId, dataRetorno);
  },

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.cancel(subscriptionId);
  },

  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  },

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