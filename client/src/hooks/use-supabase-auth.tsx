
// src/hooks/use-supabase-auth.tsx
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabaseClient, isSupabaseConfigured, logSupabaseStatus } from '@/lib/supabase';
import { User, SupabaseClient } from '@supabase/supabase-js';

// Log do status do Supabase para debug
if (typeof window !== 'undefined') {
  // Mostra o status atual do Supabase no console quando o hook é carregado
  // Isto é útil para debug em diferentes ambientes
  console.log('[Auth Hook] Inicializando hook de autenticação Supabase');
  logSupabaseStatus();
}

// Utilizamos o cliente já configurado em lib/supabase.ts que gerencia as variáveis
// de ambiente de forma consistente entre desenvolvimento e produção
const supabase = supabaseClient;

// Definição da interface para o contexto da autenticação
interface SupabaseAuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  supabase: SupabaseClient;
}

// Criar o contexto para autenticação
const SupabaseAuthContext = createContext<SupabaseAuthContextType | null>(null);

// Hook para usar o contexto
export function useSupabaseAuth(): SupabaseAuthContextType {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth deve ser usado dentro de um SupabaseAuthProvider');
  }
  return context;
}

// Provider component
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  // Verificar se o Supabase está devidamente configurado
  useEffect(() => {
    const checkSupabaseConfig = () => {
      const configured = isSupabaseConfigured();
      setIsSupabaseReady(configured);
      
      if (!configured) {
        console.error('[Auth Provider] Supabase não está configurado corretamente. Autenticação não funcionará.');
        setError(new Error('Serviço de autenticação não está configurado corretamente. Contate o suporte.'));
      } else {
        console.log('[Auth Provider] Supabase configurado corretamente');
      }
    };
    
    checkSupabaseConfig();
  }, []);

  // Verificar status de autenticação inicial
  useEffect(() => {
    // Se o Supabase não estiver configurado, não tenta fazer verificações
    if (!isSupabaseReady) {
      setIsLoading(false);
      return () => {}; // Retorna uma função de cleanup vazia
    }
    
    const checkUser = async () => {
      try {
        setIsLoading(true);

        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        // Atualizar estado do usuário com base na sessão
        if (session?.user) {
          setUser(session.user);
          console.log('[Auth Provider] Usuário logado:', session.user.email);
        } else {
          console.log('[Auth Provider] Nenhum usuário logado');
        }

        // Configurar listener para mudanças de autenticação
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          const newUser = session?.user || null;
          setUser(newUser);
          console.log('[Auth Provider] Estado de autenticação alterado:', newUser ? 'Logado' : 'Deslogado');
        });

        return () => {
          if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
            authListener.subscription.unsubscribe();
          }
        };
      } catch (err) {
        console.error('[Auth Provider] Erro ao verificar autenticação:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, [isSupabaseReady]);

  // Login com email/senha
  const signIn = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cadastro com tratamento inteligente para usuários existentes
  const signUp = useCallback(async (email, password, name) => {
    try {
      setIsLoading(true);
      setError(null);

      // Se não existe, prossegue com o cadastro
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth-callback`
        }
      });

      if (error) {
        // Verificar se o erro é porque o usuário já existe
        if (error.message.includes('already') || error.message.includes('já existe')) {
          console.log('Email já cadastrado (detectado pelo erro), tentando login direto');
          try {
            return await signIn(email, password);
          } catch (loginErr) {
            throw new Error('Este email já está cadastrado, mas a senha fornecida está incorreta');
          }
        }
        throw error;
      }

      // Se o registro foi bem-sucedido, também cria o perfil na tabela de usuários
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('account_user')
            .insert({
              id: data.user.id,
              user_id: data.user.id,
              email: email,
              name: name,
              status: 'is_complit'
            });

          if (profileError) {
            console.error('Erro ao criar perfil do usuário:', profileError);
            // Não falha o processo por isso, continua usando o usuário criado
          }
        } catch (profileErr) {
          console.error('Exceção ao criar perfil:', profileErr);
        }
      }

      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [signIn]);

  // Logout
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = {
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    supabase
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}