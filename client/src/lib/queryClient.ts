import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Verifica se estamos em ambiente de produção (Vercel)
export const isProduction = process.env.NODE_ENV === "production" || 
                         import.meta.env.PROD || 
                         window.location.hostname.includes("replit.app") ||
                         window.location.hostname.includes("vercel.app");

console.log("Ambiente de execução:", isProduction ? "produção" : "desenvolvimento");

// Helper para normalizar URLs da API com base no ambiente
export function normalizeApiUrl(url: string): string {
  if (isProduction) {
    // Em produção, não precisamos modificar as URLs
    // Elas já devem estar mapeadas corretamente via vercel.json
    console.log(`Ambiente de produção: mantendo URL original: ${url}`);
    return url;
  }
  
  // Fix para garantir que todas as chamadas de API vão para o servidor Node.js e não para o Vite
  // Se a URL começa com /api, garantimos que não seja interceptada pelo Vite
  if (url.startsWith('/api')) {
    const apiUrl = `/api${url.substring(4)}`;
    console.log(`Normalizando URL da API: ${url} -> ${apiUrl}`);
    return apiUrl;
  }
  
  console.log(`Mantendo URL original: ${url}`);
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  // Normaliza a URL com base no ambiente
  const normalizedUrl = normalizeApiUrl(url);
  
  console.log(`Fazendo requisição ${method} para: ${normalizedUrl}`);
  
  const res = await fetch(normalizedUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Normaliza a URL da query com base no ambiente
    const url = normalizeApiUrl(queryKey[0] as string);
    console.log(`Executando query para: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
