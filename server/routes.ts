import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertLetterSchema, insertSubscriptionSchema, insertUserSchema } from "@shared/schema";
import { stripeService } from "./services/stripe-service";
import Stripe from "stripe";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  const apiRouter = (path: string) => `/api${path}`;
  
  // Letters routes
  app.get(apiRouter("/letters"), async (req, res) => {
    try {
      const letters = await storage.getLetters();
      res.json({ letters });
      
      console.log("Retrieved all letters");
    } catch (error) {
      console.error("Error fetching letters:", error);
      res.status(500).json({ error: "Failed to fetch letters" });
    }
  });
  
  app.get(apiRouter("/letters/:id"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const letter = await storage.getLetter(id);
      if (!letter) {
        return res.status(404).json({ error: "Letter not found" });
      }
      
      res.json(letter);
    } catch (error) {
      console.error("Error fetching letter:", error);
      res.status(500).json({ error: "Failed to fetch letter" });
    }
  });
  
  // User routes
  app.get(apiRouter("/users/:id"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  app.post(apiRouter("/users"), async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(validatedData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  
  // Subscription routes
  app.post(apiRouter("/subscriptions"), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const subscription = await storage.createSubscription(email);
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });
  
  // Rota para verificar o status de inscrição e fazer inscrição
  // Usamos a mesma rota '/api/subscribe' para desenvolvimento e produção
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email é obrigatório" });
      }
      
      // Também manter o endpoint antigo '/api/subscribe-status' como alias para compatibilidade
      app.post("/api/subscribe-status", (req2, res2) => {
        // Simplesmente encaminhar a requisição para /api/subscribe
        req.body = req2.body;
        app._router.handle(req, res);
      });
      
      // Importar os serviços do Supabase
      const { subscriptionService, authService } = await import("../lib/supabase-service");
      
      // 1. Verificar se já existe um usuário registrado com este email
      const userExists = await subscriptionService.checkUserExists(email);
      
      if (userExists) {
        return res.status(200).json({
          success: true,
          alreadyRegistered: true,
          message: "Você já possui cadastro! Entre com sua conta para continuar.",
          redirect: {
            path: "/auth",
            email: email,
            tab: "login"
          }
        });
      }
      
      // 2. Verificar se já existe uma inscrição com este email
      const existingSubscription = await subscriptionService.checkSubscription(email);
      
      if (existingSubscription) {
        // Já existe uma inscrição, mas não uma conta de usuário completa
        return res.status(200).json({
          success: true,
          alreadySubscribed: true,
          message: "Email já inscrito! Complete seu cadastro agora.",
          redirect: {
            path: "/auth",
            email: email,
            tab: "register"
          }
        });
      }
      
      // 3. Criar nova inscrição no Supabase
      const subscription = await subscriptionService.createSubscription(email);
      
      console.log("Subscrição criada com sucesso:", subscription);
      
      res.status(200).json({ 
        success: true, 
        message: "Inscrição realizada com sucesso! Complete seu cadastro agora.", 
        redirect: {
          path: "/auth",
          email: email,
          tab: "register"
        }
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(200).json({ success: false, message: "Erro ao processar sua inscrição" });
    }
  });
  
  app.get(apiRouter("/subscriptions/email/:email"), async (req, res) => {
    try {
      const email = req.params.email;
      
      const subscription = await storage.getSubscriptionByEmail(email);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });
  
  // Buscar assinaturas de um usuário com filtragem por tipo
  app.get(apiRouter("/subscriptions/user/:userId"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const type = req.query.type as string;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "ID de usuário inválido" });
      }
      
      // Buscar todas as assinaturas do usuário
      const subscriptions = await storage.getSubscriptionsByUserId(userId);
      
      if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: "Nenhuma assinatura encontrada para este usuário" 
        });
      }
      
      // Se um tipo específico foi solicitado, filtrar
      if (type) {
        const filteredSubscription = subscriptions.find(
          sub => sub.type === type && sub.status === "active"
        );
        
        if (!filteredSubscription) {
          return res.status(404).json({ 
            success: false,
            error: `Assinatura do tipo ${type} não encontrada ou não está ativa` 
          });
        }
        
        return res.json({ 
          success: true,
          subscription: filteredSubscription 
        });
      }
      
      // Caso contrário, retornar todas as assinaturas
      res.json({ 
        success: true,
        subscriptions: subscriptions 
      });
    } catch (error) {
      console.error("Error fetching user subscriptions:", error);
      res.status(500).json({ 
        success: false,
        error: "Falha ao buscar assinaturas" 
      });
    }
  });
  
  // Letter Read Status routes
  app.post(apiRouter("/letter-status"), async (req, res) => {
    try {
      const { userId, letterId, status } = req.body;
      if (!userId || !letterId) {
        return res.status(400).json({ error: "User ID and Letter ID are required" });
      }
      
      const letterStatus = await storage.setLetterReadStatus(userId, letterId, status);
      res.status(201).json(letterStatus);
    } catch (error) {
      console.error("Error setting letter status:", error);
      res.status(500).json({ error: "Failed to set letter status" });
    }
  });
  
  app.get(apiRouter("/letter-status/:userId/:letterId"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const letterId = parseInt(req.params.letterId);
      
      if (isNaN(userId) || isNaN(letterId)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }
      
      const letterStatus = await storage.getLetterReadStatus(userId, letterId);
      if (!letterStatus) {
        return res.status(404).json({ error: "Letter status not found" });
      }
      
      res.json(letterStatus);
    } catch (error) {
      console.error("Error fetching letter status:", error);
      res.status(500).json({ error: "Failed to fetch letter status" });
    }
  });
  
  // Stats endpoint
  app.get(apiRouter("/stats"), async (req, res) => {
    try {
      const letters = await storage.getLetters();
      
      // Calculate stats
      const stats = {
        totalLetters: letters.length,
        publishedLetters: letters.filter(letter => letter.status === "published").length,
        draftLetters: letters.filter(letter => letter.status === "draft").length
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // === Endpoints do Stripe ===
  
  // Criar customer e assinatura no Stripe
  app.post(apiRouter("/stripe/create-subscription"), async (req, res) => {
    console.log("Recebida requisição para criar assinatura:", req.body);
    try {
      const { userId, type } = req.body;
      
      if (!userId || !type) {
        return res.status(400).json({ 
          success: false, 
          error: "ID do usuário e tipo de assinatura são obrigatórios" 
        });
      }
      
      // Validar tipo de assinatura
      if (type !== "email" && type !== "physical") {
        return res.status(400).json({ 
          success: false, 
          error: "Tipo de assinatura inválido. Use 'email' ou 'physical'." 
        });
      }
      
      // Buscar informações do usuário
      let user;
      try {
        // Tenta encontrar usuário existente
        const userIdNum = parseInt(userId);
        if (!isNaN(userIdNum)) {
          console.log(`Buscando usuário com ID: ${userIdNum}`);
          user = await storage.getUser(userIdNum);
        }
        
        // Se não encontrar na base de dados local, tentar buscar no Supabase
        if (!user) {
          try {
            console.log(`Tentando buscar usuário no Supabase com ID: ${userId}`);
            const { authService } = await import("../lib/supabase-service");
            const supabaseUser = await authService.getUserById(userId);
            
            if (supabaseUser) {
              console.log(`Usuário encontrado no Supabase:`, supabaseUser);
              // Criar o usuário localmente para operações com Stripe
              user = await storage.createUser({
                email: supabaseUser.email,
                name: supabaseUser.name,
                password: "senha-temporaria-gerada"
              });
            }
          } catch (supabaseError) {
            console.error("Erro ao buscar usuário no Supabase:", supabaseError);
          }
        }
        
        // Se ainda não encontrar, criar um usuário temporário para teste
        if (!user) {
          console.log(`Criando usuário temporário para teste com ID: ${userId}`);
          const testEmail = `user-${userId}@example.com`;
          const testUser = await storage.createUser({
            email: testEmail,
            name: `Usuário de Teste ${userId}`,
            password: "senha-segura-123"
          });
          console.log(`Usuário de teste criado com ID: ${testUser.id}`);
          user = testUser;
        }
      } catch (error) {
        console.error("Erro ao buscar/criar usuário:", error);
        return res.status(500).json({ 
          success: false, 
          error: "Erro ao processar usuário" 
        });
      }
      
      // Verificar novamente se temos um usuário válido
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "Não foi possível encontrar ou criar usuário" 
        });
      }
      
      console.log(`Processando assinatura para usuário:`, {
        id: user.id,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId
      });
      
      // Verificar se o usuário já existe como cliente no Stripe
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        // Verificar se já existe um cliente no Stripe com este email
        const existingCustomerId = await stripeService.findCustomerByEmail(user.email);
        
        if (existingCustomerId) {
          // Encontrou um cliente existente no Stripe
          console.log(`Cliente encontrado no Stripe com o email ${user.email}, ID: ${existingCustomerId}`);
          stripeCustomerId = existingCustomerId;
          
          // Atualizar o usuário local com o ID do cliente no Stripe
          await storage.updateStripeCustomerId(user.id, stripeCustomerId);
        } else {
          // Criar novo cliente no Stripe
          console.log(`Criando novo cliente no Stripe para ${user.email}`);
          stripeCustomerId = await stripeService.createCustomer(user);
          
          // Atualizar o usuário com o ID do cliente no Stripe
          await storage.updateStripeCustomerId(user.id, stripeCustomerId);
        }
      }
      
      console.log(`Usando Stripe Customer ID: ${stripeCustomerId} para criar assinatura`);
      
      // Criar assinatura no Stripe
      const { subscriptionId, clientSecret } = await stripeService.createSubscription(
        stripeCustomerId,
        type as 'email' | 'physical'
      );
      
      if (!clientSecret) {
        throw new Error('Não foi possível obter o client secret para o pagamento');
      }
      
      console.log(`Assinatura criada no Stripe com ID: ${subscriptionId}`);
      
      // Criar a assinatura no banco de dados
      const subscription = await storage.createSubscriptionWithStripe({
        userId: user.id,
        email: user.email,
        type,
        status: "active",
        stripeSubscriptionId: subscriptionId,
      });
      
      console.log(`Assinatura registrada no banco de dados com ID: ${subscription.id}`);
      
      res.json({
        success: true,
        clientSecret,
        subscriptionId,
        subscription
      });
    } catch (error: any) {
      console.error("Erro ao criar assinatura:", error);
      res.status(500).json({ 
        success: false, 
        error: "Falha ao processar assinatura", 
        message: error.message 
      });
    }
  });
  
  // Pausar assinatura com data específica
  app.post(apiRouter("/stripe/pause-subscription"), async (req, res) => {
    try {
      const { subscriptionId, resumeDate } = req.body;
      
      if (!subscriptionId || !resumeDate) {
        return res.status(400).json({ 
          success: false, 
          error: "ID da assinatura e data para retorno são obrigatórios" 
        });
      }
      
      // Buscar a assinatura no banco de dados
      const subscription = await storage.getSubscriptionById(parseInt(subscriptionId));
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          error: "Assinatura não encontrada" 
        });
      }
      
      if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({ 
          success: false, 
          error: "Esta assinatura não possui um ID do Stripe associado" 
        });
      }
      
      // Pausar a assinatura no Stripe
      const pauseDate = new Date(resumeDate);
      await stripeService.pauseSubscription(subscription.stripeSubscriptionId, pauseDate);
      
      // Atualizar a assinatura no banco de dados
      const updatedSubscription = await storage.pauseSubscription(subscription.id, pauseDate);
      
      res.json({
        success: true,
        message: "Assinatura pausada com sucesso",
        subscription: updatedSubscription
      });
    } catch (error: any) {
      console.error("Erro ao pausar assinatura:", error);
      res.status(500).json({ 
        success: false, 
        error: "Falha ao pausar assinatura", 
        message: error.message 
      });
    }
  });
  
  // Pausar assinatura por um período específico
  app.post(apiRouter("/stripe/pause-subscription-period"), async (req, res) => {
    try {
      const { subscriptionId, periodoDias } = req.body;
      
      if (!subscriptionId || !periodoDias) {
        return res.status(400).json({ 
          success: false, 
          error: "ID da assinatura e período em dias são obrigatórios" 
        });
      }
      
      // Validar o período em dias
      if (![30, 60, 90, 180].includes(periodoDias)) {
        return res.status(400).json({ 
          success: false, 
          error: "Período de pausa inválido. Use 30, 60, 90 ou 180 dias." 
        });
      }
      
      // Buscar a assinatura no banco de dados
      const subscription = await storage.getSubscriptionById(parseInt(subscriptionId));
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          error: "Assinatura não encontrada" 
        });
      }
      
      if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({ 
          success: false, 
          error: "Esta assinatura não possui um ID do Stripe associado" 
        });
      }
      
      // Calcular data de retorno baseada no período
      const dataAtual = new Date();
      const dataRetorno = new Date(dataAtual);
      dataRetorno.setDate(dataRetorno.getDate() + periodoDias);
      
      // Pausar a assinatura no Stripe por período
      await stripeService.pausarPorPeriodo(
        subscription.stripeSubscriptionId, 
        periodoDias as 30 | 60 | 90 | 180
      );
      
      // Atualizar a assinatura no banco de dados
      const updatedSubscription = await storage.pauseSubscription(subscription.id, dataRetorno);
      
      res.json({
        success: true,
        message: `Assinatura pausada por ${periodoDias} dias com sucesso`,
        subscription: updatedSubscription,
        retornaNoDia: dataRetorno.toISOString().split('T')[0]
      });
    } catch (error: any) {
      console.error("Erro ao pausar assinatura:", error);
      res.status(500).json({ 
        success: false, 
        error: "Falha ao pausar assinatura", 
        message: error.message 
      });
    }
  });
  
  // Cancelar assinatura
  app.post(apiRouter("/stripe/cancel-subscription"), async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ 
          success: false, 
          error: "ID da assinatura é obrigatório" 
        });
      }
      
      // Buscar a assinatura no banco de dados
      const subscription = await storage.getSubscriptionById(parseInt(subscriptionId));
      if (!subscription) {
        return res.status(404).json({ 
          success: false, 
          error: "Assinatura não encontrada" 
        });
      }
      
      if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({ 
          success: false, 
          error: "Esta assinatura não possui um ID do Stripe associado" 
        });
      }
      
      // Cancelar a assinatura no Stripe
      await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      
      // Atualizar a assinatura no banco de dados
      const updatedSubscription = await storage.cancelSubscription(subscription.id);
      
      res.json({
        success: true,
        message: "Assinatura cancelada com sucesso",
        subscription: updatedSubscription
      });
    } catch (error: any) {
      console.error("Erro ao cancelar assinatura:", error);
      res.status(500).json({ 
        success: false, 
        error: "Falha ao cancelar assinatura", 
        message: error.message 
      });
    }
  });
  
  // Criar payment intent para pagamento único
  app.post(apiRouter("/stripe/create-payment-intent"), async (req, res) => {
    try {
      const { userId, amount, currency = 'brl' } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ 
          success: false, 
          error: "ID do usuário e valor são obrigatórios" 
        });
      }
      
      // Buscar o usuário
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "Usuário não encontrado" 
        });
      }
      
      // Criar ou obter cliente no Stripe
      let stripeCustomerId = user.stripeCustomerId;
      
      if (!stripeCustomerId) {
        // Criar cliente no Stripe
        stripeCustomerId = await stripeService.createCustomer(user);
        // Atualizar o usuário com o ID do cliente no Stripe
        await storage.updateStripeCustomerId(user.id, stripeCustomerId);
      }
      
      // Criar payment intent
      const { clientSecret } = await stripeService.createPaymentIntent(
        stripeCustomerId,
        amount,
        currency
      );
      
      res.json({
        success: true,
        clientSecret
      });
    } catch (error: any) {
      console.error("Erro ao criar payment intent:", error);
      res.status(500).json({ 
        success: false, 
        error: "Falha ao processar pagamento", 
        message: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}