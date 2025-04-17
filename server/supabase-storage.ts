import { type User, type InsertUser, type Letter, type InsertLetter, type Subscription, type InsertSubscription, type LetterReadStatus } from "@shared/schema";
import session from "express-session";
import { authService, cartasService, subscriptionService } from "../lib/supabase-service";
import { AccountUser, Carta, Subscription as SupabaseSubscription, StatusCarta } from "../lib/supabase-types";
import createMemoryStore from "memorystore";
import { getRLSBypassClient } from "../lib/supabase";

// Importando a interface que precisamos
import { IStorage } from "./storage";

// Usamos memorystore para sessões para evitar problemas com PostgreSQL
const MemoryStore = createMemoryStore(session);

export class SupabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    console.log('Inicializando SupabaseStorage');
    
    // Usamos sempre MemoryStore para sessões
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 horas
    });
    console.log('MemoryStore criado com sucesso para gerenciamento de sessões');
    
  }

  // Converte um AccountUser do Supabase para um User da aplicação
  private mapToUser(accountUser: AccountUser): User {
    return {
      id: parseInt(accountUser.id), // Convertendo string para número
      email: accountUser.email,
      name: accountUser.name,
      password: '', // Não temos acesso à senha (hash) pelo Supabase
      whatsapp: accountUser.whatsapp || null,
      status: accountUser.status || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Converte uma Carta do Supabase para uma Letter da aplicação
  private mapToLetter(carta: Carta): Letter {
    return {
      id: carta.id_sumary_carta,
      number: carta.id_sumary_carta,
      title: carta.jsonbody_carta?.title || 'Sem título',
      description: carta.jsonbody_carta?.description || 'Sem descrição',
      content: carta.markdonw_carta || carta.jsonbody_carta?.content || 'Sem conteúdo',
      publishedAt: new Date(carta.date_send),
      status: "published",
      jsonContent: carta.jsonbody_carta || null,
      markdownContent: carta.markdonw_carta || null
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      // Busca o usuário do Supabase pelo ID
      const accountUser = await authService.getUserById(id.toString());
      if (!accountUser) return undefined;

      // Converte para o formato do User da aplicação
      return this.mapToUser(accountUser);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Busca o usuário do Supabase pelo email
      const accountUser = await authService.getUserByEmail(email);
      if (!accountUser) return undefined;

      // Converte para o formato do User da aplicação
      return this.mapToUser(accountUser);
    } catch (error) {
      console.error("Erro ao buscar usuário por email:", error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Criação completa do usuário no Supabase
      const { accountUser } = await authService.completeRegistration(
        user.email,
        user.name,
        user.password
      );

      // Converte para o formato do User da aplicação
      return this.mapToUser(accountUser);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      throw error;
    }
  }

  async getLetters(): Promise<Letter[]> {
    try {
      // Busca todas as cartas do Supabase
      const cartas = await cartasService.getAllCartas();
      
      // Converte para o formato das Letters da aplicação
      return cartas.map(carta => this.mapToLetter(carta));
    } catch (error) {
      console.error("Erro ao buscar cartas:", error);
      return [];
    }
  }

  async getLetter(id: number): Promise<Letter | undefined> {
    try {
      // Busca uma carta específica do Supabase pelo ID
      const carta = await cartasService.getCartaById(id);
      if (!carta) return undefined;

      // Converte para o formato da Letter da aplicação
      return this.mapToLetter(carta);
    } catch (error) {
      console.error(`Erro ao buscar carta ${id}:`, error);
      return undefined;
    }
  }

  async createLetter(letter: InsertLetter): Promise<Letter> {
    // Esta implementação precisaria de um método específico no cartasService
    // Como não temos essa funcionalidade no momento, vamos lançar um erro
    throw new Error("Criação de cartas não implementada no Supabase");
  }

  async createSubscription(email: string): Promise<Subscription> {
    try {
      // Cria uma subscrição no Supabase
      const supabaseSubscription = await subscriptionService.createSubscription(email);
      
      // Converte para o formato da aplicação
      return {
        id: parseInt(supabaseSubscription.id),
        email: supabaseSubscription.email_subscription,
        status: supabaseSubscription.status_subscription || "active",
        createdAt: new Date(supabaseSubscription.created_at),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Erro ao criar subscrição:", error);
      throw error;
    }
  }

  async getSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    try {
      // Verifica se existe uma subscrição para este email
      const exists = await subscriptionService.checkSubscription(email);
      if (!exists) return undefined;
      
      // Converte para o formato da aplicação
      return {
        id: parseInt(exists.id),
        email: exists.email_subscription,
        status: exists.status_subscription || "active",
        createdAt: new Date(exists.created_at),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Erro ao verificar subscrição:", error);
      return undefined;
    }
  }

  async getLetterReadStatus(userId: number, letterId: number): Promise<LetterReadStatus | undefined> {
    try {
      // Esta funcionalidade não está implementada no Supabase, então retornamos undefined
      console.warn("Leitura de status de carta não implementada no Supabase");
      return undefined;
    } catch (error) {
      console.error("Erro ao buscar status de leitura:", error);
      return undefined;
    }
  }

  async setLetterReadStatus(userId: number, letterId: number, status: string = "read"): Promise<LetterReadStatus> {
    try {
      // Tentamos registrar a leitura da carta no Supabase
      await cartasService.registrarLeitura(letterId, userId.toString());
      
      // Retornamos um status fictício já que não conseguimos recuperar o real do Supabase
      return {
        id: 0,
        userId,
        letterId,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error("Erro ao definir status de leitura:", error);
      throw error;
    }
  }
}

// Não precisamos importar IStorage novamente, já importamos no topo do arquivo