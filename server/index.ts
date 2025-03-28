// Carrega variáveis de ambiente no início do arquivo
import dotenv from 'dotenv';
import { StorageType } from './storage';
dotenv.config();

// Usa armazenamento Supabase conforme configurado
process.env.STORAGE_TYPE = StorageType.SUPABASE;

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from 'http';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Variável para armazenar o servidor HTTP
let server: Server;

// Função de inicialização assíncrona
async function initializeServer() {
  try {
    // Configura as rotas e retorna o servidor HTTP
    server = await registerRoutes(app);

    // Middleware de erro
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(err);
    });

    // Configura o Vite para desenvolvimento ou serve arquivos estáticos para produção
    const isVercel = process.env.VERCEL === '1';
    // Forçamos o modo de desenvolvimento se NODE_ENV não estiver definido
    const env = process.env.NODE_ENV || "development";
    console.log(`Ambiente atual: ${env}, isVercel: ${isVercel}`);
    
    if (env === "development" && !isVercel) {
      console.log("Iniciando em modo de desenvolvimento com Vite");
      await setupVite(app, server);
    } else {
      console.log("Iniciando em modo de produção com arquivos estáticos");
      serveStatic(app);
    }

    // Se não estiver no ambiente da Vercel, inicia o servidor
    if (!isVercel) {
      const port = process.env.PORT || 5000;
      server.listen({
        port,
        host: "0.0.0.0",
        reusePort: true,
      }, () => {
        log(`serving on port ${port}`);
      });
    }
    
    return { app, server };
  } catch (error) {
    console.error('Erro ao inicializar o servidor:', error);
    throw error;
  }
}

// Executa a inicialização
const serverPromise = initializeServer();

// Exporta para uso no ambiente da Vercel
export { app, serverPromise, server };

// Se este arquivo for o ponto de entrada principal, inicia o servidor
// No ESM, não podemos usar require.main === module, então usamos uma alternativa
// para verificar se o arquivo está sendo executado diretamente
if (import.meta.url === (import.meta as any).mainModule?.url) {
  initializeServer();
}
