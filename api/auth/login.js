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
            
            // Verificar se é necessário atualizar o nome no perfil (conta existente sem nome)
            // Primeiro, verificamos se o status é 'no_complit' - só atualizamos neste caso
            if (accountByEmail.status === 'no_complit' && data.user.user_metadata) {
              const userName = data.user.user_metadata.name || data.user.user_metadata.full_name;
              if (userName) {
                // Atualizar o perfil de forma assíncrona (fire and forget)
                console.log(`Atualizando nome do usuário para "${userName}" e status para "is_complit" de forma assíncrona`);
                supabase
                  .from('account_user')
                  .update({ 
                    name: userName,
                    status: 'is_complit' // Atualizar o status para is_complit
                  })
                  .eq('id', accountByEmail.id)
                  .then(({ error }) => {
                    if (error) console.error('Erro ao atualizar perfil do usuário no backend:', error);
                    else console.log(`Perfil do usuário atualizado para nome="${userName}" e status="is_complit" com sucesso`);
                  })
                  .catch(error => console.error('Exceção ao atualizar perfil do usuário no backend:', error));
                  
                // Responder imediatamente sem esperar pela atualização
                accountByEmail.name = userName; // Atualizar a cópia local para a resposta
                accountByEmail.status = 'is_complit'; // Atualizar o status na resposta
              }
            } else if (accountByEmail.status === 'is_complit') {
              console.log(`Perfil já está completo (status is_complit), nenhuma atualização necessária`);
            }
            
            return res.status(200).json({
              message: "Login realizado com sucesso",
              user: accountByEmail,
              session: data.session
            });
          }
        }
      } else if (accountUser) {
        console.log(`Perfil encontrado: ${JSON.stringify(accountUser)}`);
        
        // Verificar se é necessário atualizar o nome e status no perfil
        // Primeiro, verificamos se o status é 'no_complit' - só atualizamos neste caso
        if (accountUser.status === 'no_complit' && data.user.user_metadata) {
          const userName = data.user.user_metadata.name || data.user.user_metadata.full_name;
          if (userName) {
            // Atualizar o perfil de forma assíncrona (fire and forget)
            console.log(`Atualizando nome do usuário para "${userName}" e status para "is_complit" de forma assíncrona`);
            supabase
              .from('account_user')
              .update({ 
                name: userName,
                status: 'is_complit' // Atualizar o status para is_complit
              })
              .eq('id', accountUser.id)
              .then(({ error }) => {
                if (error) console.error('Erro ao atualizar perfil do usuário no backend:', error);
                else console.log(`Perfil do usuário atualizado para nome="${userName}" e status="is_complit" com sucesso`);
              })
              .catch(error => console.error('Exceção ao atualizar perfil do usuário no backend:', error));
              
            // Responder imediatamente sem esperar pela atualização
            accountUser.name = userName; // Atualizar a cópia local para a resposta
            accountUser.status = 'is_complit'; // Atualizar o status na resposta
          }
        } else if (accountUser.status === 'is_complit') {
          console.log(`Perfil já está completo (status is_complit), nenhuma atualização necessária`);
        }
        
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

    // Nenhum perfil encontrado, vamos criar um novo
    console.log(`Perfil não encontrado para ${email}, criando novo perfil`);
    
    // Usar nome dos metadados do usuário se disponível
    const userName = data.user.user_metadata?.name || 
                    data.user.user_metadata?.full_name || 
                    email.split('@')[0];
    
    try {
      // Criar um novo perfil para o usuário
      const { data: newProfile, error: createError } = await supabase
        .from('account_user')
        .insert({
          id: data.user.id,
          user_id: data.user.id,
          email: email,
          name: userName,
          status: 'is_complit', // Definir como is_complit já que temos o nome
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Erro ao criar perfil do usuário:', createError);
        // Continuar mesmo com erro
      } else if (newProfile) {
        console.log(`Novo perfil criado com sucesso: ${JSON.stringify(newProfile)}`);
        return res.status(200).json({
          message: "Login realizado com sucesso e perfil criado",
          user: newProfile,
          session: data.session,
          profileCreated: true
        });
      }
    } catch (createProfileError) {
      console.error('Exceção ao criar perfil:', createProfileError);
      // Continuar mesmo com erro
    }
    
    // Fallback para resposta sem perfil completo
    console.log(`Login autenticado para ${email}, mas não foi possível criar perfil`);
    
    return res.status(200).json({
      message: "Login realizado com sucesso",
      user: data.user,
      session: data.session,
      noProfile: true
    });
    
  } catch (error) {
    console.error('Erro ao processar login:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message || String(error)
    });
  }
}