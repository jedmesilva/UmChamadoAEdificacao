const fs = require('fs');
const path = require('path');

// Caminho para o arquivo routes.ts
const routesPath = path.join(process.cwd(), 'server', 'routes.ts');

// Ler o conteúdo do arquivo
let content = fs.readFileSync(routesPath, 'utf8');

// Padrão para encontrar blocos de tratamento de erro do Stripe
const errorPattern = /} catch \(error: any\) {\s+console\.error\("[^"]+", error\);\s+res\.status\(500\)\.json\({\s+success: false,\s+error: "[^"]+",\s+message: error\.message\s+}\);\s+}/g;

// Novo tratamento de erro usando o formatStripeError
const newErrorHandling = `} catch (error: any) {
      console.error("Erro na operação do Stripe:", error);
      const { errorMessage, isStripeSpecificError } = formatStripeError(error);
      
      res.status(500).json({ 
        success: false, 
        error: isStripeSpecificError ? error.message : "Falha na operação", 
        message: errorMessage
      });
    }`;

// Substituir todos os padrões encontrados
const updatedContent = content.replace(errorPattern, newErrorHandling);

// Escrever o conteúdo atualizado de volta para o arquivo
fs.writeFileSync(routesPath, updatedContent, 'utf8');

console.log('Tratamento de erros atualizado com sucesso em server/routes.ts');
