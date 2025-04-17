import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import SubscriptionForm from "@/components/subscription-form";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

const LandingPage = () => {
  const { user } = useSupabaseAuth();
  const [, setLocation] = useLocation();

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
        
        <h1 className="text-4xl md:text-5xl font-bold mb-8 font-heading tracking-tight">UM CHAMADO À EDIFICAÇÃO</h1>
        
        <div className="space-y-6 text-gray-700 mb-12 max-w-2xl">
          <p className="leading-relaxed">
            Este é um novo tempo, o tempo dos edificadores! Os céus se abriram, os portais
            dimensionais foram liberados e o espírito da edificação paira sobre o mundo, convocando
            aqueles que nasceram para este momento.
          </p>
          
          <p className="leading-relaxed">
            Um povo grandioso e forte se levantará; céus e terra estremecem diante deles, e povos e
            nações contemplam seus grandiosos feitos.
          </p>
          
          <p className="leading-relaxed">
            O espírito clama, e aqueles que ouvirem o Chamado e responderem são conclamados
            como parte desse povo.
          </p>
          
          <p className="leading-relaxed">
            Esta não é apenas uma mensagem. É um chamado para este novo tempo—um chamado
            àqueles que nasceram para edificar, para erguer novos caminhos e construir um novo
            mundo.
          </p>
          
          <p className="leading-relaxed">
            Toda semana, como uma conclamação para essa era, uma carta será enviada àqueles
            que atenderem ao Chamado.
          </p>
          
          <p className="italic leading-relaxed">Uma preparação para o tempo dos edificadores.</p>
        </div>
        
        <p className="text-xl mb-8 font-medium">Você está pronto para edificar?</p>
        
        <SubscriptionForm />
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
