import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  hideAuthButton?: boolean;
}

const Header = ({ hideAuthButton = false }: HeaderProps) => {
  const { user, signOut, isLoading } = useSupabaseAuth();
  const [location, setLocation] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      console.log("Iniciando processo de logout");
      
      // Tenta usar signOut do hook Supabase
      await signOut();
      
      // Adicionalmente, faz uma chamada para a API de logout por segurança
      await fetch('/api/logout', { 
        method: 'POST',
        credentials: 'include'
      }).catch(err => {
        console.log("API de logout não disponível, ignorando:", err);
      });
      
      console.log("Logout concluído, redirecionando...");
      window.location.href = "/"; // Usando window.location para garantir reload completo
    } catch (error) {
      console.error("Erro durante logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isLandingPage = location === "/";
  
  return (
    <header className="py-4 px-6 flex justify-between items-center border-b border-gray-200">
      <div className="text-xl font-bold tracking-tight font-heading">
        <Link href={user ? "/dashboard" : "/"}>
          CHAMADO À EDIFICAÇÃO
        </Link>
      </div>
      
      {!hideAuthButton && (
        <div className="flex items-center gap-4">
          {user ? (
            <Button
              variant="ghost"
              className="text-sm hover:text-gray-600"
              onClick={handleLogout}
              disabled={isLoading}
            >
              {isLoading ? "Saindo..." : "Sair"}
            </Button>
          ) : (
            isLandingPage && (
              <Button
                variant="ghost"
                className="text-sm hover:text-gray-600"
                onClick={() => setLocation("/auth")}
              >
                Entrar
              </Button>
            )
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
