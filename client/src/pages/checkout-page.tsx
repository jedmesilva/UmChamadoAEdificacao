import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Scroll, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

// Componente para o formulário de checkout redirecionado para o Stripe Checkout
const CheckoutForm = ({ 
  userId,
  userEmail,
  planType,
  isProcessing, 
  setIsProcessing, 
  onSuccess 
}: { 
  userId: string;
  userEmail: string;
  planType: "email" | "physical";
  isProcessing: boolean; 
  setIsProcessing: (value: boolean) => void;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();

  // Função para processar o pagamento via Stripe Checkout (por redirecionamento)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    
    try {
      // URLs de redirecionamento
      const successUrl = window.location.origin + '/account?tab=subscriptions&payment_success=true';
      const cancelUrl = window.location.origin + '/checkout/' + planType + '?canceled=true';
      
      // Criar a sessão de checkout
      try {
        const response = await fetch(window.location.origin + '/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            userEmail,  // Enviar email do usuário para o servidor
            type: planType,
            successUrl,
            cancelUrl
          }),
        });

        if (!response.ok) {
          throw new Error(`Erro ao criar sessão de checkout: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.checkoutUrl) {
          throw new Error("Falha ao obter URL de checkout");
        }
        
        // Notificar usuário
        toast({
          title: "Redirecionando para o Stripe",
          description: "Você será levado para a página segura de pagamento.",
        });
        
        // Abordagem mais robusta para redirecionamento
        console.log("Redirecionando para URL do Stripe:", data.checkoutUrl);
        
        // Método 1: Usar window.location.assign (preferido para navegação)
        window.location.assign(data.checkoutUrl);
        
        // Método 2 (fallback): Se o redirecionamento acima falhar, tentamos criar um link e clicar nele
        setTimeout(() => {
          try {
            console.log("Tentando redirecionamento alternativo");
            const link = document.createElement('a');
            link.href = data.checkoutUrl;
            link.target = '_self';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (e) {
            console.error("Erro no redirecionamento alternativo:", e);
            // Método 3 (último recurso): window.location.href padrão
            window.location.href = data.checkoutUrl;
          }
        }, 1000); // Dar tempo para o primeiro método funcionar
        
      } catch (error: any) {
        console.error("Erro na requisição:", error);
        throw new Error(error.message);
      }
      
    } catch (error: any) {
      console.error("Erro ao iniciar checkout:", error);
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message || "Ocorreu um erro ao iniciar o processo de pagamento.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border rounded-md p-5 bg-white shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">
            Pagamento seguro via Stripe
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Clique no botão abaixo para continuar com o pagamento. Você será 
            redirecionado para o Stripe Checkout, onde poderá adicionar suas 
            informações de pagamento de maneira segura.
          </p>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isProcessing}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? "Processando..." : "Continuar para o pagamento"}
      </Button>
      
      <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
        <CreditCard className="h-3 w-3" />
        <span>Pagamentos seguros processados pela Stripe. Seus dados do cartão não são armazenados em nossos servidores.</span>
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
  const price = isEmailSubscription ? "R$ 9,99/mês" : "R$ 99,99/mês";
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
      const response = await fetch(`/api/subscriptions/user/${user.id}?type=${isEmailSubscription ? "email" : "physical"}`);
      
      if (!response.ok) {
        throw new Error("Erro ao buscar assinaturas");
      }
      
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
                <div>
                  <CheckoutForm 
                    userId={user?.id || ''}
                    userEmail={user?.email || ''}
                    planType={isEmailSubscription ? "email" : "physical"}
                    isProcessing={isProcessing} 
                    setIsProcessing={setIsProcessing}
                    onSuccess={handleSubscribeSuccess}
                  />
                </div>
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