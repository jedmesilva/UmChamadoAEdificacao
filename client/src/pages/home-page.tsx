import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LetterCard from "@/components/letters/letter-card";
import SubscriptionBanner from "@/components/subscription-banner";
import { Letter, SupabaseCarta } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { cartaService } from "@/lib/carta-service";
// import { subscriptionService } from "@/lib/supabase-service"; // Problemas de importação
import { useEffect, useState } from "react";

const HomePage = () => {
  const { user } = useSupabaseAuth();
  const [cartasSupabase, setCartasSupabase] = useState<SupabaseCarta[]>([]);
  const [isCartasLoading, setIsCartasLoading] = useState(true);
  const [cartasError, setCartasError] = useState<Error | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  
  // Query para buscar cartas pela API REST (fallback)
  const { data: letters, isLoading: isLettersLoading, error: lettersError } = useQuery<Letter[]>({
    queryKey: ["/api/letters"],
    // Desabilitamos esta query se tivermos cartas do Supabase
    enabled: cartasSupabase.length === 0 && !isCartasLoading,
  });

  // Efeito para buscar as cartas diretamente do Supabase
  useEffect(() => {
    const fetchCartas = async () => {
      try {
        setIsCartasLoading(true);
        const cartas = await cartaService.getAllCartas();
        setCartasSupabase(cartas);
        console.log("Cartas carregadas do Supabase:", cartas.length);
      } catch (error) {
        console.error("Erro ao buscar cartas do Supabase:", error);
        setCartasError(error instanceof Error ? error : new Error('Erro desconhecido'));
      } finally {
        setIsCartasLoading(false);
      }
    };

    fetchCartas();
  }, []);
  
  // Efeito para verificar se o usuário já está inscrito com cache local
  useEffect(() => {
    const LOCAL_STORAGE_KEY = 'subscription_status';
    
    const checkSubscriptionStatus = async () => {
      if (!user || !user.email) return;
      
      try {
        setCheckingSubscription(true);
        
        // Verificar se temos cache local
        const cachedStatus = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${user.email}`);
        
        // Se temos um cache local indicando que o usuário já está inscrito,
        // não precisamos fazer a requisição
        if (cachedStatus === 'confirmed') {
          console.log('Usando cache local: usuário já está inscrito');
          setIsSubscribed(true);
          setCheckingSubscription(false);
          return;
        }
        
        console.log('Cache local não encontrado ou inválido, verificando com o servidor');
        
        // Verificar se estamos em ambiente de produção (Vercel) ou desenvolvimento
        const isProduction = window.location.hostname.includes('.vercel.app') || 
                           window.location.hostname.includes('.replit.app');
        
        // Preparando a requisição para o endpoint de verificação de status
        let response: Response | undefined;
        let retry = false;
        let attempts = 0;
        
        // Função para tentar fazer a requisição
        const attemptRequest = async (endpoint: string) => {
          console.log(`Tentativa ${attempts + 1} usando endpoint: ${endpoint}`);
          return fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: user.email }),
          });
        };
        
        // Tenta diferentes endpoints e estratégias
        do {
          retry = false;
          attempts++;
          
          try {
            if (isProduction) {
              // Em produção tentamos primeiro com o endpoint específico
              if (attempts === 1) {
                console.log('Usando endpoint específico check-subscription-status');
                response = await attemptRequest('/api/check-subscription-status');
              } else {
                // Na segunda tentativa, usamos um endpoint alternativo
                console.log('Tentando endpoint alternativo');
                response = await attemptRequest('/api/dashboard-subscribe');
              }
            } else {
              // Em desenvolvimento
              console.log('Ambiente de desenvolvimento: usando endpoint de verificação de status');
              response = await attemptRequest('/api/check-subscription-status');
            }
            
            // Se a resposta for 405 (Method Not Allowed) e estamos em produção
            // tentamos com outro endpoint
            if (response && response.status === 405 && isProduction && attempts === 1) {
              console.warn('Erro 405 detectado, tentando endpoint alternativo...');
              retry = true;
              continue;
            }
          } catch (networkError) {
            console.error('Erro de rede ao verificar status:', networkError);
            
            // Se houver erro de rede e estamos em produção, tentamos outro endpoint
            if (isProduction && attempts === 1) {
              console.warn('Erro de rede detectado, tentando endpoint alternativo...');
              retry = true;
              continue;
            }
            throw networkError;
          }
        } while (retry && attempts < 2);
        
        // Se não temos resposta, algo deu muito errado
        if (!response) {
          throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
        }
        
        // Verificar se a resposta é válida antes de tentar parsear o JSON
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erro na resposta (${response.status}):`, errorText);
          throw new Error(`Erro ao verificar status (${response.status}): ${errorText || 'Sem detalhes'}`);
        }
        
        // Tratativa para resposta vazia
        const responseText = await response.text();
        
        if (!responseText || responseText.trim() === '') {
          console.log('Resposta de verificação vazia, assumindo não inscrito');
          setIsSubscribed(false);
          return;
        }
        
        // Tenta parsear o JSON da resposta
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('Resposta do servidor:', data);
        } catch (error) {
          console.error('Erro ao parsear resposta JSON:', error, 'Texto recebido:', responseText);
          throw new Error(`Erro ao processar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
        
        // Adicionar mais logs para debug
        console.log('Detalhes da resposta:', {
          hasSubscriptionStatus: data.hasSubscriptionStatus,
          isSubscribed: data.isSubscribed,
          message: data.message,
          statusField: data.statusField,
          statusValue: data.statusValue
        });
        
        // Se a resposta indica que o usuário tem o status de inscrição confirmado
        // Usamos comparação estrita (===) para evitar problemas de tipo
        if (data.hasSubscriptionStatus === true) {
          // Armazenamos no cache local para evitar futuras requisições
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_${user.email}`, 'confirmed');
          console.log('CONFIRMADO: Status confirmado armazenado no cache local');
          setIsSubscribed(true);
        } else if (data.isSubscribed === true) {
          // Usuário está inscrito mas não tem o status confirmado
          // Armazenamos no cache local de qualquer forma, já que o usuário está inscrito
          localStorage.setItem(`${LOCAL_STORAGE_KEY}_${user.email}`, 'confirmed');
          console.log('INSCRITO SEM STATUS: Usuário inscrito, considerando como inscrito');
          setIsSubscribed(true); // <-- MUDAMOS DE false PARA true
        } else {
          // Usuário não está inscrito
          console.log('NÃO INSCRITO: Usuário não inscrito');
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error("Erro ao verificar status de inscrição:", error);
        // Em caso de erro, assumimos que não está inscrito para mostrar o banner
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  // Determina o estado de carregamento geral
  const isLoading = isCartasLoading || isLettersLoading;
  
  // Determina se há algum erro
  const error = cartasError || lettersError;

  // Função para renderizar as cartas
  const renderCartas = () => {
    // Preferência para cartas do Supabase
    if (cartasSupabase.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cartasSupabase.map((carta) => (
            <LetterCard key={carta.id_sumary_carta} letter={carta} />
          ))}
        </div>
      );
    }
    
    // Fallback para cartas da API
    if (letters && letters.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {letters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} />
          ))}
        </div>
      );
    }
    
    // Sem cartas
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhuma carta disponível no momento.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-heading">
            Bem-vindo, {user?.user_metadata?.name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-600">Aqui você encontra todas as cartas do Chamado à Edificação.</p>
        </div>
        
        {/* Banner de inscrição - exibe apenas se o usuário não está inscrito e não está carregando */}
        {!checkingSubscription && isSubscribed === false && user?.email && (
          <SubscriptionBanner 
            email={user.email} 
            onSubscriptionComplete={() => setIsSubscribed(true)} 
          />
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Erro ao carregar as cartas. Por favor, tente novamente.</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        ) : (
          renderCartas()
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;
