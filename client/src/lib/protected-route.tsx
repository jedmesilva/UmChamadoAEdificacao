
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useSupabaseAuth();

  // Efeito para verificar autenticação sem redirecionamento forçado
  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = window.location.pathname;
      // Armazena a página atual para retornar depois
      sessionStorage.setItem('lastProtectedPath', currentPath);
      window.location.href = `/auth?redirect=${encodeURIComponent(currentPath)}`;
    }
  }, [user, isLoading]);

  return (
    <Route path={path}>
      {(params) => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        // Renderiza o componente se o usuário estiver autenticado
        if (user) {
          return <Component params={params} />;
        }

        // Mantém a tela de loading enquanto verifica autenticação
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        );
      }}
    </Route>
  );
}
