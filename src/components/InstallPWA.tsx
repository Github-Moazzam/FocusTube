'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

declare global {
  interface Window {
    deferredPWAEvent: any;
  }
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if the event fired before React loaded
    if (window.deferredPWAEvent) {
      setDeferredPrompt(window.deferredPWAEvent);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      window.deferredPWAEvent = e;
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("App is either already installed, or your browser doesn't support this feature (like iOS Safari). You can still install via your browser's share/menu options!");
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <button 
      onClick={handleInstallClick}
      className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${isInstallable ? 'text-blue-400 hover:text-blue-300 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800/50'}`}
      aria-label='Install App'
      title='Install App'
    >
      <Download className='w-5 h-5' />
    </button>
  );
}
