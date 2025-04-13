
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Player } from "@lottiefiles/react-lottie-player";

interface AcenoChamadoProps {
  userId: string;
  cartaId: number;
}

export default function AcenoChamado({ userId, cartaId }: AcenoChamadoProps) {
  const [acenou, setAcenou] = useState(false);
  const [animando, setAnimando] = useState(false);

  const handleAceno = async () => {
    if (acenou) return;

    setAnimando(true);
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
      setTimeout(() => {
        setAnimando(false);
        setAcenou(true);
      }, 1000);
    } catch (error) {
      console.error("Erro ao registrar aceno:", error);
      setAnimando(false);
    }
  };

  return (
    <div className="flex flex-col items-start mt-12">
      <Button
        onClick={handleAceno}
        disabled={animando}
        variant="ghost"
        className="hover:bg-transparent pl-0"
      >
        <div className="flex items-center gap-1">
          <Player
            src={"/ascenoanimation.json"}
            className="w-16 h-16"
            autoplay={false}
            loop={false}
            style={{ cursor: 'pointer' }}
            ref={(player: any) => {
              if (player && animando) {
                player.play();
              }
            }}
            onEvent={event => {
              if (event === 'complete') {
                setAnimando(false);
                setAcenou(true);
              }
            }}
          />
          <span className="text-xs text-gray-600 font-sans">{acenou ? "Recebi o chamado!" : "Acenar ao chamado!"}</span>
        </div>
      </Button>
    </div>
  );
}
