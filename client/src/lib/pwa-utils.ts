/**
 * Utilitários para o PWA
 */

// Registra o service worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registrado com sucesso:', registration.scope);
        })
        .catch(error => {
          console.error('Falha ao registrar o Service Worker:', error);
        });
    });
  }
}

// Interface para o navegador do iOS que inclui a propriedade 'standalone'
interface SafariNavigator extends Navigator {
  standalone?: boolean;
}

// Verifica se a app está rodando em modo standalone (PWA instalado)
export function isAppInstalled(): boolean {
  // Verifica se está em modo standalone via media query (funciona na maioria dos navegadores)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Verifica se está em modo standalone no iOS
  const isIosStandalone = typeof (window.navigator as SafariNavigator).standalone === 'boolean' 
    ? !!(window.navigator as SafariNavigator).standalone 
    : false;
    
  // Verifica se foi aberto de um app Android
  const isAndroidApp = document.referrer.includes('android-app://');
  
  return isStandalone || isIosStandalone || isAndroidApp;
}

// Detecta a plataforma do usuário
export function getPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  if (window.innerWidth > 800) {
    return 'desktop';
  }
  
  return 'unknown';
}