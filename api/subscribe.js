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

  // Obter configurações do Supabase - simplificado
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Usar a service role key para contornar RLS
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      success: false,
      message: 'Erro de configuração no servidor - credenciais ausentes',
    });
  }

  try {
    console.log('Inicializando cliente Supabase com Service Role...');
    
    // Inicializar cliente Supabase com SERVICE ROLE KEY para contornar problemas de RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'api-vercel',
          // Headers especiais para contornar o RLS
          'Authorization': `Bearer ${supabaseKey}`,
          'X-Supabase-Auth': 'service_role'
        },
      }
    });
    
    // 1. Verificar se usuário existe na tabela account_user (mais simples e confiável)
    let userExists = false;
    
    try {
      // Verificar na tabela account_user
      const { data: existingUser } = await supabase
        .from('account_user')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (existingUser) {
        userExists = true;
        console.log('Usuário encontrado em account_user');
      }
    } catch (userCheckError) {
      console.error('Erro ao verificar usuário:', userCheckError);
      // Assume que o usuário não existe em caso de erro
    }
    
    // 2. Se usuário existe, enviar para login
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
    
    // 3. Verificar inscrição existente
    try {
      const { data: existingSubscription } = await supabase
        .from('subscription_um_chamado')
        .select('id')
        .eq('email_subscription', email)
        .maybeSingle();
      
      if (existingSubscription) {
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
    } catch (subscriptionCheckError) {
      console.error('Erro ao verificar inscrição:', subscriptionCheckError);
      // Continue mesmo em caso de erro
    }
    
    // 4. Criar nova inscrição
    try {
      const { error: insertError } = await supabase
        .from('subscription_um_chamado')
        .insert({
          email_subscription: email,
          created_at: new Date().toISOString(),
          status_subscription: 'is_subscription_um_chamado'
        });
      
      if (insertError) {
        // Se for erro de duplicado, assume que foi bem-sucedido
        if (insertError.code === '23505' || 
            insertError.message?.includes('duplicate') || 
            insertError.message?.includes('violates unique constraint')) {
          console.log('Email já estava inscrito (detectado via erro de duplicação)');
        } else {
          throw insertError;
        }
      }
    } catch (insertError) {
      console.error('Erro ao criar inscrição:', insertError);
      // Tente prosseguir, mesmo com erro
    }
    
    // 5. Retornar resposta de sucesso
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
    console.error('Erro geral ao processar inscrição:', error);
    
    // Resposta amigável para o usuário
    return res.status(200).json({ // Use 200 para que o cliente ainda receba a resposta
      success: false, 
      message: "Estamos com dificuldades no processamento. Tente novamente mais tarde ou entre em contato com suporte.",
      redirect: {
        path: "/auth", // Ainda redireciona para página de auth
        email: email
      }
    });
  }
}