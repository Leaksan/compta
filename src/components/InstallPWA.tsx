import React, { useState, useEffect } from 'react';
import { Smartphone, Share, Plus } from 'lucide-react';

type Platform = 'android' | 'ios' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Si déjà installée en standalone, on l'indique
    if (isInStandaloneMode()) {
      setAlreadyInstalled(true);
      return;
    }

    // Android / Chrome Desktop : écoute l'event natif
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIOSGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setAlreadyInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Android sans prompt (cas rare : déjà installé ou navigateur non-Chrome)
      alert("Ouvrez le menu de votre navigateur (⋮) puis sélectionnez « Ajouter à l'écran d'accueil ».");
    }
  };

  if (alreadyInstalled) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
        <div className="flex items-center gap-3 text-green-600">
          <Smartphone size={20} />
          <span className="text-sm font-medium">Application installée</span>
        </div>
        <p className="text-xs text-neutral-400 mt-2">Kaizō est disponible sur votre écran d'accueil.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
        <Smartphone size={16} />
        Installer l'application
      </h2>

      {/* Guide iOS */}
      {showIOSGuide && platform === 'ios' && (
        <div className="mb-5 bg-blue-50 rounded-2xl p-4 text-sm text-blue-800 space-y-3">
          <p className="font-medium">Installation sur iPhone / iPad :</p>
          <ol className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>Appuyez sur l'icône <Share size={14} className="inline mb-0.5" /> <strong>Partager</strong> en bas de Safari</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>Faites défiler et appuyez sur <strong>« Sur l'écran d'accueil »</strong> <Plus size={14} className="inline mb-0.5" /></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>Appuyez sur <strong>Ajouter</strong> en haut à droite</span>
            </li>
          </ol>
          <p className="text-xs text-blue-600 mt-1">L'app doit être ouverte dans <strong>Safari</strong> (pas Chrome ni Firefox) pour fonctionner.</p>
        </div>
      )}

      <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
        {platform === 'ios'
          ? "Installez Kaizō sur votre iPhone pour y accéder depuis l'écran d'accueil, même hors connexion."
          : "Installez Kaizō sur votre appareil pour y accéder depuis l'écran d'accueil, même hors ligne."
        }
      </p>

      <button
        onClick={handleInstallClick}
        className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all"
      >
        <Smartphone size={18} strokeWidth={2} />
        {platform === 'ios'
          ? "Comment installer sur iPhone"
          : isInstallable
            ? "Installer l'application"
            : "Comment installer (Android)"
        }
      </button>
    </div>
  );
}
