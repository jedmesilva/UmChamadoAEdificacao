import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

type SupabaseAuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
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
      
      // A atualização de nome agora ocorre no backend de forma assíncrona
      // Não precisamos fazer nada aqui - o backend cuida disso quando necessário
    });

    // Configura o listener para mudanças de autenticação
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        // Não há mais necessidade de atualizar o nome do usuário aqui
        // Isso agora é responsabilidade do backend
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
          // Criar referência local para evitar erros de null
          const user = data.user;
          const session = data.session;
          
          // Atualizar o estado de autenticação localmente
          await supabaseClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          
          // Verifica se há metadados ou informações de nome no usuário retornado
          let userName = null;
          
          // Priorizar dados retornados da API
          if (user.name) {
            userName = user.name;
          } else if (user.metadata && (user.metadata.name || user.metadata.full_name)) {
            userName = user.metadata.name || user.metadata.full_name;
          }
          
          // Se encontrou o nome, apenas registramos nos logs
          // A atualização do nome agora é feita exclusivamente no backend
          if (userName) {
            console.log("Nome encontrado nos dados da API:", userName);
            // O backend já vai atualizar o nome, não precisamos fazer nada aqui
          }
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
      
      if (data && data.user) {
        const user = data.user;  // Criar uma referência local para evitar erros de null
        console.log("Login direto via Supabase bem-sucedido", user);
        
        // Verifica se há metadados com o nome do usuário
        const userData = user.user_metadata;
        if (userData && (userData.name || userData.full_name)) {
          const userName = userData.name || userData.full_name;
          console.log("Nome encontrado nos metadados:", userName);
          
          // A atualização do nome agora é feita exclusivamente no backend
          // Apenas registramos o nome nos logs para referência
          console.log("Nome encontrado nos metadados (será atualizado pelo backend se necessário):", userName);
        } else {
          console.log("Nenhum nome encontrado nos metadados do usuário");
        }
        
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
        
        // Garantir que todos os dados necessários sejam enviados para o cadastro
        const userData = {
          email,
          password,
          name,
          metadata: {
            name: name,
            full_name: name  // Adicionando também como full_name para compatibilidade
          }
        };
        
        console.log("Enviando dados completos para registro:", {
          ...userData,
          password: userData.password ? "***" : null
        });
        
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(userData),
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
            name: name,
            full_name: name  // Adicionando também como full_name para compatibilidade
          },
        },
      });
      
      if (error) throw error;
      
      // Verificamos se o usuário foi criado com sucesso
      if (data && data.user) {
        const user = data.user; // Criar uma referência local para evitar erros de null
        console.log("Registro direto via Supabase bem-sucedido", user);
        
        // A atualização do nome do usuário no perfil agora é feita exclusivamente no backend
        // O nome será preenchido automaticamente pelo backend com base nos metadados do usuário
        // Isso acontece durante o login, assim que o perfil é criado pela edge function
        
        console.log("O nome do usuário será atualizado pelo backend quando necessário");
        
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

  // A função createProfile foi removida, pois o perfil é criado automaticamente
  // durante o processo de registro através da API /api/auth/register

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