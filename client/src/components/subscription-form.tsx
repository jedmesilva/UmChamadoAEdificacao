import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const subscribeSchema = z.object({
  email: z.string().email("Por favor, informe um email válido"),
});

type SubscribeFormValues = z.infer<typeof subscribeSchema>;

const SubscriptionForm = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: SubscribeFormValues) => {
    setIsSubmitting(true);
    try {
      // Verificar se estamos em produção ou desenvolvimento
      const isProduction = window.location.hostname.includes('.vercel.app') || 
                         window.location.hostname.includes('.replit.app');
      
      console.log(`Ambiente: ${isProduction ? 'produção' : 'desenvolvimento'}`);
      
      if (isProduction) {
        // Para ambiente de produção
        let response: Response | undefined;
        let responseSucceeded = false;
        let responseData: any = null;
        let attempts = 0;
        
        // Função para tentar fazer a requisição com diferentes endpoints
        const attemptRequest = async (endpoint: string) => {
          console.log(`Tentativa ${attempts + 1} usando endpoint: ${endpoint}`);
          return fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
        };
        
        // Tenta fazer a requisição, ignorando erros para garantir que o fluxo continue
        try {
          attempts++;
          console.log('Usando endpoint específico subscribe');
          response = await attemptRequest('/api/subscribe');
          
          if (response && response.ok) {
            try {
              const responseText = await response.text();
              if (responseText && responseText.trim() !== '') {
                responseData = JSON.parse(responseText);
                responseSucceeded = true;
              }
            } catch (parseError) {
              console.error('Erro ao processar resposta:', parseError);
              // Continua o fluxo mesmo com erro de parsing
            }
          }
        } catch (firstAttemptError) {
          console.error('Erro na primeira tentativa:', firstAttemptError);
        }
        
        // Se a primeira tentativa falhou, tenta com endpoint alternativo
        if (!responseSucceeded) {
          try {
            attempts++;
            console.log('Tentando endpoint genérico');
            response = await attemptRequest('/api?path=subscribe');
            
            if (response && response.ok) {
              try {
                const responseText = await response.text();
                if (responseText && responseText.trim() !== '') {
                  responseData = JSON.parse(responseText);
                  responseSucceeded = true;
                }
              } catch (parseError) {
                console.error('Erro ao processar resposta da segunda tentativa:', parseError);
              }
            }
          } catch (secondAttemptError) {
            console.error('Erro na segunda tentativa:', secondAttemptError);
          }
        }
        
        // Verificamos se a requisição foi bem sucedida, mas sempre continuamos com o fluxo
        if (responseSucceeded && responseData) {
          console.log('Resposta do servidor processada com sucesso:', responseData);
          
          // Prepara o redirecionamento com base na resposta da API
          if (responseData.redirect === "login") {
            // Usuário já existe, redireciona para login
            toast({
              title: "Usuário já cadastrado!",
              description: "Faça login para acessar as cartas.",
            });
            
            // Redirect to login with email in query params
            setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=login`);
            return;
          }
        }
        
        // Se chegamos aqui, significa que vamos para o fluxo de registro por padrão
        // Independente de erro ou sucesso na API
        console.log('Redirecionando para página de registro por padrão');
        toast({
          title: "Inscrição recebida!",
          description: "Agora complete seu cadastro para receber as cartas.",
        });
          
        // Redirect to registration with email in query params
        setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
      } else {
        // Para ambiente de desenvolvimento, usamos apiRequest
        console.log("Usando apiRequest para ambiente de desenvolvimento");
        
        try {
          // Registra o email no Supabase e verifica se já existe
          const response = await apiRequest<{
            message: string;
            email: string;
            redirect?: "login" | "register";
          }>("POST", "/api/subscribe", data);
          
          // Prepara o redirecionamento com base na resposta da API
          if (response.redirect === "login") {
            // Usuário já existe, redireciona para login
            toast({
              title: "Usuário já cadastrado!",
              description: "Faça login para acessar as cartas.",
            });
            
            // Redirect to login with email in query params
            setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=login`);
            return;
          }
        } catch (apiError) {
          // Mesmo em caso de erro na API, continuamos com o fluxo de registro
          console.error("Erro na chamada da API, continuando com fluxo de registro:", apiError);
        }
        
        // Por padrão, sempre redireciona para o registro
        toast({
          title: "Inscrição recebida!",
          description: "Agora complete seu cadastro para receber as cartas.",
        });
        
        // Redirect to registration with email in query params
        setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
      }
    } catch (error) {
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Erro na inscrição:", error);
      
      // Mesmo em caso de erro, tentamos continuar o fluxo para o registro
      console.log("Continuando o fluxo para registro mesmo após erro");
      toast({
        title: "Inscrição processada",
        description: "Por favor, complete seu cadastro para receber as cartas.",
      });
      
      // Redireciona para o registro
      setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Seu email"
                      className="px-4 py-3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Receber Cartas
            </Button>
          </div>
          <p className="text-sm text-gray-500">Cadastre-se agora para receber a primeira carta.</p>
        </form>
      </Form>
    </div>
  );
};

export default SubscriptionForm;
