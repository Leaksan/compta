import React, { useState, useEffect } from 'react';
import { Smartphone, Download, ExternalLink, CheckCircle } from 'lucide-react';

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setJustInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setJustInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Déjà installée
  if (installed) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
        <div className="flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {justInstalled ? 'Installation réussie !' : 'Application installée'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kaizō est disponible sur votre écran d'accueil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Android avec prompt dispo → bouton direct
  if (isAndroid() && deferredPrompt) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
          <Smartphone size={16} />
          Application mobile
        </h2>
        <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
          Installez Kaizō sur votre écran d'accueil pour y accéder en un tap, même sans connexion.
        </p>
        <button
          onClick={handleInstall}
          className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-95 transition-all"
        >
          <Download size={18} />
          Installer l'application
        </button>
      </div>
    );
  }

  // Android sans prompt (déjà installé, ou navigateur qui ne supporte pas)
  if (isAndroid() && !deferredPrompt) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
          <Smartphone size={16} />
          Application mobile
        </h2>
        <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
          Pour installer, ouvrez le menu Chrome <span className="font-mono text-neutral-700">⋮</span> puis appuyez sur <strong className="text-neutral-700">« Ajouter à l'écran d'accueil »</strong>.
        </p>
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Obtenir l'APK Android</p>
          <p className="text-xs text-neutral-500 leading-relaxed mb-4">
            Vous pouvez convertir cette PWA en APK via PWABuilder — un outil gratuit de Microsoft.
          </p>
          <a
            href="https://www.pwabuilder.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white border border-neutral-200 text-neutral-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-50 active:scale-95 transition-all text-sm"
          >
            <ExternalLink size={15} />
            Ouvrir PWABuilder
          </a>
        </div>
      </div>
    );
  }

  // iOS
  if (isIOS()) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
          <Smartphone size={16} />
          Application mobile
        </h2>
        <ol className="space-y-3 text-sm text-neutral-600">
          {[
            'Ouvrez cette page dans Safari',
            'Appuyez sur l\'icône Partager (bas de l\'écran)',
            'Sélectionnez « Sur l\'écran d\'accueil »',
            'Appuyez sur Ajouter',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Desktop ou autre
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
        <Smartphone size={16} />
        Application mobile
      </h2>
      <p className="text-sm text-neutral-500 leading-relaxed">
        Ouvrez cette application sur votre téléphone Android avec Chrome pour l'installer sur l'écran d'accueil.
      </p>
    </div>
  );
}
