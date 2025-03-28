import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { insertUserSchema } from "@shared/schema";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Register schema - extends the insert user schema with password confirmation
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const { user, isLoading, signIn, signUp, signOut } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [emailFromSubscription, setEmailFromSubscription] = useState<string>("");
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: emailFromSubscription,
      password: "",
      confirmPassword: "",
    },
  });

  // Check if there's an email and tab in the location search params
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const email = searchParams.get("email");
    const tab = searchParams.get("tab");
    
    console.log('URL params:', { email, tab });
    
    // Se tiver um tab especificado (login ou register), use-o
    if (tab === "login" || tab === "register") {
      console.log('Definindo tab para:', tab);
      setActiveTab(tab);
    } else if (email) {
      // Se não tiver tab mas tiver email, por padrão vai para o registro
      console.log('Email presente sem tab, definindo tab para register');
      setActiveTab("register");
    }
    
    // Se tiver email, preenche nos formulários
    if (email) {
      console.log('Preenchendo email nos formulários:', email);
      setEmailFromSubscription(email);
      
      // Use setTimeout para garantir que os forms já estão disponíveis
      setTimeout(() => {
        if (loginForm) loginForm.setValue("email", email);
        if (registerForm) registerForm.setValue("email", email);
      }, 0);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Update the email field when emailFromSubscription changes
  useEffect(() => {
    if (emailFromSubscription) {
      registerForm.setValue("email", emailFromSubscription);
    }
  }, [emailFromSubscription, registerForm]);

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      await signIn(data.email, data.password);
      setLocation("/dashboard");
    } catch (error) {
      console.error("Erro durante o login:", error);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      // Remove confirmPassword as it's not needed for signup
      const { confirmPassword, ...userData } = data;
      await signUp(userData.email, userData.password, userData.name);
      // Não precisa mais mudar para a aba de login nem resetar o formulário
      // porque o usuário já será redirecionado automaticamente após o login
    } catch (error) {
      console.error("Erro durante o registro:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header hideAuthButton />

      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold font-heading text-center">Acesse sua conta</h2>
                  <p className="text-gray-600 text-center mb-6">Entre para acessar as cartas do Chamado à Edificação.</p>

                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Seu email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  placeholder="Sua senha" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                              >
                                {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Entrar
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold font-heading text-center">Complete seu cadastro</h2>
                  <p className="text-gray-600 text-center mb-6">Finalize seu cadastro para acessar as cartas do Chamado.</p>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
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
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Seu email" 
                                {...field} 
                                readOnly={!!emailFromSubscription}
                                className={emailFromSubscription ? "bg-gray-100" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"} 
                                  placeholder="Crie uma senha" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              >
                                {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input 
                                  type={showConfirmPassword ? "text" : "password"} 
                                  placeholder="Confirme sua senha" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Finalizar Cadastro
                      </Button>
                    </form>
                  </Form>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AuthPage;
