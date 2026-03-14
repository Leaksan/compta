import React, { useState, useEffect } from 'react';
import { Key, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { updateUserSettings } from '../storage';

interface LicenseGateProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

const LicenseGate: React.FC<LicenseGateProps> = ({ children, onSuccess }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('license_key');
    if (storedKey) {
      validateKey(storedKey);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateKey = async (key: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/validate-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey: key }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsValidated(true);
        localStorage.setItem('license_key', key);
        // Sync with app's PRO status
        updateUserSettings({ isPro: true, activatedAt: data.license?.activated_at || new Date().toISOString() });
        onSuccess?.();
      } else {
        setError(data.error || 'Clé de licence invalide');
        localStorage.removeItem('license_key');
        updateUserSettings({ isPro: false });
        onSuccess?.(); // To refresh UI if it was pro before
      }
    } catch (err) {
      setError('Erreur lors de la connexion au serveur de validation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (licenseKey.trim()) {
      validateKey(licenseKey.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-900" />
          <p className="text-neutral-600 font-medium">Validation de la licence...</p>
        </div>
      </div>
    );
  }

  if (isValidated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-neutral-200">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4">
            <Key className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Activation requise</h2>
          <p className="text-neutral-500 mt-2">Veuillez entrer votre clé de licence pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="license" className="block text-sm font-semibold text-neutral-700 mb-2">
              Clé de licence
            </label>
            <input
              type="text"
              id="license"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Ex: XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors active:scale-[0.98]"
          >
            Activer maintenant
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-neutral-100">
          <p className="text-center text-sm text-neutral-500">
            Vous n'avez pas encore de licence ?
          </p>
          <a
            href="https://chariow.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-neutral-900 text-neutral-900 font-bold hover:bg-neutral-50 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Acheter une licence
          </a>
        </div>
      </div>
    </div>
  );
};

export default LicenseGate;
