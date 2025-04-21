
import { supabaseClient } from "@/lib/supabase";
import type { EmailSignature, ParchmentSignature } from "../../../lib/supabase-types";

export const signatureService = {
  async getEmailSignature(userId: string): Promise<EmailSignature | null> {
    const { data, error } = await supabaseClient
      .from('signature_email')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Erro ao buscar assinatura de email:', error);
      return null;
    }
    return data;
  },

  async getParchmentSignature(userId: string): Promise<ParchmentSignature | null> {
    const { data, error } = await supabaseClient
      .from('signature_parchment')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Erro ao buscar assinatura física:', error);
      return null;
    }
    return data;
  },

  async createEmailSignature(userId: string): Promise<EmailSignature | null> {
    const { data, error } = await supabaseClient
      .from('signature_email')
      .insert([{ user_id: userId, status_signature: 'active' }])
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar assinatura de email:', error);
      return null;
    }
    return data;
  },

  async createParchmentSignature(userId: string): Promise<ParchmentSignature | null> {
    const { data, error } = await supabaseClient
      .from('signature_parchment')
      .insert([{ user_id: userId, status_signature: 'active' }])
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar assinatura física:', error);
      return null;
    }
    return data;
  },

  async cancelEmailSignature(userId: string): Promise<boolean> {
    const { error } = await supabaseClient
      .from('signature_email')
      .update({ status_signature: 'cancelled' })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Erro ao cancelar assinatura de email:', error);
      return false;
    }
    return true;
  },

  async cancelParchmentSignature(userId: string): Promise<boolean> {
    const { error } = await supabaseClient
      .from('signature_parchment')
      .update({ status_signature: 'cancelled' })
      .eq('user_id', userId);
      
    if (error) {
      console.error('Erro ao cancelar assinatura física:', error);
      return false;
    }
    return true;
  }
};
