// Servidor estático simples para servir nossos arquivos de teste
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

// Configuração
const PORT = 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar app Express
const app = express();

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Definir rota para o arquivo de teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-test.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\x1b[32m✓\x1b[0m Servidor de teste iniciado em http://localhost:${PORT}`);
  console.log(`\x1b[36m•\x1b[0m Acesse o teste em http://localhost:${PORT}/index-test.html`);
  console.log(`\x1b[36m•\x1b[0m Pressione Ctrl+C para interromper o servidor`);
});