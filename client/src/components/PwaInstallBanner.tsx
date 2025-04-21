import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

// Evento personalizado para o prompt de instalação do PWA
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Declaração global para o evento no window
declare global {
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
}

const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [promptTriggered, setPromptTriggered] = useState(false);

  // Função para verificar se o PWA está em critérios de instalação
  const canInstallPwa = (): boolean => {
    // Verifica se é HTTPS (requisito para PWA)
    const isHttps = window.location.protocol === 'https:';
    
    // Verifica se está rodando no navegador e não como PWA instalado
    const isNotStandalone = !window.matchMedia('(display-mode: standalone)').matches;
    
    // Verifica se não está no iOS (que tem comportamento diferente)
    const isNotIOS = !/iPad|iPhone|iPod/.test(navigator.userAgent);
    
    return isHttps && isNotStandalone;
  };

  // Função para mostrar o prompt nativo
  const triggerNativePrompt = () => {
    if (deferredPrompt && !promptTriggered) {
      console.log('Tentando mostrar o prompt nativo...');
      setPromptTriggered(true);
      
      // Adiciona um pequeno atraso para garantir que o usuário tenha interagido com a página
      setTimeout(() => {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('Usuário aceitou a instalação');
            setShowBanner(false);
            setDeferredPrompt(null);
          } else {
            console.log('Usuário recusou a instalação');
            setShowBanner(true);
          }
        });
      }, 1500);
    } else if (!deferredPrompt) {
      // Se não conseguir capturar o evento, mostra o banner personalizado mesmo assim
      console.log('Prompt de instalação não disponível, mostrando banner personalizado');
      setShowBanner(true);
    }
  };

  useEffect(() => {
    console.log('PWA: Inicializando componente de instalação');
    
    // Verifica primeiro se o banner já foi fechado
    const bannerClosed = localStorage.getItem('pwa-banner-closed') === 'true';
    if (bannerClosed) {
      setShowBanner(false);
      return;
    }
    
    // Captura o evento de instalação e o armazena
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('PWA: Evento beforeinstallprompt capturado');
      
      // Previne o comportamento padrão (em alguns navegadores mais antigos)
      e.preventDefault();
      
      // Armazena o evento para uso posterior
      setDeferredPrompt(e);
      
      // Mostra o banner apenas se não tiver sido fechado anteriormente
      if (!bannerClosed) {
        setShowBanner(true);
      }
    };

    // Verifica se o PWA pode ser instalado
    if (canInstallPwa()) {
      // Adiciona o listener para o evento
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      
      // Força a exibição do banner após algum tempo se o evento não for capturado e o banner não tiver sido fechado
      setTimeout(() => {
        if (!showBanner && !bannerClosed) {
          console.log('PWA: Forçando exibição do banner após timeout');
          setShowBanner(true);
        }
      }, 3000);
    }

    // Adiciona listener para cliques no documento para mostrar o prompt após interação
    const handleUserInteraction = () => {
      if (deferredPrompt && !promptTriggered) {
        console.log('PWA: Interação do usuário detectada, tentando mostrar prompt');
        triggerNativePrompt();
      }
    };

    document.addEventListener('click', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [deferredPrompt, promptTriggered]);

  // Função para manipular o clique no botão de instalação
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      console.log('PWA: Iniciando instalação a partir do botão');
      await deferredPrompt.prompt();
      
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: Usuário aceitou a instalação pelo banner');
        setDeferredPrompt(null);
        setShowBanner(false);
      } else {
        console.log('PWA: Usuário recusou a instalação pelo banner');
      }
    } else {
      console.log('PWA: Prompt não disponível');
      alert('Para instalar, adicione esta página à tela inicial através do menu do seu navegador.');
    }
  };

  const closeBanner = () => {
    console.log('PWA: Banner fechado pelo usuário');
    setShowBanner(false);
    setDeferredPrompt(null); // Previne o prompt nativo de aparecer
    // Salva a preferência do usuário
    localStorage.setItem('pwa-banner-closed', 'true');
  };

  

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto w-[90%] max-w-md bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-900 font-heading flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Instale Um Chamado à Edificação
          </h3>
          <button 
            onClick={closeBanner} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 mb-3 text-sm">
          Instale o aplicativo para acessar as cartas mesmo offline e receber notificações de novos conteúdos!
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={closeBanner}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Agora não
          </button>
          <button
            onClick={handleInstallClick}
            className="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm font-medium transition-colors shadow-sm flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Instalar aplicativo
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;