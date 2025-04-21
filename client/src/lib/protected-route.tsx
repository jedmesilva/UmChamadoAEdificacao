import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Loader2 } from "lucide-react";
import { Route } from "wouter";
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

        // Se não houver usuário, mantém o componente mas deixa o hook de auth
        // redirecionar de forma suave quando confirmar que não há sessão
        return <Component params={params} />;
      }}
    </Route>
  );
}