import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches;
}

const DISMISSED_KEY = 'kaizo_install_dismissed';

export default function InstallPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ne pas afficher si : déjà installé, pas Android, déjà dismissé
    if (isInStandaloneMode()) return;
    if (!isAndroid()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Petit délai pour ne pas surgir au chargement
      setTimeout(() => setVisible(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    // Ne plus afficher pendant 7 jours
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay sombre derrière */}
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Bottom sheet popup */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md"
        style={{
          transform: 'translateX(-50%)',
          animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateX(-50%) translateY(100%); opacity: 0; }
            to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="bg-white rounded-t-3xl shadow-2xl p-6 pb-10">
          {/* Poignée */}
          <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-5" />

          {/* Bouton fermer */}
          <button
            onClick={handleDismiss}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Icône app */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xl" style={{ fontFamily: 'DM Mono, monospace' }}>K</span>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 text-base">Kaizō</p>
              <p className="text-xs text-neutral-400 mt-0.5">Comptabilité · Accès hors ligne</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Installez l'application sur votre écran d'accueil pour y accéder en un tap, même sans connexion.
          </p>

          {/* CTA */}
          <button
            onClick={handleInstall}
            className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all mb-3"
          >
            <Download size={18} />
            Installer l'application
          </button>

          <button
            onClick={handleDismiss}
            className="w-full text-sm text-neutral-400 py-2 hover:text-neutral-600 transition-colors"
          >
            Pas maintenant
          </button>
        </div>
      </div>
    </>
  );
}
