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
            body: JSON.stringify(data),
          });
        };
        
        do {
          retry = false;
          attempts++;
          
          try {
            // Em produção tentamos primeiro com endpoint específico
            if (attempts === 1) {
              console.log('Usando endpoint específico subscribe');
              response = await attemptRequest('/api/subscribe');
            } else {
              // Na segunda tentativa, usamos index.js genérico como fallback
              console.log('Tentando endpoint genérico');
              response = await attemptRequest('/api?path=subscribe');
            }
            
            // Se a resposta for 405 (Method Not Allowed) e estamos em produção
            // tentamos com outro endpoint
            if (response && response.status === 405 && attempts === 1) {
              console.warn('Erro 405 detectado, tentando endpoint alternativo...');
              retry = true;
              continue;
            }
          } catch (networkError) {
            console.error('Erro de rede ao fazer requisição:', networkError);
            
            // Se houver erro de rede e estamos em produção, tentamos outro endpoint
            if (attempts === 1) {
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
          console.log('Resposta de subscrição vazia, redirecionando para registro');
          // Mostrar toast padrão
          toast({
            title: "Inscrição recebida!",
            description: "Agora complete seu cadastro para receber as cartas.",
          });
          
          // Redirecionamos para o registro com o email nos parâmetros
          setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
          return;
        }
        
        // Tenta parsear o JSON da resposta
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('Resposta do servidor:', responseData);
        } catch (error) {
          console.error('Erro ao parsear resposta JSON:', error, 'Texto recebido:', responseText);
          // Mesmo com erro no parsing, redirecionamos para o registro
          toast({
            title: "Inscrição recebida!",
            description: "Agora complete seu cadastro para receber as cartas.",
          });
          
          setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
          return;
        }
        
        // Prepara o redirecionamento com base na resposta da API
        if (responseData.redirect === "login") {
          // Usuário já existe, redireciona para login
          toast({
            title: "Usuário já cadastrado!",
            description: "Faça login para acessar as cartas.",
          });
          
          // Redirect to login with email in query params
          setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=login`);
        } else {
          // Novo usuário, redireciona para o registro
          toast({
            title: "Inscrição recebida!",
            description: "Agora complete seu cadastro para receber as cartas.",
          });
          
          // Redirect to registration with email in query params
          setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
        }
      } else {
        // Para ambiente de desenvolvimento, usamos apiRequest
        console.log("Usando apiRequest para ambiente de desenvolvimento");
        
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
        } else {
          // Novo usuário, redireciona para o registro
          toast({
            title: "Inscrição recebida!",
            description: "Agora complete seu cadastro para receber as cartas.",
          });
          
          // Redirect to registration with email in query params
          setLocation(`/auth?email=${encodeURIComponent(data.email)}&tab=register`);
        }
      }
    } catch (error) {
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      console.error("Erro na inscrição:", error);
      
      toast({
        title: "Erro na inscrição",
        description: errorMessage,
        variant: "destructive",
      });
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
