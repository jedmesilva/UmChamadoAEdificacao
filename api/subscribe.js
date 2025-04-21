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
    
    // Verificar em ordem:
    // 1. Se já existe um usuário cadastrado (auth.users)
    // 2. Se já existe uma inscrição (subscription_um_chamado)
    
    // Primeiro, verificamos se o usuário já existe na autenticação
    let userExists = false;
    try {
      console.log('Verificando usuário existente para:', email);
      
      // Verificar usuário na tabela auth.users (usuário completo com login)
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
      
      console.log(`Resultado da verificação de usuário: ${userExists ? 'Encontrado' : 'Não encontrado'}`);
    } catch (userError) {
      console.error('Erro ao verificar usuário existente:', userError);
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
    console.log('Verificando inscrição existente para:', email);
    const { data: subscription, error: subError } = await supabase
      .from('subscription_um_chamado')
      .select('*')
      .eq('email_subscription', email)
      .maybeSingle();
    
    if (subError && subError.code !== 'PGRST116') {
      console.error('Erro ao verificar inscrição:', subError);
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