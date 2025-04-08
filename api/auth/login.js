// API de login de usuários para Vercel Serverless
// Suporte tanto para ESM quanto CommonJS

// Importações ESM (com fallback para CommonJS)
let createClient;
try {
  // Tentativa de importação ESM
  createClient = (await import('@supabase/supabase-js')).createClient;
} catch (err) {
  try {
    // Fallback para CommonJS
    createClient = require('@supabase/supabase-js').createClient;
  } catch (commonjsErr) {
    console.error('Erro ao importar supabase-js:', err, commonjsErr);
    // Stub para não quebrar a aplicação
    createClient = (url, key) => ({
      auth: { signInWithPassword: () => ({ error: { message: 'Falha na inicialização do Supabase' } }) },
      from: () => ({ select: () => ({ data: null, error: { message: 'Falha na inicialização do Supabase' } }) })
    });
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
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log(`Configurando Supabase com URL: ${supabaseUrl ? 'disponível' : 'não disponível'}, 
           KEY: ${supabaseKey ? 'disponível' : 'não disponível'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      error: 'Configuração do Supabase não encontrada no ambiente' 
    });
  }

  try {
    // Extrair dados de login
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email e senha são obrigatórios" 
      });
    }

    console.log(`Processando login para o email: ${email}`);
    
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Verificar se o cliente supabase está funcionando
    console.log('Verificando acesso ao Supabase antes do login...');
    try {
      const { error: testError } = await supabase.from('account_user').select('count').limit(1);
      if (testError) {
        console.error('Erro ao acessar tabela account_user:', testError);
        if (testError.code === '42501') {
          console.error('ERRO DE PERMISSÃO: O serviço não tem permissões suficientes.');
        }
      } else {
        console.log('Acesso à tabela account_user confirmado');
      }
    } catch (testCatchError) {
      console.error('Exceção ao testar conexão com o Supabase:', testCatchError);
    }
    
    // Fazer login com email e senha
    console.log(`Tentando fazer login com email: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Erro no login:', JSON.stringify(error));
      return res.status(401).json({
        error: 'Credenciais inválidas',
        details: error.message,
        code: error.code
      });
    }
    
    console.log(`Login autenticado com sucesso para: ${email}, ID: ${data.user.id}`);

    // Buscar informações adicionais do usuário
    console.log(`Buscando informações da conta para usuário ID: ${data.user.id}`);
    try {
      const { data: accountUser, error: accountError } = await supabase
        .from('account_user')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (accountError) {
        console.error('Erro ao buscar perfil do usuário:', JSON.stringify(accountError));
        // Tentar abordagem alternativa se for erro de não encontrado
        if (accountError.code === 'PGRST116') {
          console.log('Conta não encontrada pelo user_id, tentando buscar por email...');
          
          // Verificar por email como fallback
          const { data: accountByEmail, error: emailError } = await supabase
            .from('account_user')
            .select('*')
            .eq('email', email)
            .single();
            
          if (emailError) {
            console.error('Erro ao buscar perfil por email:', JSON.stringify(emailError));
            // Alerta mas continua o login
          } else if (accountByEmail) {
            console.log(`Encontrado perfil via email: ${JSON.stringify(accountByEmail)}`);
            return res.status(200).json({
              message: "Login realizado com sucesso",
              user: accountByEmail,
              session: data.session
            });
          }
        }
      } else if (accountUser) {
        console.log(`Perfil encontrado: ${JSON.stringify(accountUser)}`);
        return res.status(200).json({
          message: "Login realizado com sucesso",
          user: accountUser,
          session: data.session
        });
      }
    } catch (profileError) {
      console.error('Exceção ao buscar perfil:', profileError);
      // Continuar mesmo com erro
    }

    // Fallback para resposta sem perfil completo
    console.log(`Login autenticado para ${email}, mas sem perfil completo encontrado`);
    
    return res.status(200).json({
      message: "Login realizado com sucesso",
      user: data.user,
      session: data.session
    });
    
  } catch (error) {
    console.error('Erro ao processar login:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message || String(error)
    });
  }
}