import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionBannerProps {
  email: string;
  onSubscriptionComplete: () => void;
}

const SubscriptionBanner = ({ email, onSubscriptionComplete }: SubscriptionBannerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar se estamos em ambiente de produção (Vercel)
      const isProduction = window.location.hostname.includes('.vercel.app') || 
                         window.location.hostname.includes('.replit.app');
      
      console.log(`Ambiente: ${isProduction ? 'produção' : 'desenvolvimento'}`);
      
      let response: Response | undefined;
      let retry = false;
      let attempts = 0;
      
      // Função para tentar fazer a requisição com diferentes endpoints
      const attemptRequest = async (endpoint: string) => {
        console.log(`Tentativa ${attempts + 1} usando endpoint: ${endpoint}`);
        return fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
      };
      
      do {
        retry = false;
        attempts++;
        
        try {
          if (isProduction) {
            // Em produção tentamos primeiro com o endpoint específico dashboard-subscribe
            if (attempts === 1) {
              console.log('Usando endpoint específico dashboard-subscribe');
              response = await attemptRequest('/api/dashboard-subscribe');
            } else {
              // Na segunda tentativa, usamos o endpoint genérico subscribe
              console.log('Tentando endpoint alternativo subscribe');
              response = await attemptRequest('/api/subscribe');
            }
          } else {
            // Em desenvolvimento usamos a rota do Express backend
            console.log('Ambiente de desenvolvimento: usando endpoint do Express');
            response = await attemptRequest('/api/dashboard-subscribe');
          }
          
          // Se a resposta for 405 (Method Not Allowed) e estamos em produção
          // tentamos com outro endpoint
          if (response && response.status === 405 && isProduction && attempts === 1) {
            console.warn('Erro 405 detectado, tentando endpoint alternativo...');
            retry = true;
            continue;
          }
        } catch (networkError) {
          console.error('Erro de rede ao fazer requisição:', networkError);
          
          // Se houver erro de rede e estamos em produção, tentamos outro endpoint
          if (isProduction && attempts === 1) {
            console.warn('Erro de rede detectado, tentando endpoint alternativo...');
            retry = true;
            continue;
          }
          throw networkError;
        }
      } while (retry && attempts < 2);
      
      // Se não temos resposta, algo deu muito errado
      if (!response) {
        throw new Error('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
      }
      
      // Verificar se a resposta é válida antes de tentar parsear o JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro na resposta (${response.status}):`, errorText);
        throw new Error(`Erro ao processar inscrição (${response.status}): ${errorText || 'Sem detalhes'}`);
      }
      
      // Tratativa para resposta vazia
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        console.log('Resposta vazia, mas status OK. Considerando sucesso.');
        // Mostra toast de sucesso mesmo sem resposta JSON
        toast({
          title: "Sucesso!",
          description: "Você agora receberá as cartas por email.",
          variant: "default",
        });
        
        // Marca como bem-sucedido
        setIsSuccess(true);
        
        // Salva no cache local para evitar futuras requisições
        const LOCAL_STORAGE_KEY = 'subscription_status';
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${email}`, 'confirmed');
        console.log('Status confirmado armazenado no cache local (resposta vazia)');
        
        // Notifica o componente pai que a subscrição foi concluída
        onSubscriptionComplete();
        return;
      }
      
      // Tenta parsear o JSON da resposta
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Resposta do servidor:', data);
      } catch (error) {
        console.error('Erro ao parsear resposta JSON:', error, 'Texto recebido:', responseText);
        throw new Error(`Erro ao processar dados da inscrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      // Mostra toast de sucesso
      toast({
        title: "Sucesso!",
        description: data.message || "Você agora receberá as cartas por email.",
        variant: "default",
      });
      
      // Marca como bem-sucedido
      setIsSuccess(true);
      
      // Salva no cache local para evitar futuras requisições
      const LOCAL_STORAGE_KEY = 'subscription_status';
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${email}`, 'confirmed');
      console.log('Status confirmado armazenado no cache local');
      
      // Notifica o componente pai que a subscrição foi concluída
      onSubscriptionComplete();
      
    } catch (error) {
      console.error('Erro ao fazer subscrição:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Ocorreu um erro ao processar sua inscrição'
      );
      
      toast({
        title: "Erro na inscrição",
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao processar sua inscrição',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Alert className="mb-6 bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800">
        <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-500" />
        <AlertTitle>Inscrição confirmada!</AlertTitle>
        <AlertDescription>
          Você agora receberá as cartas diretamente no seu email.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mb-6 border-teal-100 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Receba as cartas por email</CardTitle>
        <CardDescription>
          Além de acessar as cartas aqui no portal, você pode recebê-las diretamente no seu email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground mb-2">
          Seu email de cadastro: <span className="font-medium text-foreground">{email}</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubscribe} 
          disabled={isLoading}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processando...' : 'Quero receber as cartas por email'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionBanner;