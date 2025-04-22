import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

interface AcenoChamadoProps {
  userId: string;
  cartaId: number;
}

export default function AcenoChamado({ userId, cartaId }: AcenoChamadoProps) {
  const [acenou, setAcenou] = useState(false);

  const handleAceno = async () => {
    if (acenou) return;

    try {
      console.log("Tentando registrar aceno:", { userId, cartaId });
      const { data, error } = await supabaseClient.from("acenos").insert([
        {
          user_id: userId,
          carta_id: cartaId,
          texto_aceno: "Recebi o chamado!"
        }
      ]).select();

      if (error) {
        console.error("Erro do Supabase ao registrar aceno:", error);
        throw error;
      }

      console.log("Aceno registrado com sucesso:", data);
      setAcenou(true);
    } catch (error) {
      console.error("Erro ao registrar aceno:", error);
    }
  };

  return (
    <div className="flex flex-col items-start mt-12">
      <Button
        onClick={handleAceno}
        disabled={acenou}
        variant="ghost"
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 transform active:scale-95 ${
          acenou 
          ? "bg-gray-900/5 text-gray-900" 
          : "bg-gray-900/[0.02] hover:bg-gray-900/5 hover:scale-105 text-gray-600 hover:text-gray-900"
        }`}
      >
        <span className="text-lg">🫡</span>
        <span className="text-sm">
          {acenou ? "Recebi o chamado!" : "Receber o chamado"}
        </span>
      </Button>
    </div>
  );
}