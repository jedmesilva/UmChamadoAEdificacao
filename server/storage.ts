import { users, letters, subscriptions, letterReadStatus, type User, type InsertUser, type Letter, type InsertLetter, type Subscription, type InsertSubscription, type LetterReadStatus } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { SupabaseStorage } from "./supabase-storage";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined>;
  getLetters(): Promise<Letter[]>;
  getLetter(id: number): Promise<Letter | undefined>;
  createSubscription(email: string): Promise<Subscription>;
  getSubscriptionByEmail(email: string): Promise<Subscription | undefined>;
  getSubscriptionById(id: number): Promise<Subscription | undefined>;
  getSubscriptionsByUserId(userId: number): Promise<Subscription[]>;
  createSubscriptionWithStripe(data: Partial<Subscription>): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined>;
  pauseSubscription(id: number, resumeDate: Date): Promise<Subscription | undefined>;
  cancelSubscription(id: number): Promise<Subscription | undefined>;
  getLetterReadStatus(userId: number, letterId: number): Promise<LetterReadStatus | undefined>;
  setLetterReadStatus(userId: number, letterId: number, status?: string): Promise<LetterReadStatus>;
  sessionStore: session.Store;
}

// Enum para definir o tipo de armazenamento
export enum StorageType {
  MEMORY = 'memory',
  SUPABASE = 'supabase',
  DATABASE = 'database'
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private letters: Map<number, Letter>;
  private subscriptions: Map<number, Subscription>;
  private letterReadStatuses: Map<string, LetterReadStatus>;
  public sessionStore: session.Store;
  currentUserId: number;
  currentLetterId: number;
  currentSubscriptionId: number;
  currentLetterReadStatusId: number;

