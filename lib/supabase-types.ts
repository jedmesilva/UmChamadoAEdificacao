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

export interface EmailSignature {
  id: string;
  user_id: string;
  status_signature: string;
  created_at: string;
}

export interface ParchmentSignature {
  id: string;
  user_id: string;
  status_signature: string;
  created_at: string;
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
  status_email?: string; // Timestamp quando a carta foi enviada por email
  status_parchment?: string; // Timestamp quando a carta física foi enviada
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
      signature_email: {
        Row: EmailSignature;
        Insert: Omit<EmailSignature, 'id' | 'created_at'> & { id?: string };
        Update: Partial<EmailSignature>;
      };
      signature_parchment: {
        Row: ParchmentSignature;
        Insert: Omit<ParchmentSignature, 'id' | 'created_at'> & { id?: string };
        Update: Partial<ParchmentSignature>;
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