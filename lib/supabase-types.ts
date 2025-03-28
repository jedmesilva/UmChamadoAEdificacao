export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface AccountUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  whatsapp?: string;
  status: string;
}

export interface Subscription {
  id: string;
  email_subscription: string;
  created_at: string;
  status?: string; // Tornado opcional para compatibilidade
}

export interface Carta {
  id: number; // ID primário da carta
  id_sumary_carta: number; // Número/índice da carta para exibição
  date_send: string;
  status_carta: string;
  title: string; // Título da carta
  description: string; // Descrição da carta
  jsonbody_carta: any; // Conteúdo da carta em formato JSON
  markdonw_carta: string; // Conteúdo da carta em formato Markdown
}

export interface StatusCarta {
  id: string;
  carta_id: number;
  account_user_id: string;
  created_at: string;
  status: string;
}

export interface SupabaseSchema {
  public: {
    Tables: {
      account_user: {
        Row: AccountUser;
        Insert: Omit<AccountUser, 'id'> & { id?: string };
        Update: Partial<AccountUser>;
      };
      cartas_um_chamado_a_edificacao: {
        Row: Carta;
        Insert: Carta;
        Update: Partial<Carta>;
      };
      subscription_um_chamado: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Subscription>;
      };
      status_carta: {
        Row: StatusCarta;
        Insert: Omit<StatusCarta, 'id' | 'created_at'> & { id?: string };
        Update: Partial<StatusCarta>;
      };
    };
  };
  auth: {
    Users: SupabaseUser;
  };
}