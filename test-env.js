// Teste para verificar as variáveis de ambiente
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

console.log('Valores do arquivo .env:');
console.log('STRIPE_SECRET_KEY começa com:', process.env.STRIPE_SECRET_KEY?.substring(0, 10));
console.log('VITE_STRIPE_PUBLIC_KEY começa com:', process.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 10));