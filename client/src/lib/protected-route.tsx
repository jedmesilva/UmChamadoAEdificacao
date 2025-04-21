
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useSupabaseAuth();

  return (
    <Route path={path}>
      {(params) => {
        // Enquanto estiver carregando o estado de autenticação, mostra o loader e NÃO redireciona
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        // Se o usuário não estiver autenticado, redireciona para a página de login
        // com o parâmetro de redirecionamento para voltar à mesma página após o login
        if (!user) {
          // Salvar a URL atual para redirecionamento após login
          const currentPath = window.location.pathname;
          const searchParams = window.location.search;
          const fullPath = searchParams ? `${currentPath}${searchParams}` : currentPath;
          return <Redirect to={`/auth?redirect=${encodeURIComponent(fullPath)}`} />;
        }

        // Se o usuário estiver autenticado, renderiza o componente normalmente
        // mantendo os parâmetros da URL e a posição na página
        return <Component params={params} />;
      }}
    </Route>
  );
}
