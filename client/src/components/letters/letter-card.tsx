import { Card, CardContent } from "@/components/ui/card";
import { Letter, SupabaseCarta } from "@shared/schema";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LetterCardProps {
  letter: Letter | SupabaseCarta;
}

const LetterCard = ({ letter }: LetterCardProps) => {
  const [, setLocation] = useLocation();

  const formatDate = (dateString: Date | string) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "d 'de' MMMM, yyyy", { locale: ptBR });
  };

  // Verifica se a carta é do tipo Letter (schema local) ou SupabaseCarta
  const isSupabaseCarta = (carta: any): carta is SupabaseCarta => {
    return 'id_sumary_carta' in carta;
  };

  // Obtém os dados formatados da carta, independente da origem
  const getCartaData = () => {
    if (isSupabaseCarta(letter)) {
      // Dados da carta do Supabase
      const id = letter.id_sumary_carta;
      const number = letter.id_sumary_carta;
      
      // Usa os campos title e description diretamente da tabela
      const title = letter.title || letter.jsonbody_carta?.title || 'Sem título';
      const description = letter.description || letter.jsonbody_carta?.description || letter.jsonbody_carta?.subtitle || 'Sem descrição';
      const publishedDate = letter.date_send;
      
      return { id, number, title, description, publishedDate };
    } else {
      // Dados da carta do schema local
      return {
        id: letter.id,
        number: letter.number,
        title: letter.title,
        description: letter.description,
        publishedDate: letter.publishedAt
      };
    }
  };

  const cartaData = getCartaData();

  const handleCardClick = () => {
    setLocation(`/letter/${cartaData.id}`);
  };

  return (
    <Card className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
      <CardContent className="p-6">
        {/* Linha com número da carta e data lado a lado */}
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-gray-500">CARTA #{cartaData.number}</p>
          <span className="text-sm text-gray-500">{formatDate(cartaData.publishedDate)}</span>
        </div>
        
        {/* Título e descrição em suas próprias linhas */}
        <h2 className="text-xl font-semibold font-heading mb-3">{cartaData.title}</h2>
        <p className="text-gray-600 mb-4">{cartaData.description}</p>
        <span className="inline-block text-gray-800 font-medium hover:text-gray-600">
          Ler Carta Completa →
        </span>
      </CardContent>
    </Card>
  );
};

export default LetterCard;
