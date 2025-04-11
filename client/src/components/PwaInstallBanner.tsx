import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Armazena o evento para uso posterior
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowBanner(true);
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

    // Mostra o prompt de instalação
    await deferredPrompt.prompt();
    
    // Espera a escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    // Limpa o prompt salvo
    setDeferredPrompt(null);
    setShowBanner(false);
    
    // Pode implementar analytics aqui
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    } else {
      console.log('Usuário recusou a instalação');
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