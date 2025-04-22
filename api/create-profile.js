// API para criação de perfil de usuário (/api/create-profile)
import { createClient } from '@supabase/supabase-js';

/**
 * Handler para API de criação de perfil no Vercel
 * @param {Object} req - Objeto de requisição
 * @param {Object} res - Objeto de resposta
 */
export default async function handler(req, res) {
  console.log('API /create-profile: chamada iniciada');
  
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
    console.log('API /create-profile: método não permitido:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Método não permitido'
    });
  }

  // Garantindo que req.body esteja parseado se for string
  let body = req.body;
  console.log('API /create-profile: body recebido:', JSON.stringify(body));
  
  if (body && typeof body === 'string' && req.headers['content-type']?.includes('application/json')) {
    try {
      body = JSON.parse(body);
      console.log('API /create-profile: body parseado:', JSON.stringify(body));
    } catch (error) {
      console.error('Erro ao parsear JSON do body:', error);
      return res.status(400).json({
        success: false,
        message: 'Formato de dados inválido'
      });
    }
  }

  // Verificar se o token de autorização está presente
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: "Token de autenticação ausente ou inválido" 
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Obter variáveis de ambiente do Supabase com fallbacks
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Configuração do Supabase não encontrada no ambiente');
    return res.status(500).json({ 
      success: false,
      message: 'Erro de configuração no servidor' 
    });
  }

  try {
    console.log('API /create-profile: Inicializando cliente Supabase...');
    
    // 1. Primeiro verificar a validade do token e extrair user_id
    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Erro na autenticação do token:', authError);
      return res.status(401).json({ 
        success: false, 
        message: "Token inválido ou expirado" 
      });
    }
    
    // 2. Validar que o ID no token corresponde ao ID no body
    if (user.id !== body.user_id) {
      return res.status(403).json({ 
        success: false, 
        message: "Não autorizado a criar perfil para outro usuário" 
      });
    }
    
    // 3. Verificar se o perfil já existe
    console.log('API /create-profile: Verificando se já existe perfil para o usuário:', user.id);
    const { data: existingProfile, error: profileError } = await authClient
      .from('account_user')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('API /create-profile: Erro ao verificar perfil existente:', profileError);
    }
      
    if (existingProfile) {
      console.log('API /create-profile: Perfil já existe:', existingProfile);
      return res.status(200).json({
        success: true,
        message: "Perfil já existe",
        profile: existingProfile
      });
    }
    
    // 4. Criar o perfil com a service_role que tem permissão para bypass do RLS
    console.log('API /create-profile: Criando novo perfil para usuário:', user.id);
    
    // Preparando dados para inserção
    // Certifica-se que o telefone está no formato correto com o código do país
    let formattedPhone = body.whatsapp;
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
      console.log('API /create-profile: Corrigindo formato do whatsapp para:', formattedPhone);
    }
    
    const profileData = {
      id: user.id, // Importante: o id deve ser o mesmo do usuário autenticado
      user_id: user.id, // Garantindo que user_id seja o auth.uid()
      email: body.email,
      name: body.name,
      whatsapp: formattedPhone, // Mantendo whatsapp tudo minúsculo com formato correto
      status: body.status || 'is_complit',
      created_at: body.created_at || new Date().toISOString()
    };
    
    console.log('API /create-profile: Dados para inserção:', JSON.stringify(profileData, null, 2));
    console.log('API /create-profile: URL Supabase:', supabaseUrl);
    console.log('API /create-profile: Chave Service Role disponível:', !!supabaseServiceKey);
    
    // Primeiro fazemos a inserção sem tentar retornar os dados
    const { error: insertError } = await authClient
      .from('account_user')
      .insert(profileData);
      
    if (insertError) {
      console.error('Erro na inserção inicial:', JSON.stringify(insertError, null, 2));
      console.error('Detalhes do erro:', insertError.message);
      return res.status(500).json({
        success: false,
        message: `Erro ao criar perfil: ${insertError.message}`,
        error: insertError
      });
    }
    
    // Depois buscamos o perfil recém-criado
    const { data: profile, error: fetchError } = await authClient
      .from('account_user')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (fetchError) {
      console.error('Erro ao buscar perfil após criação:', JSON.stringify(fetchError, null, 2));
      return res.status(500).json({
        success: false,
        message: `Perfil criado, mas erro ao recuperar os dados: ${fetchError.message}`,
        error: fetchError
      });
    }
    
    // Chegando aqui, significa que tudo deu certo na inserção e busca do perfil
    
    console.log('API /create-profile: Perfil criado com sucesso:', profile);
    
    return res.status(201).json({
      success: true,
      message: "Perfil criado com sucesso",
      profile
    });
    
  } catch (error) {
    console.error('Erro inesperado:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Erro interno do servidor" 
    });
  }
}