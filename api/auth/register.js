// API de registro de usuários para Vercel Serverless
// Suporte tanto para ESM quanto CommonJS

// Importações ESM (com fallback para CommonJS)
let createClient, uuidv4;
try {
  // Tentativa de importação ESM
  createClient = (await import('@supabase/supabase-js')).createClient;
  uuidv4 = (await import('uuid')).v4;
} catch (err) {
  try {
    // Fallback para CommonJS
    createClient = require('@supabase/supabase-js').createClient;
    uuidv4 = require('uuid').v4;
  } catch (commonjsErr) {
    console.error('Erro ao importar módulos:', err, commonjsErr);
    // Stubs para não quebrar a aplicação
    createClient = (url, key) => ({
      auth: { admin: { createUser: () => ({ error: { message: 'Falha ao carregar supabase-js' } }) } },
      from: () => ({ select: () => ({ error: { message: 'Falha ao carregar supabase-js' } }) })
    });
    uuidv4 = () => 'fallback-uuid';
  }
}

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Respondendo a preflight request com 200 OK');
    return res.status(200).end();
  }

  // Apenas o método POST é permitido para esta rota
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Método não permitido', 
      method: req.method,
      allowedMethods: ['POST']
    });
  }

  // Garantindo que req.body esteja corretamente parseado se for JSON
  if (req.body && typeof req.body === 'string' && req.headers['content-type']?.includes('application/json')) {
    try {
      req.body = JSON.parse(req.body);
      console.log('Body JSON parseado com sucesso');
    } catch (error) {
      console.error('Erro ao parsear JSON do body:', error);
    }
  }

  // Configurar cliente Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Usar a chave de serviço em vez da chave anônima para operações de API backend
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Escolha a chave apropriada (preferencialmente a chave de serviço)
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;

  console.log(`Configurando Supabase com URL: ${supabaseUrl ? 'disponível' : 'não disponível'}, 
            ROLE KEY: ${supabaseServiceKey ? 'disponível' : 'não disponível'},
            ANON KEY: ${supabaseAnonKey ? 'disponível' : 'não disponível'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      error: 'Configuração do Supabase não encontrada no ambiente' 
    });
  }

  try {
    // Extrair dados de registro
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: "Email, senha e nome são obrigatórios" 
      });
    }

    console.log(`Processando registro para o email: ${email}`);
    
    // Inicializar cliente Supabase com SERVICE ROLE (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Verificar se o cliente supabase está funcionando
    console.log('Verificando acesso ao Supabase...');
    try {
      const { error: testError } = await supabase.from('account_user').select('count').limit(1);
      if (testError) {
        console.error('Erro ao acessar tabela account_user:', testError);
        if (testError.code === '42501') {
          console.error('ERRO DE PERMISSÃO: O serviço não tem permissões suficientes para acessar a tabela.');
        }
      } else {
        console.log('Conectado ao Supabase com sucesso, acesso à tabela account_user confirmado');
      }
    } catch (testCatchError) {
      console.error('Exceção ao testar conexão com o Supabase:', testCatchError);
    }
    
    // 1. Verificar se o usuário já existe
    const { data: existingUser, error: userError } = await supabase
      .auth.admin.getUserByEmail(email);
      
    if (userError && userError.code !== 'PGRST116') {
      console.error('Erro ao verificar usuário existente:', userError);
      return res.status(500).json({
        error: 'Erro ao verificar usuário existente',
        details: userError.message
      });
    }
    
    if (existingUser) {
      console.log(`Usuário já existe no Auth: ${email}`);
      return res.status(409).json({
        error: 'Este email já está registrado'
      });
    }
    
    // 2. Criar o usuário na tabela auth.users com metadados
    const { data: authUserData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma o email automaticamente
      user_metadata: {
        name: name,
      },
    });

    if (signUpError) {
      console.error('Erro ao criar usuário:', signUpError);
      return res.status(500).json({
        error: 'Erro ao criar usuário',
        details: signUpError.message
      });
    }
    
    const authUser = authUserData.user;
    
    if (!authUser) {
      return res.status(500).json({
        error: 'Falha ao criar usuário no Supabase Auth'
      });
    }

    // Não tente criar profile, apenas registre o usuário na auth.users
    // O perfil será criado em um passo separado após o login
    console.log(`Usuário registrado apenas na auth.users. O perfil será criado após o login.`);
    
    console.log(`Usuário cadastrado com sucesso: ${email}, ID: ${authUser.id}`);
    
    return res.status(201).json({
      message: "Usuário criado com sucesso",
      userId: authUser.id, 
      email: authUser.email,
      name: name, // Retorna o nome fornecido
      needsProfile: true // Flag indicando que o perfil precisa ser criado após o login
    });
    
  } catch (error) {
    console.error('Erro ao processar registro:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message || String(error)
    });
  }
}