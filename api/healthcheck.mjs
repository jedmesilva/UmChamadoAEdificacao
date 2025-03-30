
// Endpoint de healthcheck para verificar se a API está funcionando
export default function handler(req, res) {
  // Verificar ambiente e variáveis
  const nodeEnv = process.env.NODE_ENV || 'development';
  const storageType = process.env.STORAGE_TYPE || 'none';
  
  // Informações do sistema
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: nodeEnv,
    storage: storageType,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  // Verificar acesso a diretórios (será incluído em produção)
  let directories = {};
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Lista de diretórios importantes para verificar
    const dirsToCheck = [
      '.',
      './dist',
      './dist/assets',
      './client',
      './client/dist',
      './api'
    ];
    
    dirsToCheck.forEach(dir => {
      try {
        const exists = fs.existsSync(dir);
        if (exists) {
          const isDir = fs.statSync(dir).isDirectory();
          if (isDir) {
            const files = fs.readdirSync(dir).slice(0, 10); // Limitar a 10 arquivos
            directories[dir] = { exists, isDirectory: isDir, files };
          } else {
            directories[dir] = { exists, isDirectory: isDir };
          }
        } else {
          directories[dir] = { exists };
        }
      } catch (e) {
        directories[dir] = { error: e.message };
      }
    });
  } catch (e) {
    directories = { error: "Módulo fs não disponível no ambiente atual" };
  }

  // Responder com status OK e informações adicionais
  res.status(200).json({
    status: "ok",
    message: "API healthcheck successful",
    system: systemInfo,
    directories,
    headers: req.headers
  });
}
