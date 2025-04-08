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
    } catch (error) {
      let errorMessage = "Ocorreu um erro. Tente novamente.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
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
