import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback if the prompt is not available (e.g., already installed or not supported)
      alert("Pour installer l'application sur Android, ouvrez le menu de votre navigateur (les 3 petits points) et sélectionnez 'Ajouter à l'écran d'accueil' ou 'Installer l'application'.");
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
        <Smartphone size={16} />
        Application Mobile
      </h2>
      <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
        Installez l'application sur votre appareil Android pour y accéder plus rapidement, même hors ligne.
      </p>
      <button
        onClick={handleInstallClick}
        className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
      >
        <Smartphone size={18} strokeWidth={2} />
        {isInstallable ? "Installer l'application" : "Comment installer (Android)"}
      </button>
    </div>
  );
}
