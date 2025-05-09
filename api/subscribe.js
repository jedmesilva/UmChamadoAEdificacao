// API específica para inscrição (/api/subscribe)
import { createClient } from '@supabase/supabase-js';

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

  // Obter configurações do Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      success: false,
      message: 'Erro de configuração no servidor - credenciais ausentes',
    });
  }

  try {
    console.log('Inicializando cliente Supabase...');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      },
      db: {
        schema: 'public'
      }
    });

    // 1. Verificar se existe usuário autenticado com este email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    const userExists = users?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (usersError) {
      console.error('Erro ao verificar usuários:', usersError);
    }

    // 2. Verificar se já existe inscrição
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from('subscription_um_chamado')
      .select('*')
      .eq('email_subscription', email)
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Erro ao verificar inscrição:', subscriptionError);
    }

    // 3. Decidir fluxo baseado nas verificações
    if (userExists) {
      // Existe usuário autenticado
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

    if (existingSubscription) {
      // Existe inscrição mas não existe usuário
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

    // 4. Criar nova inscrição se não existe
    let attempts = 3;
    while (attempts > 0) {
      try {
        const { error: insertError } = await supabase
          .from('subscription_um_chamado')
          .insert({
            email_subscription: email,
            created_at: new Date().toISOString(),
            status_subscription: 'is_subscription_um_chamado'
          });

        if (insertError) {
          if (insertError.code === '23505' || 
              insertError.message?.includes('duplicate') || 
              insertError.message?.includes('violates unique constraint')) {
            console.log('Email já estava inscrito (detectado via erro de duplicação)');
            break;
          }
          throw insertError;
        }
        break; // Sucesso, sai do loop
      } catch (insertError) {
        attempts--;
        if (attempts === 0) {
          console.error('Erro ao criar inscrição após todas tentativas:', insertError);
          throw insertError;
        }
        console.warn(`Tentativa falhou, restam ${attempts} tentativas:`, insertError);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 5. Retornar sucesso para nova inscrição
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
    console.error('Erro geral ao processar inscrição:', error);
    return res.status(500).json({
      success: false, 
      message: "Estamos com dificuldades no processamento. Tente novamente mais tarde ou entre em contato com suporte.",
      redirect: {
        path: "/auth",
        email: email
      }
    });
  }
}