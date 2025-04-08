// API para criar o perfil do usuário após autenticação
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
      auth: { getUser: () => ({ data: null, error: { message: 'Falha na inicialização do Supabase' } }) },
      from: () => ({ upsert: () => ({ error: { message: 'Falha na inicialização do Supabase' } }) })
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
  // Usar a chave de serviço para operações de API backend com permissões elevadas
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  // Escolha a chave apropriada (preferencialmente a chave de serviço)
  const supabaseKey = supabaseServiceKey || supabaseAnonKey;

  console.log(`Configurando Supabase para criação de perfil com URL: ${supabaseUrl ? 'disponível' : 'não disponível'}, 
           ROLE KEY: ${supabaseServiceKey ? 'disponível' : 'não disponível'},
           ANON KEY: ${supabaseAnonKey ? 'disponível' : 'não disponível'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      error: 'Configuração do Supabase não encontrada no ambiente' 
    });
  }

  try {
    // Extrair dados de autenticação e perfil
    const { session, name, email, user_id } = req.body;
    
    if (!session || !session.access_token || (!user_id && !email)) {
      return res.status(400).json({ 
        error: "Dados da sessão e identificação do usuário são obrigatórios",
        receivedData: {
          hasSession: !!session,
          hasAccessToken: !!(session && session.access_token),
          hasUserId: !!user_id,
          hasEmail: !!email
        }
      });
    }

    // Verificar o token de acesso
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar o usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);

    if (userError || !user) {
      console.error('Erro ao verificar autenticação do usuário:', userError);
      return res.status(401).json({
        error: 'Sessão inválida ou expirada',
        details: userError?.message || 'Não foi possível validar o token de acesso'
      });
    }

    console.log(`Usuário autenticado: ${user.email}, ID: ${user.id}`);
    
    // Preparar dados do perfil
    const profileData = {
      id: user.id,
      user_id: user.id,
      name: name || user.user_metadata?.name || '',
      email: email || user.email,
      status: 'active',
      updated_at: new Date().toISOString()
    };

    // Verificar se já existe um perfil
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('account_user')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Erro ao verificar perfil existente:', profileCheckError);
    }

    let accountUser;
    
    // Se o perfil já existe, apenas atualize os dados
    if (existingProfile) {
      console.log(`Perfil já existe, atualizando dados para usuário ID: ${user.id}`);
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('account_user')
        .update({
          name: profileData.name,
          status: profileData.status,
          updated_at: profileData.updated_at
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
        return res.status(500).json({
          error: 'Erro ao atualizar perfil',
          details: updateError.message
        });
      }
      
      accountUser = updatedProfile;
      console.log(`Perfil atualizado com sucesso: ${JSON.stringify(accountUser)}`);
    } else {
      // Se não existe, crie um novo perfil
      console.log(`Criando novo perfil para usuário ID: ${user.id}`);
      
      // Adicionar created_at para novos perfis
      profileData.created_at = profileData.updated_at;
      
      const { data: newProfile, error: insertError } = await supabase
        .from('account_user')
        .upsert(profileData)
        .select()
        .single();
      
      if (insertError) {
        console.error('Erro ao criar perfil:', insertError);
        return res.status(500).json({
          error: 'Erro ao criar perfil',
          details: insertError.message
        });
      }
      
      accountUser = newProfile;
      console.log(`Perfil criado com sucesso: ${JSON.stringify(accountUser)}`);
    }
    
    return res.status(200).json({
      message: "Perfil criado/atualizado com sucesso",
      user: accountUser
    });
    
  } catch (error) {
    console.error('Erro ao processar criação de perfil:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message || String(error)
    });
  }
}