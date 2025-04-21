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

  // Obter variáveis de ambiente do Supabase com fallbacks
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Escolha a chave apropriada (preferencialmente a chave de serviço)
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;

  console.log(`Configuração Supabase: URL ${supabaseUrl ? 'disponível' : 'indisponível'}, KEY ${supabaseKey ? 'disponível' : 'indisponível'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      success: false,
      message: 'Erro de configuração no servidor' 
    });
  }

  try {
    console.log('API /subscribe: Inicializando cliente Supabase...');
    console.log('API /subscribe: URLs/Keys configuradas:',
      {
        supabaseUrl: supabaseUrl ? 'configurado' : 'não-configurado',
        serviceKey: supabaseServiceKey ? 'configurado' : 'não-configurado',
        anonKey: supabaseAnonKey ? 'configurado' : 'não-configurado',
        keyUsed: supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON',
        environment: process.env.NODE_ENV || 'indefinido',
        vercel: process.env.VERCEL === '1' ? 'sim' : 'não'
      }
    );
    
    // Inicializar cliente Supabase com SERVICE ROLE (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // 1. Verificar se o usuário já existe na tabela auth
    let userExists = false;
    try {
      // Apenas tente usar o método admin se tivermos a chave de serviço
      if (supabaseServiceKey) {
        const { data: user } = await supabase.auth.admin.getUserByEmail(email);
        userExists = !!user;
      } else {
        // Fallback: Verificar na tabela account_user
        const { data: accountUser } = await supabase
          .from('account_user')
          .select('*')
          .eq('email', email)
          .maybeSingle();
          
        userExists = !!accountUser;
      }
    } catch (userError) {
      console.error('Erro ao verificar usuário existente:', userError);
      // Não interrompemos o fluxo, apenas logamos o erro
    }
    
    if (userExists) {
      console.log(`Usuário já existe: ${email}`);
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: "Você já possui cadastro! Entre com sua conta para continuar.",
        redirect: {
          path: "/auth",
          email: email,
          tab: "login"
        }
      });
    }
    
    // 2. Verificar se já existe uma inscrição
    const { data: subscription, error: subError } = await supabase
      .from('subscription_um_chamado')
      .select('*')
      .eq('email_subscription', email)
      .maybeSingle();
    
    if (subError && subError.code !== 'PGRST116') {
      console.error('Erro ao verificar inscrição:', subError);
      // Continuamos com o fluxo, apenas logamos o erro
    }
    
    if (subscription) {
      console.log(`Inscrição já existe para: ${email}`);
      return res.status(200).json({
        success: true,
        alreadySubscribed: true,
        message: "Email já inscrito! Complete seu cadastro agora.",
        redirect: {
          path: "/auth",
          email: email,
          tab: "register"
        }
      });
    }
    
    // 3. Criar nova inscrição
    console.log(`Criando nova inscrição para: ${email}`);
    const { data: newSubscription, error: createError } = await supabase
      .from('subscription_um_chamado')
      .insert({
        email_subscription: email,
        created_at: new Date().toISOString(), // Campo obrigatório
        status_subscription: 'is_subscription_um_chamado'
      })
      .select()
      .single();
    
    if (createError) {
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
    console.error('Erro ao processar inscrição:', error);
    return res.status(200).json({ 
      success: false, 
      message: "Erro ao processar sua inscrição. Por favor, tente novamente." 
    });
  }
}