
import { useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Scroll, CreditCard, CheckCircle } from "lucide-react";

interface CheckoutPageProps {
  params: {
    type: string;
  };
}

const CheckoutPage = ({ params }: CheckoutPageProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleSubscribe = async () => {
    if (!user?.id) return;
    
    setIsProcessing(true);
    try {
      // Aqui implementaremos a integração com o gateway de pagamento no futuro
      // Por enquanto apenas criamos o registro da assinatura
      const result = isEmailSubscription 
        ? await signatureService.createEmailSignature(user.id)
        : await signatureService.createParchmentSignature(user.id);
        
      if (!result) throw new Error("Falha ao criar assinatura");
      
      toast({
        title: "Assinatura ativada!",
        description: "Sua assinatura foi ativada com sucesso.",
      });
      setLocation("/account?tab=subscriptions");
    } catch (error) {
      toast({
        title: "Erro ao processar assinatura",
        description: "Ocorreu um erro ao processar sua assinatura. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
              Complete sua assinatura para começar a receber as cartas
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              <div className="text-2xl font-bold text-center">
                {price}
              </div>
              
              <div className="space-y-2">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button 
              className="w-full"
              onClick={handleSubscribe}
              disabled={isProcessing}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isProcessing ? "Processando..." : "Assinar agora"}
            </Button>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
