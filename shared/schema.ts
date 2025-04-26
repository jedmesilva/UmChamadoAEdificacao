import { pgTable, text, serial, integer, boolean, timestamp, json, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Usuários do sistema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  whatsapp: text("whatsapp"),
  status: text("status").default("active"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Status das cartas
export const letterStatusEnum = pgEnum("letter_status", ["published", "draft"]);

// Cartas espirituais
export const letters = pgTable("letters", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(), // numero sequencial da carta
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  status: letterStatusEnum("status").default("published"),
  jsonContent: json("json_content"),
  markdownContent: text("markdown_content"),
});

// Status de leitura das cartas por usuário
export const letterReadStatus = pgTable("letter_read_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  letterId: integer("letter_id").references(() => letters.id),
  status: text("status").default("read"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tipos de assinatura
export const subscriptionTypeEnum = pgEnum("subscription_type", ["email", "physical"]);

// Status da assinatura
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "canceled", "paused"]);

// Subscrições ao newsletter e assinaturas físicas
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  type: subscriptionTypeEnum("type").default("email"),
  status: subscriptionStatusEnum("status").default("active"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  pauseUntil: timestamp("pause_until"),
  cancelAt: timestamp("cancel_at"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("Brasil"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  password: true,
  name: true,
  email: true,
  whatsapp: true,
});

export const insertLetterSchema = createInsertSchema(letters);
export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  email: true,
  type: true,
  status: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Letter = typeof letters.$inferSelect;
export type InsertLetter = z.infer<typeof insertLetterSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type LetterReadStatus = typeof letterReadStatus.$inferSelect;

// Tipo para a carta vinda do Supabase (Carta) - compatibilidade
export interface SupabaseCarta {
  id: number; // ID primário da carta na tabela
  id_sumary_carta: number; // Número/índice da carta para exibição
  date_send: string;
  status_carta: string;
  title: string; // Título da carta
  description: string; // Descrição da carta
  jsonbody_carta: any; // Conteúdo da carta em formato JSON
  markdonw_carta: string; // Conteúdo da carta em formato Markdown
}
