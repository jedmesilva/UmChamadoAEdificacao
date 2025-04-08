import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Letter, SupabaseCarta } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartaService } from "@/lib/carta-service";
import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

interface LetterPageProps {
  params: {
    id: string;
  };
}

const LetterPage = ({ params }: LetterPageProps) => {
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { user } = useSupabaseAuth();
  const [cartaSupabase, setCartaSupabase] = useState<SupabaseCarta | null>(null);
  const [isCartaLoading, setIsCartaLoading] = useState(true);
  const [cartaError, setCartaError] = useState<Error | null>(null);

  // Query para buscar carta pela API REST (fallback)
  const { data: letter, isLoading: isLetterLoading, error: letterError } = useQuery<Letter>({
    queryKey: [`/api/letters/${id}`],
    // Desabilitamos esta query se tivermos a carta do Supabase
    enabled: cartaSupabase === null && !isCartaLoading,
  });

  // Efeito para buscar a carta diretamente do Supabase e registrar leitura automaticamente
  useEffect(() => {
    const fetchCarta = async () => {
      try {
        setIsCartaLoading(true);
        const carta = await cartaService.getCartaById(id);
        setCartaSupabase(carta);
        console.log("Carta carregada do Supabase:", carta);
        
        // Registrar leitura automaticamente se o usuário estiver autenticado
        if (user && carta) {
          try {
            await cartaService.registrarLeitura(id, user.id);
            console.log("Leitura registrada automaticamente para o usuário", user.id);
          } catch (registroError) {
            console.error("Erro ao registrar leitura da carta:", registroError);
            // Não interrompe o fluxo principal
          }
        }
      } catch (error) {
        console.error("Erro ao buscar carta do Supabase:", error);
        setCartaError(error instanceof Error ? error : new Error('Erro desconhecido'));
      } finally {
        setIsCartaLoading(false);
      }
    };

    fetchCarta();
  }, [id, user]);

  // Determina o estado de carregamento geral
  const isLoading = isCartaLoading || isLetterLoading;
  
  // Determina se há algum erro
  const error = cartaError || letterError;

  const formatDate = (dateString: Date | string) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "d 'de' MMMM, yyyy", { locale: ptBR });
  };

  const formatLetterContent = (content: string) => {
    // Divide o texto por quebras de linha duplas para parágrafos
    return content.split('\n\n').map((paragraph, index) => {
      // Substitui quebras de linha simples por espaços dentro de parágrafos para manter o fluxo de leitura
      const formattedParagraph = paragraph.replace(/\n/g, ' ').trim();
      return (
        <p key={index} className="mb-5 text-gray-800 leading-relaxed">{formattedParagraph}</p>
      );
    });
  };

  // Renderiza o conteúdo da carta da API (fallback caso o Supabase não funcione)
  const renderApiLetter = (letter: Letter) => {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span>CARTA #{letter.number}</span>
          <span>•</span>
          <span>{formatDate(letter.publishedAt)}</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 font-heading">{letter.title}</h1>
        
        <p className="text-gray-700 mb-6">
          {letter.description}
        </p>
        
        <div className="prose max-w-none text-gray-700 space-y-5">
          {formatLetterContent(letter.content)}
        </div>
      </div>
    );
  };

  // Renderiza o conteúdo da carta disponível
  const renderLetterContent = () => {
    if (cartaSupabase) {
      const title = cartaSupabase.title || cartaSupabase.jsonbody_carta?.title || 'Sem título';
      const description = cartaSupabase.description || cartaSupabase.jsonbody_carta?.description || cartaSupabase.jsonbody_carta?.subtitle || 'Sem descrição';
      const number = cartaSupabase.id_sumary_carta;
      const date = cartaSupabase.date_send;
      
      return (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span>CARTA #{number}</span>
            <span>•</span>
            <span>{formatDate(date)}</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-6 font-heading">{title}</h1>
          
          <p className="text-gray-700 mb-6">
            {description}
          </p>
          
          <div className="prose max-w-none text-gray-700 space-y-5">
            {formatLetterContent(
              cartaSupabase.jsonbody_carta?.content || 
              cartaSupabase.markdonw_carta || 
              'Sem conteúdo'
            )}
          </div>
        </div>
      );
    } else if (letter) {
      return renderApiLetter(letter);
    } else {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Carta não encontrada.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation("/dashboard")}
          >
            Voltar para o Dashboard
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow p-6 md:p-8 max-w-3xl mx-auto w-full">
        <Button
          variant="ghost"
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          onClick={() => setLocation("/dashboard")}
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para todas as cartas
        </Button>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Erro ao carregar a carta. Por favor, tente novamente.</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/dashboard")}
            >
              Voltar para o Dashboard
            </Button>
          </div>
        ) : (
          renderLetterContent()
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default LetterPage;