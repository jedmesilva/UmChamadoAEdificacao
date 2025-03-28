import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const letters = pgTable("letters", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  // Campos adicionais do Supabase
  jsonContent: json("json_content"),
  markdownContent: text("markdown_content"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  password: true,
  name: true,
  email: true,
});

export const insertLetterSchema = createInsertSchema(letters);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Letter = typeof letters.$inferSelect;
export type InsertLetter = z.infer<typeof insertLetterSchema>;

// Tipo para a carta vinda do Supabase (Carta)
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
