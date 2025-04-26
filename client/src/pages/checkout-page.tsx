
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

interface CheckoutPageProps {
  params: {
    type: string;
  };
}

// Carregar o Stripe fora do componente
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

// Componente para o formulário de pagamento
const CheckoutForm = ({ 
  isProcessing, 
  setIsProcessing, 
  onSuccess 
}: { 
  isProcessing: boolean; 
  setIsProcessing: (value: boolean) => void;
  onSuccess: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/account?tab=subscriptions&payment=success",
        },
        redirect: "if_required"
      });

      if (error) {
        toast({
          title: "Erro no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Pagamento realizado com sucesso!",
          description: "Sua assinatura foi ativada.",
        });
        onSuccess();
      }
    } catch (error: any) {
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
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !elements || isProcessing}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isProcessing ? "Processando..." : "Finalizar pagamento"}
      </Button>
    </form>
  );
};

const CheckoutPage = ({ params }: CheckoutPageProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      initializeCheckout();
    }
  }, [user?.id]);

  const initializeCheckout = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Criar assinatura no Stripe
      const response = await apiRequest("POST", "/api/stripe/create-subscription", {
        userId: user.id,
        type: isEmailSubscription ? "email" : "physical"
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Falha ao iniciar o checkout");
      }
      
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar checkout",
        description: error.message || "Ocorreu um erro ao iniciar o checkout. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribeSuccess = () => {
    setLocation("/account?tab=subscriptions");
  };

  const stripeOptions = clientSecret ? {
    clientSecret: clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#6366f1',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    },
  } : undefined;

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
              Complete sua assinatura para começar a receber as cartas
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
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm 
                    isProcessing={isProcessing} 
                    setIsProcessing={setIsProcessing}
                    onSuccess={handleSubscribeSuccess}
                  />
                </Elements>
              ) : (
                <Button 
                  className="w-full"
                  onClick={initializeCheckout}
                  disabled={isProcessing || !user?.id}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Continuar para pagamento
                </Button>
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
