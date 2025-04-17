// API para verificar o status da conexão com o Supabase
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
      from: () => ({ 
        select: () => ({ data: { count: 0 }, error: null })
      })
    });
  }
}

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }
  
  // Verificar se temos as variáveis de ambiente do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Usar preferencialmente a service key
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      status: 'error',
      message: 'Variáveis de ambiente do Supabase não encontradas',
      details: {
        SUPABASE_URL: supabaseUrl ? 'configurado' : 'não configurado',
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'configurado' : 'não configurado',
        SUPABASE_ANON_KEY: supabaseAnonKey ? 'configurado' : 'não configurado',
      }
    });
  }
  
  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Testar a conexão com uma consulta simples
    const start = Date.now();
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscription_um_chamado')
      .select('count', { count: 'exact' })
      .limit(1);
      
    const end = Date.now();
    const responseTime = end - start;
    
    if (subscriptionError) {
      console.error('Erro ao verificar subscription_um_chamado:', subscriptionError);
    }
    
    // Testes adicionais para outras tabelas
    const { data: usersData, error: usersError } = await supabase
      .from('account_user')
      .select('count', { count: 'exact' })
      .limit(1);
      
    if (usersError) {
      console.error('Erro ao verificar account_user:', usersError);
    }
    
    // Verificar tabelas e permissões
    const tables = ['subscription_um_chamado', 'account_user', 'cartas_um_chamado_a_edificacao', 'status_carta'];
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count', { count: 'exact' })
          .limit(1);
          
        tableStatus[table] = {
          accessible: !error,
          count: data?.count || 0,
          error: error ? error.message : null
        };
      } catch (err) {
        tableStatus[table] = {
          accessible: false,
          count: 0,
          error: err.message || String(err)
        };
      }
    }
    
    // Verificar as permissões RLS
    let rlsBypass = true;
    try {
      // Tentativa de fazer uma operação que exigiria SERVICE ROLE
      const { error: adminError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (adminError) {
        rlsBypass = false;
        console.warn('Serviço não tem permissões de RLS bypass:', adminError);
      }
    } catch (rlsError) {
      rlsBypass = false;
      console.warn('Erro ao verificar permissões de administrador:', rlsError);
    }
    
    // Se houver algum erro crítico, lançar exceção
    if (subscriptionError && usersError) {
      throw new Error(`Múltiplos erros de conexão: ${subscriptionError.message}, ${usersError.message}`);
    }
    
    // Responder com informações de status
    return res.status(200).json({
      status: 'online',
      message: 'Verificação de Supabase concluída',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'não definido',
        runtime: typeof window === 'undefined' ? 'node' : 'browser',
        vercel: !!process.env.VERCEL || false
      },
      connection: {
        url: supabaseUrl ? 'configurado' : 'não configurado',
        anon_key: supabaseAnonKey ? 'configurado' : 'não configurado',
        service_key: supabaseServiceKey ? 'configurado' : 'não configurado',
        rls_bypass: rlsBypass
      },
      tables: tableStatus,
      counts: {
        subscriptions: subscriptionData?.count || 0,
        users: usersData?.count || 0
      }
    });
    
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao conectar com Supabase',
      details: error.message || String(error),
      timestamp: new Date().toISOString()
    });
  }
}