// API principal em formato ESM para Vercel Serverless
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configuração CORS 
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Lidar com preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: "OK"
    });
  }

  // Configurar cliente Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Configuração do Supabase não encontrada no ambiente' 
    });
  }

  try {
    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Rota para obter cartas
    if (req.url.startsWith('/api/cartas') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('cartas_um_chamado_a_edificacao')
        .select('*');
      
      if (error) throw error;
      
      return res.status(200).json(data);
    }
    
    // Rota para obter carta por ID
    if (req.url.match(/\/api\/cartas\/\d+/) && req.method === 'GET') {
      const id = req.url.split('/').pop();
      
      const { data, error } = await supabase
        .from('cartas_um_chamado_a_edificacao')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return res.status(200).json(data);
    }
    
    // Resposta padrão se nenhuma rota corresponder
    return res.status(404).json({ 
      error: 'Endpoint não encontrado' 
    });
    
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: error.message 
    });
  }
}