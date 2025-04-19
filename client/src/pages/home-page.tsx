import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LetterCard from "@/components/letters/letter-card";
import { SupabaseCarta } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { cartaService } from "@/lib/carta-service";

const HomePage = () => {
  const { user } = useSupabaseAuth();

  // Usamos o React Query para gerenciar o estado de carregamento, dados e erros
  const { 
    data: cartas, 
    isLoading, 
    error 
  } = useQuery<SupabaseCarta[]>({
    queryKey: ["cartas"],
    queryFn: async () => {
      return await cartaService.getAllCartas();
    },
  });

  // Função para renderizar as cartas
  const renderCartas = () => {
    if (!cartas || cartas.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma carta disponível no momento.</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cartas.map((carta) => (
          <LetterCard key={carta.id_sumary_carta} letter={carta} />
        ))}
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

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Receba as cartas no seu email!</h2>
              <p className="text-gray-600">Inscreva-se para receber as novas cartas diretamente na sua caixa de entrada.</p>
            </div>
            <button className="bg-gray-900 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors font-medium">
              Receber cartas no email!
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Erro ao carregar as cartas. Por favor, tente novamente.</p>
            <p className="text-sm text-gray-500 mt-2">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
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