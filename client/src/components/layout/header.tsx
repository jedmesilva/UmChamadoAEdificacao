import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  hideAuthButton?: boolean;
}

const Header = ({ hideAuthButton = false }: HeaderProps) => {
  const { user, signOut, isLoading } = useSupabaseAuth();
  const [location, setLocation] = useLocation();
  
  const handleLogout = async () => {
    await signOut();
    setLocation("/");
  };

  const isLandingPage = location === "/";
  
  return (
    <header className="py-4 px-6 flex justify-between items-center border-b border-gray-200">
      <div className="text-xl font-bold tracking-tight font-heading">
        <Link href={user ? "/dashboard" : "/"}>
          UM CHAMADO À EDIFICAÇÃO
        </Link>
      </div>
      
      {!hideAuthButton && (
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {!location.includes("/dashboard") && (
                <Button
                  variant="ghost"
                  className="text-sm hover:text-gray-600"
                  onClick={() => setLocation("/dashboard")}
                >
                  Dashboard
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-sm hover:text-gray-600"
                onClick={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? "Saindo..." : "Sair"}
              </Button>
            </>
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
