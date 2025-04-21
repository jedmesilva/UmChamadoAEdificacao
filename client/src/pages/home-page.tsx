import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import LetterCard from "@/components/letters/letter-card";
import { SupabaseCarta } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { cartaService } from "@/lib/carta-service";

const HomePage = () => {
  const { user, supabase } = useSupabaseAuth();
  const [_, setLocation] = useLocation();
  const [hasProfile, setHasProfile] = useState(false);

  // Verificar se o usuário tem perfil na tabela account_user
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('account_user')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      setHasProfile(!!data && !error);
    };
    
    checkUserProfile();
  }, [user, supabase]);

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
          <div 
            className="inline-flex items-center bg-gray-900/5 rounded-md px-3 py-1 mb-3 cursor-pointer hover:bg-gray-900/10 transition-colors"
            onClick={() => setLocation("/account")}
          >
            <span className="text-sm text-gray-600 whitespace-nowrap">{user?.email}</span>
            <ChevronRight className="h-4 w-4 ml-2 text-gray-400" />
          </div>
          {!hasProfile && (
            <div 
              className="bg-blue-50/50 text-blue-800 px-4 py-2 rounded-full mb-3 text-sm cursor-pointer hover:bg-blue-50 transition-colors inline-flex items-center"
              onClick={() => setLocation("/account?tab=profile")}
            >
              Complete a sua conta
              <ChevronRight className="h-4 w-4 ml-1 text-blue-600" />
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold font-heading">
            Bem-vindo, {user?.user_metadata?.name || user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-600">Aqui você encontra todas as cartas do Chamado à Edificação.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-amber-900 mb-2">Receba os pergaminhos em casa!</h2>
              <p className="text-amber-800">Assine para receber as cartas impressas em pergaminhos especiais diretamente em sua casa.</p>
            </div>
            <button className="bg-amber-700 text-white px-5 py-2 rounded-md hover:bg-amber-800 transition-colors font-medium text-sm whitespace-nowrap">
              Receber cartas em casa
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">Receba as cartas no seu email!</h2>
              <p className="text-blue-800">Inscreva-se para receber as novas cartas diretamente na sua caixa de entrada.</p>
            </div>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
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