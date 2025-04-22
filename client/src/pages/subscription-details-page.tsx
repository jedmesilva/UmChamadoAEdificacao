import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { signatureService } from "@/lib/signature-service";
import type { EmailSignature, ParchmentSignature } from "../../../lib/supabase-types";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Scroll, Calendar, CheckCircle, XCircle } from "lucide-react";

interface SubscriptionDetailsPageProps {
  params: {
    type: string;
  };
}

const SubscriptionDetailsPage = ({ params }: SubscriptionDetailsPageProps) => {
  const { user } = useSupabaseAuth();
  const [_, setLocation] = useLocation();
  const [signature, setSignature] = useState<EmailSignature | ParchmentSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isEmailSubscription = params.type === "email";

  useEffect(() => {
    const loadSignature = async () => {
      if (!user) return;

      try {
        const result = isEmailSubscription
          ? await signatureService.getEmailSignature(user.id)
          : await signatureService.getParchmentSignature(user.id);

        if (result) {
          setSignature(result);
        } else {
          console.error('Nenhuma assinatura encontrada');
        }
      } catch (error) {
        console.error('Erro ao carregar assinatura:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSignature();
  }, [user, isEmailSubscription]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

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

        <Card>
          <CardHeader>
            <div className="flex items-center mb-4">
              {isEmailSubscription ? (
                <Mail className="h-6 w-6 mr-2 text-blue-600" />
              ) : (
                <Scroll className="h-6 w-6 mr-2 text-amber-600" />
              )}
              <CardTitle>
                {isEmailSubscription ? "Assinatura Digital" : "Assinatura Física"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="font-medium mr-2">Status:</span>
                {signature?.status_signature === 'active' ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Ativa
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    Inativa
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium mr-2">Data de início:</span>
                {signature?.created_at ? new Date(signature.created_at).toLocaleDateString('pt-BR') : 'N/A'}
              </div>

              {signature?.status_signature !== 'active' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
                  <p className="text-red-800 text-sm">
                    Esta assinatura está desativada. Ative-a na página da sua conta para continuar recebendo cartas.
                  </p>
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

export default SubscriptionDetailsPage;