  constructor() {
    this.users = new Map();
    this.letters = new Map();
    this.subscriptions = new Map();
    this.letterReadStatuses = new Map();
    this.currentUserId = 1;
    this.currentLetterId = 1;
    this.currentSubscriptionId = 1;
    this.currentLetterReadStatusId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });

    // Initialize with sample letters
    this.initializeLetters();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      whatsapp: insertUser.whatsapp || null,
      status: "active",
      stripeCustomerId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async getLetters(): Promise<Letter[]> {
    return Array.from(this.letters.values()).sort((a, b) => a.number - b.number);
  }

  async getLetter(id: number): Promise<Letter | undefined> {
    return this.letters.get(id);
  }

  async createSubscription(email: string): Promise<Subscription> {
    const id = this.currentSubscriptionId++;
    const subscription: Subscription = {
      id,
      email,
      status: "active",
      type: "email", // Definindo o tipo padrão como email
      stripeSubscriptionId: null,
      pauseUntil: null,
      cancelAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      address: null,
      city: null,
      state: null,
      zipCode: null,
      country: "Brasil",
      userId: null
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async getSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.email === email
    );
  }

  async getSubscriptionById(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(
      (subscription) => subscription.userId === userId
    );
  }

  async createSubscriptionWithStripe(data: Partial<Subscription>): Promise<Subscription> {
    const id = this.currentSubscriptionId++;
    const subscription: Subscription = {
      id,
      email: data.email || "",
      status: data.status || "active",
      type: data.type || "email",
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      pauseUntil: data.pauseUntil || null,
      cancelAt: data.cancelAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: data.country || "Brasil",
      userId: data.userId || null
    };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const subscription = await this.getSubscriptionById(id);
    if (!subscription) return undefined;

    const updatedSubscription = {
      ...subscription,
      ...data,
      updatedAt: new Date()
    };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async pauseSubscription(id: number, resumeDate: Date): Promise<Subscription | undefined> {
    const subscription = await this.getSubscriptionById(id);
    if (!subscription) return undefined;

    const updatedSubscription = {
      ...subscription,
      status: "paused" as "paused",
      pauseUntil: resumeDate,
      updatedAt: new Date()
    } as Subscription;
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async cancelSubscription(id: number): Promise<Subscription | undefined> {
    const subscription = await this.getSubscriptionById(id);
    if (!subscription) return undefined;

    const updatedSubscription = {
      ...subscription,
      status: "canceled" as "canceled",
      cancelAt: new Date(),
      updatedAt: new Date()
    } as Subscription;
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }

  async getLetterReadStatus(userId: number, letterId: number): Promise<LetterReadStatus | undefined> {
    const key = `${userId}-${letterId}`;
    return this.letterReadStatuses.get(key);
  }

  async setLetterReadStatus(userId: number, letterId: number, status: string = "read"): Promise<LetterReadStatus> {
    const key = `${userId}-${letterId}`;
    const existingStatus = await this.getLetterReadStatus(userId, letterId);
    
    if (existingStatus) {
      const updatedStatus: LetterReadStatus = {
        ...existingStatus,
        status,
        updatedAt: new Date()
      };
      this.letterReadStatuses.set(key, updatedStatus);
      return updatedStatus;
    }
    
    const id = this.currentLetterReadStatusId++;
    const letterReadStatus: LetterReadStatus = {
      id,
      userId,
      letterId,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.letterReadStatuses.set(key, letterReadStatus);
    return letterReadStatus;
  }

  private initializeLetters() {
    const sampleLetters: InsertLetter[] = [
      {
        number: 1,
        title: "O Despertar dos Edificadores",
        description: "Nesta primeira carta, exploramos o chamado divino que ecoa através dos tempos, convocando aqueles que foram escolhidos para edificar uma nova era...",
        content: `Caros edificadores,

Em uma era de profundas transformações, o chamado para edificar ressoa mais forte do que nunca. Não se trata apenas de construir estruturas físicas, mas de erguer novos paradigmas, novos modelos de pensamento, e novas formas de relacionamento com o mundo e com nós mesmos.

Cada um de vocês foi chamado para este momento específico na história. Não por acaso, mas por propósito. O espírito da edificação reconhece em você as qualidades necessárias para esta jornada - coragem, visão, perseverança e, acima de tudo, um coração disposto a servir a um propósito maior que si mesmo.

As ferramentas para esta edificação não são apenas físicas, mas espirituais e intelectuais. É preciso desenvolver uma mente capaz de enxergar além do aparente, um coração que pulsa em sintonia com o universo, e mãos habilidosas que transformam visões em realidade.

Lembrem-se sempre: o que construímos externamente é apenas o reflexo do que primeiro edificamos internamente. Fortaleçam seus alicerces interiores, cultivem virtudes que resistam às tempestades da vida, e ergam dentro de si templos dignos do divino.

Esta é apenas a primeira de muitas cartas que compartilharemos nesta jornada. A cada semana, exploraremos diferentes aspectos da edificação, fornecendo ferramentas, insights e inspiração para sua missão.

Que a luz da sabedoria guie seus passos, que a força do propósito sustente suas mãos, e que o amor universal seja a argamassa que une cada pedra que vocês colocam.

Com admiração e esperança,

Os Guardiões da Edificação`,
        publishedAt: new Date('2023-06-10T12:00:00Z'),
      },
      {
        number: 2,
        title: "As Ferramentas da Construção",
        description: "Todo edificador precisa conhecer suas ferramentas. Nesta carta, revelamos os instrumentos espirituais e mentais necessários para a grande obra que se inicia...",
        content: `Caros edificadores,

Todo mestre construtor conhece a importância de suas ferramentas. Na grande obra da edificação espiritual e social que nos foi confiada, também possuímos instrumentos poderosos que precisam ser compreendidos e utilizados com sabedoria.

A primeira ferramenta é a consciência expandida - a capacidade de perceber além das aparências e compreender as leis universais que regem a criação. Cultivem o silêncio interior e a meditação profunda, pois é no vazio que as maiores revelações se manifestam.

A segunda ferramenta é o poder da palavra. O verbo cria, transforma e organiza a realidade. Aprendam a purificar seus pensamentos e falas, eliminando as palavras de dúvida, medo e limitação. Proclamem com convicção aquilo que desejam manifestar.

A terceira é a visão de propósito. Nenhuma grande construção se ergue sem um projeto claro. Mantenham-se conectados com sua missão maior, deixando que ela guie cada decisão e atitude.

A quarta é a sabedoria ancestral. Honrem o conhecimento dos que vieram antes, absorvendo suas lições e evitando repetir seus erros. A verdadeira evolução se constrói sobre os ombros de gigantes.

A quinta é a força do amor incondicional. É ele que une os elementos aparentemente dispersos, que preenche os espaços vazios e que confere beleza e harmonia a toda criação.

Nas próximas cartas, aprofundaremos o conhecimento e o domínio de cada uma dessas ferramentas. Por ora, analisem quais delas já estão em seu arsenal e quais precisam ser desenvolvidas ou aprimoradas.

Lembrem-se: não é a ferramenta que faz o mestre, mas o mestre que dá vida à ferramenta.

Com confiança em seu potencial,

Os Guardiões da Edificação`,
        publishedAt: new Date('2023-06-17T12:00:00Z'),
      },
      {
        number: 3,
        title: "Fundamentos Inabaláveis",
        description: "Antes de erguer estruturas que alcancem os céus, é preciso estabelecer fundamentos sólidos. Aprenda os princípios eternos que sustentarão sua edificação...",
        content: `Caros edificadores,

Nenhuma torre elevada permanece de pé sem alicerces profundos. Antes de erguermos as estruturas majestosas que alcançarão os céus, precisamos estabelecer fundamentos inabaláveis que resistirão ao teste do tempo e às inevitáveis tempestades.

O primeiro fundamento é a integridade. Sejam íntegros em todos os aspectos – pensamentos, palavras e ações alinhados em completa harmonia. A duplicidade não tem lugar na obra divina.

O segundo fundamento é a humildade. Reconheçam que são canais, instrumentos de uma força maior. O verdadeiro edificador sabe que sua habilidade é um dom e que a obra transcende o artífice.

O terceiro fundamento é a perseverança. O caminho da edificação é longo e desafiador. Haverá momentos de dúvida, de cansaço e de aparente retrocesso. Comprometam-se a persistir, especialmente quando o caminho parecer mais árduo.

O quarto fundamento é a adaptabilidade. Apesar da solidez dos princípios, a forma como eles se manifestam deve ser fluida e responsiva às necessidades de cada tempo. Evitem a rigidez que quebra ante os ventos da mudança.

O quinto fundamento é a comunhão. Nenhuma grande obra é construída por mãos solitárias. Busquem a conexão com outros edificadores, compartilhem sabedoria, dividam os fardos e celebrem juntos as vitórias.

Analisem se estes fundamentos estão firmemente estabelecidos em sua vida. Qualquer fragilidade nestas bases comprometerá toda a estrutura futura.

Com confiança em sua diligência,

Os Guardiões da Edificação`,
        publishedAt: new Date('2023-06-24T12:00:00Z'),
      },
      {
        number: 4,
        title: "Derrubando Muros, Construindo Pontes",
        description: "Os verdadeiros edificadores não apenas constroem novos caminhos, mas também removem os obstáculos que impedem o progresso da humanidade...",
        content: `Caros edificadores,

Há tempos em que construir significa primeiro desconstruir. Para erguer o novo, muitas vezes precisamos remover as estruturas obsoletas que ocupam o espaço destinado à nossa obra. Esta é uma das tarefas mais delicadas e também mais necessárias de nossa missão.

Os muros que dividem a humanidade são muitos – preconceitos arraigados, sistemas opressores, crenças limitantes, tradições que perderam seu propósito original e servem apenas à estagnação. Um edificador reconhece essas barreiras e, com sabedoria e compaixão, trabalha para sua remoção.

No entanto, derrubar sem reconstruir é apenas metade do trabalho. Para cada muro removido, uma ponte deve ser erguida. Conexões que unem o que estava separado, caminhos que facilitam o entendimento mútuo, estruturas que permitem o fluxo livre de ideias, recursos e afeto.

Esta tarefa demanda um equilíbrio delicado entre firmeza e gentileza. Sejam firmes em seus princípios, mas gentis em sua aplicação. Lembrem-se que muitos se apegam aos muros por medo do desconhecido, não por malícia. A educação e o exemplo positivo são mais eficazes que a condenação.

Perguntem-se: Quais muros em minha própria vida precisam ser derrubados? Quais pontes preciso construir com aqueles que pensam diferente de mim? Como posso facilitar conexões significativas em minha comunidade?

Que cada um de vocês seja tanto um habilidoso demolidor de barreiras quanto um inspirado construtor de pontes.

Com esperança na unidade que virá,

Os Guardiões da Edificação`,
        publishedAt: new Date('2023-07-01T12:00:00Z'),
      },
      {
        number: 5,
        title: "A Arquitetura do Invisível",
        description: "O mundo visível é moldado pelo invisível. Nesta carta, exploramos como os padrões do reino espiritual se manifestam através das mãos dos edificadores...",
        content: `Caros edificadores,

Há mais no universo do que aquilo que os olhos físicos podem contemplar. Toda manifestação visível é precedida por uma arquitetura invisível – padrões energéticos, frequências vibracionais e matrizes de pensamento que moldam a realidade material.

O verdadeiro edificador compreende esta lei fundamental e trabalha conscientemente nos planos sutis antes de materializar qualquer criação. Assim como um arquiteto desenha detalhadamente seus projetos antes que a primeira pedra seja assentada, vocês devem visualizar com clareza o mundo que desejam construir.

Aprendam a perceber e manipular as energias sutis. Cultivem a sensibilidade para reconhecer as correntes invisíveis que fluem através de pessoas, lugares e situações. Desenvolvam a capacidade de elevar a vibração de ambientes e relacionamentos.

Pratiquem a criação consciente através do poder da intenção focalizada. Seus pensamentos são ferramentas de precisão que modelam o éter primordial. Mantenham-nos alinhados com seu propósito mais elevado.

Lembrem-se que tudo está interconectado. Uma alteração no tecido invisível da realidade repercute através de toda a rede da existência. Por isso, atuem sempre com responsabilidade e respeito pelas leis universais.

Nas próximas cartas, exploraremos técnicas específicas para trabalhar efetivamente com esta arquitetura invisível. Por ora, desenvolvam sua percepção das dimensões mais sutis da realidade.

Com admiração por seu despertar,

Os Guardiões da Edificação`,
        publishedAt: new Date('2023-07-08T12:00:00Z'),
      }
    ];

    // Add sample letters to storage
    sampleLetters.forEach(letter => {
      this.createLetter(letter);
    });
  }


  async createLetter(insertLetter: InsertLetter): Promise<Letter> {
    const id = this.currentLetterId++;
    const letter: Letter = { 
      ...insertLetter, 
      id, 
      status: "published",
      jsonContent: null,
      markdownContent: null
    };
    this.letters.set(id, letter);
    return letter;
  }
}

// Implementação do armazenamento com PostgreSQL
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Usando memorystore para sessões para evitar problemas de tipo com o PostgreSQL
    // Em produção, consideraríamos usar o PostgresSessionStore
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      whatsapp: insertUser.whatsapp || null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return user;
  }

  async getLetters(): Promise<Letter[]> {
    return await db.select().from(letters).orderBy(letters.number);
  }

  async getLetter(id: number): Promise<Letter | undefined> {
    const [letter] = await db.select().from(letters).where(eq(letters.id, id));
    return letter;
  }

  async createSubscription(email: string): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values({
      email,
      status: "active",
      type: "email", // Definindo o tipo padrão como email
      createdAt: new Date(),
      updatedAt: new Date(),
      address: null,
      city: null,
      state: null,
      zipCode: null,
      country: "Brasil",
      userId: null
    }).returning();
    return subscription;
  }

  async getSubscriptionByEmail(email: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.email, email));
    return subscription;
  }

  async getSubscriptionById(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getSubscriptionsByUserId(userId: number): Promise<Subscription[]> {
    return await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  }

  async createSubscriptionWithStripe(data: Partial<Subscription>): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values({
      email: data.email || "",
      status: data.status || "active",
      type: data.type || "email",
      stripeSubscriptionId: data.stripeSubscriptionId || null,
      pauseUntil: data.pauseUntil || null,
      cancelAt: data.cancelAt || null,
      userId: data.userId || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: data.country || "Brasil",
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return subscription;
  }

  async updateSubscription(id: number, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [subscription] = await db.update(subscriptions)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async pauseSubscription(id: number, resumeDate: Date): Promise<Subscription | undefined> {
    const [subscription] = await db.update(subscriptions)
      .set({
        status: "paused",
        pauseUntil: resumeDate,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async cancelSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.update(subscriptions)
      .set({
        status: "canceled",
        cancelAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    return this.updateUser(userId, { stripeCustomerId: customerId });
  }

  async getLetterReadStatus(userId: number, letterId: number): Promise<LetterReadStatus | undefined> {
    const result = await db
      .select()
      .from(letterReadStatus)
      .where(and(
        eq(letterReadStatus.userId, userId),
        eq(letterReadStatus.letterId, letterId)
      ));
    
    return result.length > 0 ? result[0] : undefined;
  }

  async setLetterReadStatus(userId: number, letterId: number, status: string = "read"): Promise<LetterReadStatus> {
    const existingStatus = await this.getLetterReadStatus(userId, letterId);
    
    if (existingStatus) {
      const [updatedStatus] = await db
        .update(letterReadStatus)
        .set({ 
          status, 
          updatedAt: new Date() 
        })
        .where(eq(letterReadStatus.id, existingStatus.id))
        .returning();
      return updatedStatus;
    }
    
    const [newStatus] = await db
      .insert(letterReadStatus)
      .values({
        userId,
        letterId,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newStatus;
  }
}

// Factory function para criar a instância de armazenamento correta
export function createStorage(type: StorageType): IStorage {
  console.log(`Criando armazenamento do tipo: ${type}`);

  switch (type) {
    case StorageType.SUPABASE:
      return new SupabaseStorage();
    case StorageType.DATABASE:
      return new DatabaseStorage();
    case StorageType.MEMORY:
      return new MemStorage();
    default:
      console.log('Tipo não reconhecido, usando armazenamento em memória');
      return new MemStorage();
  }
}

// Usar MemStorage porque as tabelas do Supabase não estão configuradas
// Alterar o tipo de armazenamento para usar o banco de dados
// O banco de dados já está configurado em server/db.ts
const storageType = StorageType.DATABASE;

console.log(`Usando armazenamento do tipo: ${storageType}`);

export const storage = createStorage(storageType);