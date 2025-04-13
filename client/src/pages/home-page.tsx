import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LetterCard from "@/components/letters/letter-card";
import { Letter, SupabaseCarta } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { cartaService } from "@/lib/carta-service";
import { useEffect, useState } from "react";

const HomePage = () => {
  const { user } = useSupabaseAuth();
  const [cartasSupabase, setCartasSupabase] = useState<SupabaseCarta[]>([]);
  const [isCartasLoading, setIsCartasLoading] = useState(true);
  const [cartasError, setCartasError] = useState<Error | null>(null);
  
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
