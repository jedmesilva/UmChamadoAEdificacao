import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração para usar WebSocket com Neon
// Apenas configura se DATABASE_URL contém 'neon'
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon')) {
  neonConfig.webSocketConstructor = ws;
  console.log('Neon database configurado com WebSocket');
} else {
  console.log('Usando conexão padrão para o PostgreSQL');
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Opções para aumentar a resiliência da conexão
const poolOptions = {
  connectionString: process.env.DATABASE_URL,
  max: 10, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo máximo que uma conexão pode ficar inativa
  connectionTimeoutMillis: 5000, // timeout para tentativa de conexão
};

export const pool = new Pool(poolOptions);

// Evento para log de conexão
pool.on('connect', () => {
  console.log('Nova conexão estabelecida com o banco de dados');
});

// Evento para log de erro
pool.on('error', (err) => {
  console.error('Erro na conexão com o banco de dados:', err);
});

export const db = drizzle({ client: pool, schema });
