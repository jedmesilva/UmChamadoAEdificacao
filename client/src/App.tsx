import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import LandingPage from "@/pages/landing-page";
import LetterPage from "@/pages/letter-page";
import { ProtectedRoute } from "./lib/protected-route";
import { SupabaseAuthProvider } from "./hooks/use-supabase-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/dashboard" component={HomePage} />
      <ProtectedRoute path="/letter/:id" component={LetterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthProvider>
        <Router />
        <Toaster />
      </SupabaseAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
