import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertLetterSchema, insertSubscriptionSchema, insertUserSchema } from "@shared/schema";

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
  
  // Rota específica para inscrição na landing page
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email é obrigatório" });
      }
      
      const subscription = await storage.createSubscription(email);
      res.status(200).json({ 
        success: true, 
        message: "Inscrição realizada com sucesso", 
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
  
  app.get(apiRouter("/subscriptions/:email"), async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}