import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SupabaseCarta, Subscription } from "@shared/schema";
import { cartaService } from "@/lib/carta-service";
import { signatureService } from "@/lib/signature-service";
import { apiRequest } from "@/lib/queryClient";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Mail, 
  Scroll, 
  Search, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Download,
  Pause,
  Ban,
  AlertTriangle
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface SubscriptionDetailsPageProps {
  params?: {
    type?: string;
  };
}

const SubscriptionDetailsPage = ({ params }: SubscriptionDetailsPageProps) => {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [pausePeriod, setPausePeriod] = useState("1");
  const [isPausing, setIsPausing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);
  
  // Definindo um tipo padrão caso não seja fornecido
  const type = params?.type || "email";
  
  // Determinar se é assinatura de email ou física
  const isEmailSubscription = type === "email";
  const title = isEmailSubscription ? "Assinatura Digital" : "Assinatura Física";
  const icon = isEmailSubscription ? <Mail className="h-5 w-5 mr-2" /> : <Scroll className="h-5 w-5 mr-2" />;
  const color = isEmailSubscription ? "text-blue-600" : "text-amber-600";
  
  // Buscar dados da assinatura
  const { 
    data: signature,
    isLoading: isLoadingSignature 
  } = useQuery({
    queryKey: ["signature", type, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return isEmailSubscription 
        ? await signatureService.getEmailSignature(user.id)
        : await signatureService.getParchmentSignature(user.id);
    },
    enabled: !!user?.id
  });

  // Obter todas as cartas disponíveis
  const { 
    data: cartas, 
    isLoading: isLoadingCartas, 
    error 
  } = useQuery<SupabaseCarta[]>({
    queryKey: ["cartas"],
    queryFn: async () => await cartaService.getAllCartas(),
  });
  
  // Buscar status de todas as cartas para o usuário atual
  const {
    data: cartasStatus,
    isLoading: isLoadingCartasStatus
  } = useQuery({
    queryKey: ["cartas-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return cartaService.getAllCartaStatus(user.id);
    },
    enabled: !!user?.id
  });
  
  // Combinar cartas com seus status
  const userSubscription = {
    type: type,
    active: signature?.status_signature === 'active',
    startDate: signature?.created_at ? new Date(signature.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : 'Não disponível',
    letters: cartas?.map(carta => {
      // Encontrar o status correspondente a esta carta
      const statusItem = cartasStatus?.find(status => status.carta_id === carta.id);
      
      return {
        id: carta.id_sumary_carta,
        status: statusItem ? "received" : "pending", // "received" se existe um status, senão "pending"
        receivedDate: carta.date_send,
        statusEmail: statusItem?.status_email,
        statusParchment: statusItem?.status_parchment
      };
    }) || []
  };
  
  // Filtra as cartas baseado na pesquisa
  const filteredCartas = cartas?.filter(carta => 
    carta.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    carta.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Função para solicitar reenvio de uma carta
  const requestLetterAgain = (cartaId: number) => {
    toast({
      title: "Solicitação enviada",
      description: `A carta #${cartaId} será enviada novamente para você.`,
    });
  };
  
  // Buscar detalhes da assinatura Stripe
  const { 
    data: stripeSubscription,
    isLoading: isLoadingStripeSubscription,
    refetch: refetchStripeSubscription
  } = useQuery({
    queryKey: ["stripe-subscription", user?.id, type],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await apiRequest("GET", `/api/subscriptions/${user.email}`);
        const data = await response.json();
        if (data) {
          // Armazenar o ID da assinatura para usar nas operações
          setSubscriptionId(data.id);
          return data;
        }
        return null;
      } catch (error) {
        console.error("Erro ao buscar detalhes da assinatura:", error);
        return null;
      }
    },
    enabled: !!user?.id
  });
  
  // Função para pausar assinatura
  const handlePauseSubscription = async () => {
    if (!subscriptionId) return;
    
    setIsPausing(true);
    try {
      // Calcular a data de retorno com base no período selecionado
      const months = parseInt(pausePeriod);
      const resumeDate = new Date();
      resumeDate.setMonth(resumeDate.getMonth() + months);
      
      const response = await apiRequest("POST", "/api/stripe/pause-subscription", {
        subscriptionId,
        resumeDate: resumeDate.toISOString()
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Assinatura pausada",
          description: `Sua assinatura foi pausada com sucesso e será reativada em ${resumeDate.toLocaleDateString('pt-BR')}.`,
        });
        // Refetch para atualizar o estado da assinatura
        refetchStripeSubscription();
      } else {
        throw new Error(data.error || "Ocorreu um erro ao pausar sua assinatura");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao pausar assinatura",
        description: error.message || "Ocorreu um erro ao pausar sua assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsPausing(false);
    }
  };
  
  // Função para cancelar assinatura
  const handleCancelSubscription = async () => {
    if (!subscriptionId) return;
    
    setIsCanceling(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/cancel-subscription", {
        subscriptionId
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Assinatura cancelada",
          description: "Sua assinatura foi cancelada com sucesso.",
        });
        // Refetch para atualizar o estado da assinatura
        refetchStripeSubscription();
      } else {
        throw new Error(data.error || "Ocorreu um erro ao cancelar sua assinatura");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar assinatura",
        description: error.message || "Ocorreu um erro ao cancelar sua assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCanceling(false);
    }
  };

  // Renderizar status de uma carta específica
  const renderLetterStatus = (cartaId: number) => {
    // Buscar o status da carta pelo id_sumary_carta
    const status = cartasStatus?.find(status => status.carta_id === cartaId);
    
    if (!status) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
          <XCircle className="h-3 w-3" />
          <span>Não enviada</span>
        </Badge>
      );
    }
    
    // Verificar qual status exibir com base no tipo de assinatura
    const timestamp = isEmailSubscription ? status.status_email : status.status_parchment;
    
    if (timestamp) {
      const date = new Date(timestamp);
      const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Enviada em {formattedDate}</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
        <XCircle className="h-3 w-3" />
        <span>{isEmailSubscription ? 'Não recebida' : 'Não enviada'}</span>
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/account")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Conta
          </Button>
        </div>

        <div className="flex items-center mb-4">
          <div className={`mr-2 ${color}`}>{icon}</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <Badge 
            variant={userSubscription.active ? "default" : "destructive"}
            className="ml-4"
          >
            {userSubscription.active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes da Assinatura</CardTitle>
            <CardDescription>
              Informações sobre sua assinatura e histórico de cartas recebidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSignature ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Tipo de Assinatura</span>
                  <p className="flex items-center">
                    {isEmailSubscription ? "Digital (Email)" : "Física (Correios)"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Data de Início</span>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    {userSubscription.startDate}
                  </p>
                </div>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Destino</span>
                <p>
                  {isEmailSubscription 
                    ? user?.email 
                    : "Seu endereço cadastrado"
                  }
                </p>
              </div>
              
              {!userSubscription.active && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-800 text-sm">
                    Esta assinatura está desativada. Ative-a na página da sua conta para continuar recebendo cartas.
                  </p>
                </div>
              )}
              
              {/* Seção de gerenciamento da assinatura */}
              {stripeSubscription && subscriptionId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium mb-2">Gerenciar Assinatura</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Você pode pausar temporariamente ou cancelar sua assinatura a qualquer momento.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {/* Dialog para pausar assinatura */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Pausar assinatura</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sua assinatura será pausada e você não será cobrado durante o período de pausa.
                            Você poderá reativá-la a qualquer momento, ou ela será reativada automaticamente 
                            no final do período selecionado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="py-4">
                          <label className="text-sm font-medium mb-2 block">
                            Por quanto tempo deseja pausar?
                          </label>
                          <Select
                            value={pausePeriod}
                            onValueChange={setPausePeriod}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione um período" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 mês</SelectItem>
                              <SelectItem value="2">2 meses</SelectItem>
                              <SelectItem value="6">6 meses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handlePauseSubscription}
                            disabled={isPausing}
                          >
                            {isPausing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Pausando...
                              </>
                            ) : (
                              "Confirmar pausa"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    
                    {/* Dialog para cancelar assinatura */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="flex items-center"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Cancelar assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar assinatura</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja cancelar sua assinatura? Esta ação não pode ser desfeita.
                            Você perderá acesso às novas cartas e benefícios da assinatura.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        
                        <div className="py-4">
                          <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                            <p className="text-sm text-amber-800">
                              Após o cancelamento, você precisará criar uma nova assinatura para receber cartas novamente.
                            </p>
                          </div>
                        </div>
                        
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={isCanceling}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isCanceling ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Cancelando...
                              </>
                            ) : (
                              "Confirmar cancelamento"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Histórico de Cartas</h2>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar cartas..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {isLoadingCartas ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">Erro ao carregar as cartas. Por favor, tente novamente.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCartas && filteredCartas.length > 0 ? (
                filteredCartas.map(carta => (
                  <Card key={carta.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Carta #{carta.id_sumary_carta}: {carta.title}</h3>
                            {renderLetterStatus(carta.id_sumary_carta)}
                          </div>
                          <p className="text-sm text-gray-600">{carta.description}</p>
                          <div className="mt-3 text-sm text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Publicada em: {carta.date_send}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 flex flex-col justify-center items-center md:w-48">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full mb-2"
                            onClick={() => {
                              // Seguindo a lógica implementada no LetterCard
                              // Para cartas do Supabase, usamos id_sumary_carta como id para navegação
                              const cartaId = carta.id_sumary_carta;
                              console.log('Abrindo carta com ID:', cartaId);
                              setLocation(`/letter/${cartaId}`);
                            }}
                          >
                            Ver carta
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="w-full"
                            onClick={() => requestLetterAgain(carta.id_sumary_carta)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Solicitar novamente
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchQuery 
                      ? "Nenhuma carta encontrada com esse termo de busca." 
                      : "Você ainda não recebeu nenhuma carta desta assinatura."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SubscriptionDetailsPage;