import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseClient } from '../lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

type SupabaseAuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  createProfile: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Busca a sessão atual
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Configura o listener para mudanças de autenticação
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log(`Iniciando login para ${email}`);
      
      try {
        // Primeira tentativa: usar a API personalizada
        console.log("Tentando login via API em: /api/auth/login");
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password,
          }),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Erro na API de login: ${response.status} - ${errorData}`);
          throw new Error(`Erro no login: ${response.status} - ${errorData || response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Login via API foi bem-sucedido:", data);
        
        // Verificar se o login foi bem-sucedido
        if (data && data.user) {
          // Atualizar o estado de autenticação localmente
          await supabaseClient.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
        
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo de volta!",
        });
        
        return;
      } catch (apiError) {
        console.error("Erro na API de login, tentando diretamente com Supabase:", apiError);
        // Se falhar, cai no fallback direto com o Supabase
      }
      
      // Fallback: login direto via Supabase client
      console.log("Tentando login direto via Supabase client");
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data?.user) {
        console.log("Login direto via Supabase bem-sucedido", data.user);
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo de volta!",
        });
      } else {
        throw new Error("Login falhou - resposta inesperada");
      }
    } catch (error: any) {
      let errorMessage = "Tente novamente mais tarde";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Erro no login:", errorMessage);
      
      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      console.log(`Iniciando registro para ${email} com nome ${name}`);
      
      try {
        // Primeira tentativa: usar a API personalizada
        console.log("Tentando registro via API em: /api/auth/register");
        
        // Adicionar log detalhado dos dados sendo enviados
        console.log("Dados sendo enviados para registro:", { 
          email, 
          name,
          password: password ? "***" : null 
        });
        
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password,
            name,
          }),
          credentials: "include"
        });
        
        // Log da resposta para melhor análise
        console.log(`Resposta do servidor: ${response.status} ${response.statusText}`);
        
        let responseData;
        const responseText = await response.text();
        
        try {
          if (responseText) {
            responseData = JSON.parse(responseText);
            console.log("Resposta parseada do servidor:", responseData);
          }
        } catch (parseError) {
          console.error("Erro ao parsear resposta:", parseError, "Texto da resposta:", responseText);
        }
        
        if (!response.ok) {
          console.error(`Erro na API de registro: ${response.status} - ${responseText}`);
          throw new Error(`Erro no registro: ${response.status} - ${responseText || response.statusText}`);
        }
        
        toast({
          title: "Cadastro realizado com sucesso",
          description: "Conta criada com sucesso",
        });
        
        // Não faz login automaticamente - isso será gerenciado pelo fluxo de formulário
        return;
      } catch (apiError) {
        console.error("Erro na API de registro, tentando diretamente com Supabase:", apiError);
        // Se falhar, cai no fallback direto com o Supabase
      }
      
      // Fallback: registro direto via Supabase client
      console.log("Tentando registro direto via Supabase client");
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) throw error;
      
      // Verificamos se o usuário foi criado com sucesso
      if (data?.user) {
        console.log("Registro direto via Supabase bem-sucedido", data.user);
        toast({
          title: "Cadastro realizado com sucesso",
          description: "Conta criada com sucesso",
        });
        
        // Não faz login automaticamente - isso será gerenciado pelo fluxo de formulário
      } else {
        throw new Error("Não foi possível criar o usuário");
      }
      
    } catch (error: any) {
      let errorMessage = "Tente novamente mais tarde";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Erro no cadastro:", errorMessage);
      
      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createProfile = async (name: string, email: string) => {
    try {
      setIsLoading(true);
      console.log(`Iniciando criação de perfil para ${email} com nome ${name}`);
      
      if (!session) {
        throw new Error("Usuário precisa estar autenticado para criar perfil");
      }
      
      console.log("Tentando criar perfil via API em: /api/auth/create-profile");
      
      const response = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          email,
          user_id: user?.id,
          session
        }),
        credentials: "include"
      });
      
      console.log(`Resposta do servidor: ${response.status} ${response.statusText}`);
      
      let responseData;
      const responseText = await response.text();
      
      try {
        if (responseText) {
          responseData = JSON.parse(responseText);
          console.log("Resposta parseada do servidor:", responseData);
        }
      } catch (parseError) {
        console.error("Erro ao parsear resposta:", parseError, "Texto da resposta:", responseText);
      }
      
      if (!response.ok) {
        console.error(`Erro na API de criação de perfil: ${response.status} - ${responseText}`);
        throw new Error(`Erro na criação de perfil: ${response.status} - ${responseText || response.statusText}`);
      }
      
      toast({
        title: "Perfil criado com sucesso",
        description: "Seu perfil foi configurado corretamente",
      });
      
      return;
    } catch (error: any) {
      let errorMessage = "Tente novamente mais tarde";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Erro na criação do perfil:", errorMessage);
      
      toast({
        title: "Erro ao criar perfil",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Até a próxima!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signIn,
        signUp,
        createProfile,
        signOut,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth deve ser usado dentro de SupabaseAuthProvider");
  }
  return context;
}