// API específica para inscrição (/api/subscribe)
import { createClient } from '@supabase/supabase-js';

/**
 * Handler para API de inscrição no Vercel
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 */
export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se o método é POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    });
  }

  // Garantindo que req.body esteja parseado se for string
  let body = req.body;
  if (body && typeof body === 'string' && req.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error('Erro ao parsear JSON do body:', error);
      return res.status(400).json({
        success: false,
        message: 'Formato de dados inválido'
      });
    }
  }

  const { email } = body || {};

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: "Email é obrigatório" 
    });
  }

  console.log(`Processando inscrição para o email: ${email}`);

  // Verificação detalhada das variáveis de ambiente e fallbacks
  let supabaseUrl, supabaseServiceKey, supabaseAnonKey, supabaseKey;
  
  // Lógica para obter URLs e chaves com múltiplas fontes (para compatibilidade entre ambientes)
  const possibleUrls = [
    process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ];
  
  const possibleServiceKeys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ];
  
  const possibleAnonKeys = [
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ];
  
  // Usar o primeiro valor não nulo/undefined de cada lista
  supabaseUrl = possibleUrls.find(url => url);
  supabaseServiceKey = possibleServiceKeys.find(key => key);
  supabaseAnonKey = possibleAnonKeys.find(key => key);
  
  // Escolher a chave apropriada (preferencialmente a chave de serviço)
  supabaseKey = supabaseServiceKey || supabaseAnonKey;
  
  // Registre os valores encontrados (sem mostrar as chaves completas por segurança)
  const envStatus = {
    url: supabaseUrl ? 'encontrado' : 'não encontrado',
    serviceKey: supabaseServiceKey ? 'encontrado' : 'não encontrado',
    anonKey: supabaseAnonKey ? 'encontrado' : 'não encontrado',
    keyUsed: supabaseServiceKey ? 'SERVICE_ROLE' : (supabaseAnonKey ? 'ANON' : 'NENHUMA'),
    env: process.env.NODE_ENV || 'não definido'
  };
  
  console.log('Verificação de configuração Supabase:', envStatus);
  
  // Verificar se as credenciais necessárias estão disponíveis
  if (!supabaseUrl || !supabaseKey) {
    const missingItems = [];
    if (!supabaseUrl) missingItems.push('URL');
    if (!supabaseKey) missingItems.push('chave de acesso');
    
    const errorMsg = `Configuração do Supabase incompleta. Faltando: ${missingItems.join(', ')}`;
    console.error(errorMsg);
    
    return res.status(500).json({ 
      success: false,
      message: 'Erro de configuração no servidor',
      details: process.env.NODE_ENV === 'development' ? errorMsg : undefined 
    });
  }

  try {
    console.log('API /subscribe: Inicializando cliente Supabase...');
    // Registro de configuração mais detalhado
    const configDetails = {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'não-configurado',
      serviceKey: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 5)}...` : 'não-configurado',
      anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 5)}...` : 'não-configurado',
      keyUsed: supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON',
      environment: process.env.NODE_ENV || 'indefinido',
      vercel: process.env.VERCEL ? 'sim' : 'não',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      requestMethod: req.method,
      contentType: req.headers['content-type'] || 'não especificado',
      requestId: req.headers['x-request-id'] || 'não disponível',
      origin: req.headers['origin'] || 'não disponível',
      userAgent: req.headers['user-agent'] || 'não disponível'
    };
    
    console.log('API /subscribe: Detalhes da requisição:', configDetails);
    
    // Inicializar cliente Supabase com SERVICE ROLE (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Verificar em ordem:
    // 1. Se já existe um usuário cadastrado (auth.users)
    // 2. Se já existe uma inscrição (subscription_um_chamado)
    
    // Primeiro, verificamos se o usuário já existe na autenticação
    let userExists = false;
    try {
      console.log('Verificando usuário existente para:', email);
      
      // Verificar usuário na tabela auth.users (usuário completo com login)
      if (supabaseServiceKey) {
        try {
          console.log('Usando admin.getUserByEmail para verificar usuário');
          const { data: user, error: adminError } = await supabase.auth.admin.getUserByEmail(email);
          
          if (adminError) {
            console.error('Erro ao verificar usuário via admin API:', adminError);
            throw adminError;
          }
          
          userExists = !!user;
          console.log('Verificação admin:', userExists ? 'Usuário encontrado' : 'Usuário não encontrado');
        } catch (adminMethodError) {
          console.error('Exceção ao usar admin.getUserByEmail:', adminMethodError);
          console.log('Alternando para fallback de verificação em account_user');
          
          // Fallback se ocorrer erro ou a API admin não estiver disponível
          const { data: accountUser } = await supabase
            .from('account_user')
            .select('*')
            .eq('email', email)
            .maybeSingle();
            
          userExists = !!accountUser;
          console.log('Verificação fallback em account_user:', userExists ? 'Usuário encontrado' : 'Usuário não encontrado');
        }
      } else {
        console.log('SERVICE_ROLE não disponível, verificando diretamente em account_user');
        // Fallback: Verificar na tabela account_user
        const { data: accountUser, error: accountError } = await supabase
          .from('account_user')
          .select('*')
          .eq('email', email)
          .maybeSingle();
          
        if (accountError && accountError.code !== 'PGRST116') {
          console.error('Erro ao verificar usuário em account_user:', accountError);
        }
          
        userExists = !!accountUser;
        console.log('Resultado da verificação em account_user:', userExists ? 'Usuário encontrado' : 'Usuário não encontrado');
      }
      
      console.log(`Resultado final da verificação de usuário: ${userExists ? 'Encontrado' : 'Não encontrado'}`);
    } catch (userError) {
      console.error('Erro ao verificar usuário existente:', userError);
      // Continuamos sem lançar exceção, assumindo que o usuário não existe
      userExists = false;
      console.log('Erro crítico na verificação de usuário - assumindo usuário não existente');
    }
    
    // Se o usuário já tem cadastro completo, enviar para login
    if (userExists) {
      console.log(`Usuário já está cadastrado com email: ${email}, redirecionando para login`);
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: "Você já possui uma conta! Entre com suas credenciais para acessar o sistema.",
        redirect: {
          path: "/auth",
          email: email,
          tab: "login"
        }
      });
    }
    
    // Se não existe usuário, verificamos se já existe uma inscrição (subscription)
    let subscription = null;
    let subscriptionError = null;
    
    try {
      console.log('Verificando inscrição existente para:', email);
      
      // Verificação com retry para garantir confiabilidade
      const maxRetries = 2;
      let retryCount = 0;
      let success = false;
      
      while (!success && retryCount <= maxRetries) {
        try {
          const { data, error } = await supabase
            .from('subscription_um_chamado')
            .select('*')
            .eq('email_subscription', email)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            console.error(`Erro ao verificar inscrição (tentativa ${retryCount+1}/${maxRetries+1}):`, error);
            subscriptionError = error;
            retryCount++;
            
            if (retryCount <= maxRetries) {
              console.log(`Tentando novamente em 500ms...`);
              await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay antes de retry
            }
          } else {
            subscription = data;
            success = true;
          }
        } catch (retryError) {
          console.error(`Exceção na verificação de inscrição (tentativa ${retryCount+1}/${maxRetries+1}):`, retryError);
          subscriptionError = retryError;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.log(`Tentando novamente em 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay antes de retry
          }
        }
      }
      
      console.log(`Resultado verificação de inscrição: ${subscription ? 'Encontrada' : 'Não encontrada'}`);
    } catch (subQueryError) {
      console.error('Erro crítico ao verificar inscrição:', subQueryError);
      // Continuamos o fluxo mesmo em caso de erro, tentando criar a inscrição
    }
    
    // Se já existe inscrição mas não existe usuário, direcionar para registro
    if (subscription) {
      console.log(`Email já inscrito: ${email}, redirecionando para completar o cadastro`);
      return res.status(200).json({
        success: true,
        alreadySubscribed: true,
        message: "Seu email já está inscrito! Complete seu cadastro para acessar o sistema.",
        redirect: {
          path: "/auth",
          email: email,
          tab: "register"
        }
      });
    }
    
    // 3. Criar nova inscrição
    let newSubscription = null;
    
    try {
      console.log(`Criando nova inscrição para: ${email}`);
      const { data, error } = await supabase
        .from('subscription_um_chamado')
        .insert({
          email_subscription: email,
          created_at: new Date().toISOString(), // Campo obrigatório
          status_subscription: 'is_subscription_um_chamado'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar inscrição:', error);
        
        // Se o erro for de duplicação, pode ser que outro processo tenha criado a inscrição
        // entre a verificação e a inserção (condição de corrida)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('violates unique constraint')) {
          console.log('Erro de duplicação detectado, provavelmente a inscrição foi criada simultaneamente');
          
          // Verificar novamente para confirmar que a inscrição existe
          const { data: existingSubscription } = await supabase
            .from('subscription_um_chamado')
            .select('*')
            .eq('email_subscription', email)
            .maybeSingle();
          
          if (existingSubscription) {
            newSubscription = existingSubscription;
            console.log('Inscrição encontrada após erro de duplicação:', newSubscription);
          } else {
            throw new Error('Falha ao criar inscrição e não foi possível encontrar inscrição existente');
          }
        } else {
          throw error;
        }
      } else {
        newSubscription = data;
        console.log('Inscrição criada com sucesso:', newSubscription);
      }
    } catch (createError) {
      console.error('Erro ao criar inscrição:', createError);
      throw createError;
    }
    
    console.log('Inscrição criada com sucesso:', newSubscription);
    
    return res.status(200).json({
      success: true,
      message: "Inscrição realizada com sucesso! Complete seu cadastro agora.",
      redirect: {
        path: "/auth",
        email: email,
        tab: "register"
      }
    });
    
  } catch (error) {
    // Log detalhado do erro para diagnóstico
    const errorInfo = {
      message: error.message || 'Erro desconhecido',
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: error.details || undefined,
      hint: error.hint || undefined,
      timestamp: new Date().toISOString()
    };
    
    console.error('Erro ao processar inscrição:', errorInfo);
    
    // Em produção, não expor detalhes técnicos do erro ao usuário
    const userMessage = process.env.NODE_ENV === 'development' 
      ? `Erro: ${error.message || 'Desconhecido'}${error.code ? ` (código: ${error.code})` : ''}` 
      : "Erro ao processar sua inscrição. Por favor, tente novamente.";
    
    return res.status(200).json({ 
      success: false, 
      message: userMessage,
      // Enviar código e tipo do erro para permitir diagnóstico no cliente
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorType: error.name || 'Error' 
    });
  }
}