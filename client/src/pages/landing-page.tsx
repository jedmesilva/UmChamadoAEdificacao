import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

const LandingPage = () => {
  const { user } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12 text-center max-w-3xl mx-auto">
        <p className="text-sm uppercase tracking-wider text-gray-600 mb-3">Carta Semanal</p>

        <h1 className="text-4xl md:text-5xl font-bold mb-8 font-heading tracking-tight">CHAMADO À EDIFICAÇÃO</h1>

        <div className="space-y-6 text-gray-700 mb-12 max-w-2xl">
          <p className="leading-relaxed">
            Este é um novo tempo — o tempo dos edificadores!
            Os céus se abriram, os portais dimensionais foram liberados e o espírito da edificação paira sobre o mundo, convocando aqueles que nasceram para este momento.
          </p>

          <p className="leading-relaxed">
            Um povo grandioso e forte se levantará.
            Céus e terra estremecerão diante deles, e nações inteiras contemplarão seus feitos gloriosos.
          </p>

          <p className="leading-relaxed">
            O espírito clama. E aqueles que ouvirem o Chamado e responderem, se levantarão como parte desse povo.
          </p>

          <p className="leading-relaxed">
            Esta não é apenas uma mensagem.
            É um Chamado para este novo tempo — um Chamado àqueles que nasceram para edificar, para abrir novos caminhos e construir uma nova realidade sobre a terra.
          </p>

          <p className="leading-relaxed">
            Toda semana, como uma conclamação para essa era, uma carta será enviada àqueles que atenderem ao Chamado.
          </p>

          <p className="italic leading-relaxed">Uma preparação para o tempo dos edificadores.</p>
        </div>

        <p className="text-xl mb-2 font-medium">A Nova Era começa com uma resposta...</p>
        <p className="text-xl mb-8 font-medium">Você está pronto para edificar?</p>

        <form onSubmit={async (e) => {
          e.preventDefault();
          
          if (isSubmitting) return; // Previne envios múltiplos
          
          const form = e.target as HTMLFormElement;
          const email = (form.elements.namedItem('email') as HTMLInputElement).value;
          
          // Atualiza estado para indicar que o formulário está sendo enviado
          setIsSubmitting(true);
          
          // Mostrar toast de processamento
          toast({
            title: "Processando...",
            description: "Estamos processando sua inscrição"
          });
          
          try {
            console.log('Enviando inscrição para /api/subscribe:', email);
            
            // Primeira tentativa usando a API Express local ou Vercel
            const response = await fetch('/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            
            if (!response.ok && response.status !== 200) {
              console.warn(`Resposta com status ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Resposta da API:', data);
            
            if (data.success) {
              // Mostrar mensagem adequada de acordo com o status
              if (data.alreadyRegistered) {
                // Usuário já cadastrado (tem conta completa)
                toast({
                  title: "Usuário Encontrado",
                  description: data.message || "Você já tem uma conta. Faça login para continuar."
                });
              } else if (data.alreadySubscribed) {
                // Apenas inscrito, precisa completar cadastro
                toast({
                  title: "Inscrição Encontrada",
                  description: data.message || "Seu email já está inscrito. Complete seu cadastro para continuar."
                });
              } else {
                // Nova inscrição
                toast({
                  title: "Sucesso!",
                  description: data.message || "Inscrição realizada com sucesso!"
                });
              }

              // Redireciona se necessário
              if (data.redirect) {
                const searchParams = new URLSearchParams({
                  email: data.redirect.email || email,
                  tab: data.redirect.tab || 'register'
                });
                setLocation(`${data.redirect.path}?${searchParams.toString()}`);
              }
            } else {
              toast({
                title: "Erro",
                description: data.message || "Ocorreu um erro ao processar sua inscrição",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Erro na primeira tentativa:', error);
            
            try {
              // Segunda tentativa usando rota alternativa da Vercel
              // Na Vercel, o caminho pode ser diferente do desenvolvimento local
              const vercelPath = window.location.hostname.includes('vercel') || 
                                window.location.hostname.includes('replit.app') ? 
                                '/api/subscribe' : '/_/api/subscribe';
              
              console.log(`Tentando rota alternativa: ${vercelPath}`);
              
              const fallbackResponse = await fetch(vercelPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              });
              
              const fallbackData = await fallbackResponse.json();
              
              if (fallbackData.success) {
                // Também tratar os diferentes casos na resposta de fallback
                if (fallbackData.alreadyRegistered) {
                  toast({
                    title: "Usuário Encontrado",
                    description: fallbackData.message || "Você já tem uma conta. Faça login para continuar."
                  });
                } else if (fallbackData.alreadySubscribed) {
                  toast({
                    title: "Inscrição Encontrada",
                    description: fallbackData.message || "Seu email já está inscrito. Complete seu cadastro para continuar."
                  });
                } else {
                  toast({
                    title: "Sucesso!",
                    description: fallbackData.message || "Inscrição realizada com sucesso!"
                  });
                }
                
                if (fallbackData.redirect) {
                  const searchParams = new URLSearchParams({
                    email: fallbackData.redirect.email || email,
                    tab: fallbackData.redirect.tab || 'register'
                  });
                  setLocation(`${fallbackData.redirect.path}?${searchParams.toString()}`);
                }
              } else {
                throw new Error(fallbackData.message || "Falha na segunda tentativa");
              }
            } catch (fallbackError) {
              console.error('Erro na segunda tentativa:', fallbackError);
              
              toast({
                title: "Erro",
                description: "Erro ao processar sua inscrição. Por favor, tente novamente mais tarde.",
                variant: "destructive"
              });
            }
          } finally {
            // Sempre reseta o estado de submissão
            setIsSubmitting(false);
          }
        }} className="w-full max-w-md mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="email"
              name="email"
              placeholder="Digite seu email"
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full md:w-auto px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Processando...' : 'Receber o chamado'}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;