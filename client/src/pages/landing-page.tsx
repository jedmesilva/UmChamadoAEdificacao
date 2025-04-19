import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
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

        <p className="text-xl mb-2 font-medium">A Nova Era começa com uma resposta.</p>
        <p className="text-xl mb-8 font-medium">Você está pronto para edificar?</p>

        <form onSubmit={(e) => {
          e.preventDefault();
          // TODO: Implementar lógica de inscrição
        }} className="w-full max-w-md mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="email"
              placeholder="Digite seu email"
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
            <button
              type="submit"
              className="w-full md:w-auto px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap"
            >
              Receber o chamado
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;