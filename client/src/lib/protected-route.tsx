
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { user, isLoading } = useSupabaseAuth();
  const [, setLocation] = useLocation();

  return (
    <Route path={path}>
      {(params) => {
        // Mostra loading apenas durante a verificação inicial
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        // Se não houver usuário, redireciona para a página de login
        if (!user) {
          // Redireciona para login com parâmetro de redirecionamento
          const redirectUrl = `/auth?redirect=${encodeURIComponent(path)}`;
          setLocation(redirectUrl);
          return null;
        }

        // Se houver usuário, renderiza o componente normalmente
        return <Component params={params} />;
      }}
    </Route>
  );
}
