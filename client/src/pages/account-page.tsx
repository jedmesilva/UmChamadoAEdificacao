import { useState } from "react";
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
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const AccountPage = () => {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Obtém o parâmetro tab da URL
  const params = new URLSearchParams(window.location.search);
  const defaultTab = params.get('tab') || 'subscriptions';

  // Estado para controlar as assinaturas
  const [emailSubscription, setEmailSubscription] = useState(true);
  const [physicalSubscription, setPhysicalSubscription] = useState(false);

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
    // Aqui você implementaria a lógica para salvar os dados no banco de dados
    console.log('Dados do perfil a serem salvos:', data);
    
    toast({
      title: "Perfil atualizado",
      description: "Seus dados foram atualizados com sucesso.",
    });
  };

  // Função para alternar o status da assinatura de email
  const toggleEmailSubscription = () => {
    setEmailSubscription(!emailSubscription);
    toast({
      title: !emailSubscription ? "Assinatura email ativada" : "Assinatura email desativada",
      description: !emailSubscription 
        ? "Você receberá novas cartas no seu email." 
        : "Você não receberá mais cartas no seu email.",
    });
  };

  // Função para alternar o status da assinatura física
  const togglePhysicalSubscription = () => {
    setPhysicalSubscription(!physicalSubscription);
    toast({
      title: !physicalSubscription ? "Assinatura física ativada" : "Assinatura física desativada",
      description: !physicalSubscription 
        ? "Você receberá as cartas em sua casa." 
        : "Você não receberá mais cartas físicas.",
    });
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
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
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

                    <Button type="submit" className="w-full md:w-auto">
                      Salvar alterações
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
                    <Switch
                      checked={emailSubscription}
                      onCheckedChange={toggleEmailSubscription}
                    />
                  </div>
                  <CardDescription>
                    Receba as cartas diretamente no seu email assim que forem lançadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm mb-2">
                    <span className="font-medium mr-2">Status:</span> 
                    {emailSubscription ? (
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
                    {emailSubscription ? (
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
                    <Switch
                      checked={physicalSubscription}
                      onCheckedChange={togglePhysicalSubscription}
                    />
                  </div>
                  <CardDescription>
                    Receba pergaminhos especiais impressos entregues em sua casa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm mb-2">
                    <span className="font-medium mr-2">Status:</span> 
                    {physicalSubscription ? (
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