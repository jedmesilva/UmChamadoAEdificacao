
// src/hooks/use-supabase-auth.js (ou .ts se estiver usando TypeScript)
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// Use as variáveis de ambiente do seu projeto
// Se as variáveis não estiverem disponíveis, use valores vazios para evitar erros
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Cria o cliente Supabase
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Erro ao criar cliente Supabase:', error);
  // Criar um cliente falso para evitar erros de runtime
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null })
    },
    from: () => ({
      insert: () => Promise.resolve({ error: null })
    })
  };
}

// Criar o contexto para autenticação
const SupabaseAuthContext = createContext(null);

// Hook para usar o contexto
export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth deve ser usado dentro de um SupabaseAuthProvider');
  }
  return context;
}

// Provider component
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar status de autenticação inicial
  useEffect(() => {
    const checkUser = async () => {
      try {
        setIsLoading(true);

        // Verificar sessão atual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        // Atualizar estado do usuário com base na sessão
        if (session?.user) {
          setUser(session.user);
        }

        // Configurar listener para mudanças de autenticação
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user || null);
        });

        return () => {
          if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
            authListener.subscription.unsubscribe();
          }
        };
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

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