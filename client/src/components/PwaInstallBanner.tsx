import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [userDismissedNative, setUserDismissedNative] = useState(false);

  useEffect(() => {
    // Verificar se o usuário já recusou o prompt nativo nesta sessão
    const checkNativeDismissal = () => {
      const dismissed = sessionStorage.getItem('pwaPromptDismissed');
      return dismissed === 'true';
    };
    
    setUserDismissedNative(checkNativeDismissal());

    // Armazenar o evento para uso posterior e mostrar prompt nativo imediatamente
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Se o usuário não recusou anteriormente o prompt nativo, mostrá-lo automaticamente
      if (!checkNativeDismissal()) {
        setTimeout(() => {
          promptEvent.prompt();
          
          promptEvent.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('Usuário aceitou a instalação do prompt nativo');
              setShowBanner(false);
            } else {
              console.log('Usuário recusou a instalação do prompt nativo');
              // Armazenar que o usuário recusou para não mostrar o prompt nativo novamente nesta sessão
              sessionStorage.setItem('pwaPromptDismissed', 'true');
              setUserDismissedNative(true);
              // Mostrar o banner personalizado depois que o usuário recusou o prompt nativo
              setShowBanner(true);
            }
          });
        }, 1000); // Pequeno atraso para garantir que a página carregue completamente
      } else {
        // Se o usuário já recusou o prompt nativo, mostrar apenas o banner personalizado
        setShowBanner(true);
      }
    };

    // Verifica se o app já está instalado
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    // Adiciona o listener apenas se não estiver instalado
    if (!isAppInstalled) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt de instalação novamente se o usuário clicar no botão do banner
    await deferredPrompt.prompt();
    
    // Espera a escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    // Limpa o prompt salvo e fecha o banner se o usuário aceitar
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação do banner personalizado');
      setDeferredPrompt(null);
      setShowBanner(false);
    } else {
      console.log('Usuário recusou a instalação do banner personalizado');
    }
  };

  const closeBanner = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 mx-auto w-[90%] max-w-md bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg text-gray-900 font-heading">Instale Um Chamado à Edificação</h3>
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
            className="px-6 py-3 bg-gray-800 text-white rounded hover:bg-gray-700 text-sm font-medium transition-colors shadow-sm"
          >
            Instalar aplicativo
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;