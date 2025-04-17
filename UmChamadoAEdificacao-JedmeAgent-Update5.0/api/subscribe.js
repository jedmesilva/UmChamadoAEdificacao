// Endpoint de inscrição dedicado para Vercel Serverless
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
      auth: { 
        admin: { 
          getUserByEmail: () => ({ data: null, error: null }) 
        } 
      },
      from: () => ({ 
        select: () => ({ data: null, error: null }),
        insert: () => ({ select: () => ({ data: null, error: null }) })
      })
    });
  }
}

/**
 * Handler específico para endpoint de inscrição
 * - Melhoria: Dedicado para processar apenas este fluxo, com logs detalhados
 * - Inclui melhorias de tratamento de erro e fallbacks
 */
export default async function handler(req, res) {
  console.log(`[${new Date().toISOString()}] Iniciando processamento da inscrição`);
  
  // Configuração CORS otimizada
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Responder imediatamente a OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    console.log('Respondendo a preflight request do subscribe com 200 OK');
    return res.status(200).end();
  }

  // Verificação de método
  if (req.method !== 'POST') {
    console.error(`Método inválido: ${req.method}. Apenas POST é permitido.`);
    return res.status(405).json({ 
      error: 'Método não permitido', 
      message: 'Esta rota aceita apenas o método POST' 
    });
  }

  // Parsing de body melhorado
  let body = req.body;
  
  // Verificar se precisamos fazer parse (quando chega como string)
  if (body && typeof body === 'string' && req.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.parse(body);
      console.log('Body JSON parseado com sucesso');
    } catch (error) {
      console.error('Erro ao parsear JSON do body:', error);
      return res.status(400).json({ 
        error: 'Erro ao processar dados da requisição',
        details: error.message
      });
    }
  }

  // Validação básica do payload
  const email = body?.email;
  if (!email) {
    console.error('Requisição sem email válido');
    return res.status(400).json({ 
      error: 'Dados insuficientes', 
      message: 'Email é obrigatório' 
    });
  }

  // Inicialização do Supabase com fallbacks e melhor detecção de configuração
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Escolha a chave apropriada (preferencialmente a chave de serviço)
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;

  console.log(`Configurando Supabase para inscrição com: 
    URL: ${supabaseUrl ? 'disponível' : 'não disponível'}, 
    ROLE KEY: ${supabaseServiceKey ? 'disponível' : 'não disponível'},
    ANON KEY: ${supabaseAnonKey ? 'disponível' : 'não disponível'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      error: 'Erro de configuração', 
      message: 'Não foi possível conectar ao banco de dados' 
    });
  }

  try {
    // Inicialização do cliente Supabase - com service key para operações de admin
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Cliente Supabase inicializado para: ${email}`);
    
    // Verificar se o usuário já existe no Auth
    let user = null;
    let userError = null;
    try {
      const authResult = await supabase.auth.admin.getUserByEmail(email);
      user = authResult.data;
      userError = authResult.error;
    } catch (err) {
      console.error('Erro ao verificar usuário na Auth API:', err);
      userError = err;
    }
    
    // Verificar se já existe uma inscrição
    let subscription = null;
    let subError = null;
    try {
      const subResult = await supabase
        .from('subscription_um_chamado')
        .select('*')
        .eq('email_subscription', email)
        .single();
      subscription = subResult.data;
      subError = subResult.error;
    } catch (err) {
      console.error('Erro ao verificar inscrição existente:', err);
      subError = err;
    }
    
    // Resultado para usuário já registrado
    if (user) {
      console.log(`Usuário já existe no Auth: ${email}`);
      
      // Se já existe inscrição, retorna sucesso
      if (subscription) {
        console.log(`Inscrição já existe para: ${email}`);
        return res.status(200).json({
          success: true,
          message: 'Você já está inscrito e tem uma conta ativa',
          email,
          userExists: true,
          subscriptionExists: true
        });
      }
      
      // Se não tem inscrição, criar
      console.log(`Criando inscrição para usuário existente: ${email}`);
      let createSubError = null;
      try {
        const createResult = await supabase
          .from('subscription_um_chamado')
          .insert({
            email_subscription: email,
            created_at: new Date().toISOString(),
            status_subscription: 'is_subscription_um_chamado'
          });
        createSubError = createResult.error;
      } catch (err) {
        console.error('Erro ao criar inscrição para usuário existente:', err);
        createSubError = err;
      }
      
      if (createSubError) {
        console.error('Erro ao criar inscrição:', createSubError);
        return res.status(500).json({
          success: false,
          message: 'Erro ao processar inscrição',
          details: createSubError.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Inscrição realizada com sucesso para conta existente',
        email,
        userExists: true,
        subscriptionExists: false
      });
    }
    
    // Caso não exista usuário, mas exista inscrição
    if (subscription) {
      console.log(`Inscrição já existe, mas usuário não tem conta: ${email}`);
      return res.status(200).json({
        success: true,
        message: 'Você já está inscrito, mas não tem uma conta',
        email,
        userExists: false,
        subscriptionExists: true,
        redirect: 'register'
      });
    }
    
    // Caso não exista nem usuário nem inscrição, criar nova inscrição
    console.log(`Criando nova inscrição para: ${email}`);
    let newSubscription = null;
    let createError = null;
    try {
      const createResult = await supabase
        .from('subscription_um_chamado')
        .insert({
          email_subscription: email,
          created_at: new Date().toISOString(),
          status_subscription: 'is_subscription_um_chamado'
        })
        .select()
        .single();
      newSubscription = createResult.data;
      createError = createResult.error;
    } catch (err) {
      console.error('Erro crítico ao criar inscrição:', err);
      createError = err;
    }
    
    if (createError) {
      console.error('Erro ao criar inscrição:', createError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar inscrição',
        details: createError.message
      });
    }
    
    console.log(`Inscrição criada com sucesso: ${email}`);
    return res.status(201).json({
      success: true,
      message: 'Inscrição realizada com sucesso',
      email,
      userExists: false,
      subscriptionExists: false,
      subscription: newSubscription,
      redirect: 'register'
    });
    
  } catch (error) {
    console.error('Erro crítico no processamento da inscrição:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor', 
      message: 'Não foi possível processar sua inscrição',
      details: error.message || String(error)
    });
  }
}