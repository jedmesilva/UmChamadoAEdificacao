import { useState, useEffect } from "react";
import { signatureService } from "@/lib/signature-service";
import type { EmailSignature, ParchmentSignature } from "../../../lib/supabase-types";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Mail, 
  Scroll, 
  Home, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from "lucide-react";

// Schema de validação dos dados do perfil
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  phone: z.string()
    .regex(/^[0-9]+$/, {
      message: "Digite apenas números",
    })
    .min(10, { message: "Telefone deve ter no mínimo 10 números" })
    .max(11, { message: "Telefone deve ter no máximo 11 números" })
    .optional()
    .transform(val => val ? `+55${val}` : val),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const AccountPage = () => {
  const { user, supabase } = useSupabaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadSignatures = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const [emailSig, parchmentSig] = await Promise.all([
          signatureService.getEmailSignature(user.id),
          signatureService.getParchmentSignature(user.id)
        ]);
        
        setEmailSignature(emailSig);
        setPhysicalSignature(parchmentSig);
      } catch (error) {
        console.error('Erro ao carregar assinaturas:', error);
        toast({
          title: "Erro ao carregar assinaturas",
          description: "Não foi possível carregar o status das suas assinaturas.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSignatures();
  }, [user]);
  const [_, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtém o parâmetro tab da URL
  const params = new URLSearchParams(window.location.search);
  const defaultTab = params.get('tab') || 'subscriptions';

  // Estado para controlar as assinaturas
  const [emailSignature, setEmailSignature] = useState<EmailSignature | null>(null);
  const [physicalSignature, setPhysicalSignature] = useState<ParchmentSignature | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  // Dados iniciais do formulário
  const defaultValues: Partial<ProfileFormValues> = {
    name: user?.user_metadata?.name || "",
    email: user?.email || "",
    phone: user?.user_metadata?.phone || "",
    address: user?.user_metadata?.address || "",
    city: user?.user_metadata?.city || "",
    state: user?.user_metadata?.state || "",
    zipCode: user?.user_metadata?.zipCode || "",
  };

  // Inicialização do formulário
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // Função para salvar o perfil
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      console.log('Dados do perfil a serem salvos:', data);

      // 1. Primeiro atualizar os metadados do usuário no Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        }
      });

      if (updateError) throw updateError;

      // 2. Verificar se já existe um registro em account_user para este usuário
      const { data: existingProfile } = await supabase
        .from('account_user')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingProfile) {
        // 3A. Se já existe, atualizar
        const { error: updateProfileError } = await supabase
          .from('account_user')
          .update({
            name: data.name,
            email: data.email,
            whatsapp: data.phone,
            status: 'is_complit'
          })
          .eq('user_id', user?.id);

        if (updateProfileError) {
          console.error('Erro ao atualizar perfil:', updateProfileError);
          throw updateProfileError;
        }
      } else {
        // 3B. Se não existe, criar novo perfil
        // Primeiro, tenta criar via API com SERVICE_ROLE
        try {
          const response = await fetch('/api/create-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              user_id: user?.id,
              email: data.email,
              name: data.name,
              whatsapp: data.phone || null,
              status: 'is_complit'
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao criar perfil via API:', errorText);

            // Tentativa alternativa: inserir diretamente
            const { error: insertError } = await supabase
              .from('account_user')
              .insert({
                id: user?.id,
                user_id: user?.id,
                email: data.email,
                name: data.name,
                whatsapp: data.phone,
                status: 'is_complit'
              });

            if (insertError) {
              console.error('Erro ao inserir perfil diretamente:', insertError);
              throw new Error('Não foi possível criar seu perfil. Por favor, tente novamente mais tarde.');
            }
          }

          // Verificar se existia um perfil antes
          const { data: existingProfile } = await supabase
            .from('account_user')
            .select('*')
            .eq('user_id', user?.id)
            .single();

          // Verificar se o perfil foi realmente criado
          const { data: checkProfile, error: checkError } = await supabase
            .from('account_user')
            .select('*')
            .eq('user_id', user?.id)
            .single();

          if (checkError || !checkProfile) {
            throw new Error('Erro ao verificar criação do perfil. Por favor, tente novamente.');
          }

          // Se não existia perfil antes e agora existe, redirecionar para homepage
          if (!existingProfile && checkProfile) {
            toast({
              title: "Perfil criado",
              description: "Seu perfil foi criado com sucesso.",
            });
            setLocation('/');
          } else {
            toast({
              title: "Perfil atualizado",
              description: "Seus dados foram atualizados com sucesso.",
            });
          }
        } catch (apiError) {
          console.error('Erro na chamada para criar perfil:', apiError);
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar seus dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/dashboard")}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold ml-2">Minha Conta</h1>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
          </TabsList>

          {/* Tab de Perfil */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais. Estas informações serão usadas para contato e entrega.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="seu.email@exemplo.com" 
                                {...field} 
                                disabled 
                              />
                            </FormControl>
                            <FormDescription>
                              O email não pode ser alterado
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+55</span>
                                <Input 
                                  placeholder="11999999999"
                                  className="pl-12"
                                  maxLength={11}
                                  inputMode="numeric"
                                  type="text"
                                  pattern="[0-9]*"
                                  value={field.value?.replace(/^\+55/, '') || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    field.onChange(value);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Digite no formato: +55 DDD NÚMERO (Ex: +55 11 999999999)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h3 className="text-lg font-medium">Endereço de Entrega</h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, número, complemento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Sua cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu estado" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full md:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab de Assinaturas */}
          <TabsContent value="subscriptions">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Assinatura Digital (Email) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="h-6 w-6 mr-2 text-blue-600" />
                      <CardTitle>Assinatura por Email</CardTitle>
                    </div>
                    <Button 
                      variant={emailSignature?.status_signature === 'active' ? "destructive" : "default"}
                      onClick={() => setLocation(`/checkout/email`)}
                      className="w-32"
                    >
                      {emailSignature?.status_signature === 'active' ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                  <CardDescription>
                    Receba as cartas diretamente no seu email assim que forem lançadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm mb-2">
                    <span className="font-medium mr-2">Status:</span> 
                    {emailSignature?.status_signature === 'active' ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <XCircle className="h-4 w-4 mr-1" /> Inativa
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    <span className="font-medium">Email de envio:</span> {user?.email}
                  </div>
                  <div className="text-sm text-gray-600">
                    {emailSignature?.status_signature === 'active' ? (
                      <p>Você receberá notificações quando novas cartas forem disponibilizadas.</p>
                    ) : (
                      <p>Ative esta assinatura para receber as cartas diretamente em seu email.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/subscriptions/email")}
                    className="w-full mt-2"
                  >
                    Ver histórico de cartas
                  </Button>
                </CardFooter>
              </Card>

              {/* Assinatura Física */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Scroll className="h-6 w-6 mr-2 text-amber-600" />
                      <CardTitle>Assinatura Física</CardTitle>
                    </div>
                    <Button 
                      variant={physicalSignature?.status_signature === 'active' ? "destructive" : "default"}
                      onClick={() => setLocation(`/checkout/physical`)}
                      className="w-32"
                    >
                      {physicalSignature?.status_signature === 'active' ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                  <CardDescription>
                    Receba pergaminhos especiais impressos entregues em sua casa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm mb-2">
                    <span className="font-medium mr-2">Status:</span> 
                    {physicalSignature?.status_signature === 'active' ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <XCircle className="h-4 w-4 mr-1" /> Inativa
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <div className="flex items-start mb-1">
                      <Home className="h-4 w-4 mr-1 mt-0.5 text-gray-500" />
                      <span>
                        {form.watch("address") || "Nenhum endereço cadastrado"}
                        {form.watch("address") && (
                          <>
                            <br />
                            {form.watch("city")}, {form.watch("state")} - {form.watch("zipCode")}
                          </>
                        )}
                      </span>
                    </div>
                    {!form.watch("address") && (
                      <div className="flex items-center text-amber-600 mt-1">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Atualize seu endereço na aba de Perfil</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/subscriptions/physical")}
                    className="w-full mt-2"
                  >
                    Ver histórico de entregas
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;