
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import { signatureService } from "@/lib/signature-service";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Scroll, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import CancelSubscriptionDialog from "@/components/subscription/cancel-subscription-dialog";

interface CheckoutPageProps {
  params: {
    type: string;
  };
}

// Verificar se temos VITE_STRIPE_PUBLIC_KEY definido
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('VITE_STRIPE_PUBLIC_KEY não está configurado. O checkout não funcionará corretamente.');
}

// Carregar o Stripe fora do componente
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string)
  : null;

// Componente para o formulário de pagamento do Stripe Elements
const CheckoutForm = ({ 
  userId,
  planType,
  isProcessing, 
  setIsProcessing, 
  onSuccess 
}: { 
  userId: string;
  planType: "email" | "physical";
  isProcessing: boolean; 
  setIsProcessing: (value: boolean) => void;
  onSuccess: () => void;
}) => {
  const [cardElement, setCardElement] = useState<any>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState<boolean>(false);
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  // Carregar o elemento de cartão do Stripe
  useEffect(() => {
    if (elements) {
      const cardEl = elements.create('card', {
        style: {
          base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
              color: '#aab7c4'
            }
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
          }
        }
      });
      
      cardEl.mount('#card-element');
      cardEl.on('change', (event: any) => {
        setCardError(event.error ? event.error.message : '');
        setCardComplete(event.complete);
      });
      
      setCardElement(cardEl);
      
      return () => {
        cardEl.unmount();
      };
    }
  }, [elements]);

  // Função para processar o pagamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !cardComplete || !userId) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log("Iniciando processo de assinatura para:", userId, "tipo:", planType);
      
      // 1. Primeiro criar o cliente e a assinatura no backend
      const createSubscriptionResponse = await apiRequest("POST", "/api/stripe/create-subscription", {
        userId: userId,
        type: planType
      });
      
      if (!createSubscriptionResponse.ok) {
        const errorData = await createSubscriptionResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          errorData.message || 
          `Erro ao criar assinatura: ${createSubscriptionResponse.status}`
        );
      }
      
      const subscriptionData = await createSubscriptionResponse.json();
      console.log("Assinatura criada:", subscriptionData);
      
      if (!subscriptionData.success || !subscriptionData.clientSecret) {
        throw new Error("Falha ao obter secret do pagamento");
      }
      
      // 2. Usar o clientSecret para confirmar o pagamento
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        subscriptionData.clientSecret,
        {
          payment_method: {
            card: elements.getElement('card')!,
            billing_details: {
              name: 'Nome do Cliente', // Idealmente, obtenha do formulário ou do usuário logado
            },
          },
        }
      );
      
      if (error) {
        throw new Error(error.message || "Falha ao processar pagamento");
      }
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Pagamento realizado com sucesso!",
          description: "Sua assinatura foi ativada.",
        });
        onSuccess();
      } else {
        throw new Error("O pagamento não foi concluído com sucesso");
      }
    } catch (error: any) {
      console.error("Erro no checkout:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border rounded-md p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Informações do Cartão
        </label>
        <div id="card-element" className="p-3 border rounded-md bg-white" />
        {cardError && <div className="text-red-500 text-sm mt-2">{cardError}</div>}
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !elements || !cardComplete || isProcessing}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? "Processando..." : "Finalizar assinatura"}
      </Button>
      
      <div className="text-xs text-gray-500 text-center">
        Pagamentos seguros processados pela Stripe. Seus dados do cartão não são armazenados em nossos servidores.
      </div>
    </form>
  );
};

const CheckoutPage = ({ params }: CheckoutPageProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const { user } = useSupabaseAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  
  const isEmailSubscription = params.type === "email";
  const title = isEmailSubscription ? "Assinatura Digital" : "Assinatura Física";
  const icon = isEmailSubscription ? <Mail className="h-6 w-6 mr-2" /> : <Scroll className="h-6 w-6 mr-2" />;
  const price = isEmailSubscription ? "R$ 9,90/mês" : "R$ 29,90/mês";
  const benefits = isEmailSubscription ? [
    "Receba as cartas instantaneamente",
    "Acesso ao arquivo completo",
    "Notificações por email"
  ] : [
    "Cartas impressas em pergaminho especial",
    "Entrega em todo Brasil",
    "Embalagem personalizada",
    "Acesso ao arquivo digital"
  ];

  useEffect(() => {
    if (user?.id) {
      checkExistingSubscription();
    }
  }, [user?.id]);

  // Verificar se o usuário já possui uma assinatura
  const checkExistingSubscription = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Buscar assinaturas do usuário
      const response = await apiRequest("GET", `/api/subscriptions/user/${user.id}?type=${isEmailSubscription ? "email" : "physical"}`);
      const data = await response.json();
      
      if (data && data.subscription && data.subscription.status === "active") {
        // Se já possuir uma assinatura ativa deste tipo
        setUserSubscription(data.subscription);
        setIsManageMode(true);
      } else {
        // Caso contrário, verificar login e permitir checkout
        verifyUserLoggedIn();
      }
    } catch (error) {
      // Se ocorrer erro na busca (provavelmente não tem assinatura), verificar login
      verifyUserLoggedIn();
    } finally {
      setIsLoading(false);
    }
  };

  // Verificação simplificada apenas para garantir login
  const verifyUserLoggedIn = () => {
    if (!user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
      toast({
        title: "Configuração incompleta",
        description: "A integração com o serviço de pagamento está incompleta. Contate o administrador.",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleSubscribeSuccess = () => {
    setLocation("/account?tab=subscriptions");
  };

  const handleManageSuccess = () => {
    // Recarregar a página após gerenciar assinatura
    setLocation("/account?tab=subscriptions");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/account?tab=subscriptions")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center mb-2">
              {icon}
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>
              {isManageMode 
                ? "Gerencie sua assinatura atual" 
                : "Complete sua assinatura para começar a receber as cartas"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              <div className="text-2xl font-bold text-center">
                {price}
              </div>
              
              <div className="space-y-2 mb-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : isManageMode && userSubscription ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-green-800 mb-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      <div>
                        <p className="font-medium">Assinatura Ativa</p>
                        <p className="text-sm">Você já possui uma assinatura ativa deste serviço.</p>
                      </div>
                    </div>
                  </div>

                  <CancelSubscriptionDialog
                    subscriptionId={userSubscription.id}
                    stripeSubscriptionId={userSubscription.stripeSubscriptionId}
                    type={isEmailSubscription ? "email" : "physical"}
                    onSuccess={handleManageSuccess}
                  />
                </div>
              ) : (
                <Elements stripe={stripePromise}>
                  <CheckoutForm 
                    userId={user?.id}
                    planType={isEmailSubscription ? "email" : "physical"}
                    isProcessing={isProcessing} 
                    setIsProcessing={setIsProcessing}
                    onSuccess={handleSubscribeSuccess}
                  />
                </Elements>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
