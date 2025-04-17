import { supabaseClient } from './supabase';
import { SupabaseCarta } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Serviço para acessar diretamente as cartas do Supabase no cliente
export const cartaService = {
  // Busca todas as cartas
  async getAllCartas(): Promise<SupabaseCarta[]> {
    try {
      const { data, error } = await supabaseClient
        .from('cartas_um_chamado_a_edificacao')
        .select('*')
        .order('id_sumary_carta', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar cartas:', error);
      return [];
    }
  },

  // Busca uma carta específica pelo ID
  async getCartaById(id: number): Promise<SupabaseCarta | null> {
    try {
      const { data, error } = await supabaseClient
        .from('cartas_um_chamado_a_edificacao')
        .select('*')
        .eq('id_sumary_carta', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar carta ${id}:`, error);
      return null;
    }
  },
  
  // Registra a leitura de uma carta pelo usuário usando a API do servidor
  async registrarLeitura(cartaId: number, userId: string): Promise<void> {
    try {
      console.log(`Tentando registrar leitura para carta com id_sumary_carta ${cartaId} e usuário ${userId}`);
      
      // Obter o usuário atual para garantir que temos o ID correto
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        console.error('Erro ao obter usuário atual:', userError);
        throw userError;
      }
      
      if (!user) {
        console.error('Nenhum usuário autenticado encontrado');
        throw new Error('Usuário não autenticado');
      }
      
      // Usar o ID do usuário atual
      const currentUserId = user.id;
      console.log(`ID do usuário atual: ${currentUserId}`);
      
      // Usar a API do servidor para registrar a leitura
      // O servidor irá lidar com o mapeamento do id_sumary_carta para o ID real da carta
      // e terá permissões adequadas para inserir na tabela status_carta
      const response = await fetch('/api/cartas/registrar-leitura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartaId: cartaId,      // Estamos enviando o id_sumary_carta
          userId: currentUserId  // Usando o ID do usuário atual
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Erro ao registrar leitura da carta via API:', result);
        throw new Error(`Erro ao registrar leitura: ${result.message || 'Erro desconhecido'}`);
      }
      
      console.log(`Leitura da carta registrada com sucesso via API`, result);
    } catch (error) {
      console.error('Erro ao registrar leitura:', error);
      throw error;
    }
  }
};