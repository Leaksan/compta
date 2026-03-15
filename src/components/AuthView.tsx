import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Building2, Phone, Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';
import { apiLogin, apiRegister, setAuthToken, saveUserProfile, getUserProfile, loginUser, registerUser } from '../storage';
import Logo from './Logo';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

const COUNTRY_CODES = [
  { code: '+241', flag: '🇬🇦', label: 'Gabon' },
  { code: '+225', flag: '🇨🇮', label: "Côte d'Ivoire" },
  { code: '+237', flag: '🇨🇲', label: 'Cameroun' },
  { code: '+221', flag: '🇸🇳', label: 'Sénégal' },
  { code: '+223', flag: '🇲🇱', label: 'Mali' },
  { code: '+226', flag: '🇧🇫', label: 'Burkina Faso' },
  { code: '+228', flag: '🇹🇬', label: 'Togo' },
  { code: '+229', flag: '🇧🇯', label: 'Bénin' },
  { code: '+242', flag: '🇨🇬', label: 'Congo' },
  { code: '+243', flag: '🇨🇩', label: 'RDC' },
  { code: '+33', flag: '🇫🇷', label: 'France' },
];

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(!!getUserProfile());
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', companyName: '', countryCode: '+241', whatsapp: '', email: '', password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fullWhatsapp = `${formData.countryCode}${formData.whatsapp}`;

    try {
      if (isLogin) {
        if (!formData.whatsapp || !formData.password) {
          setError('Veuillez remplir tous les champs.'); setLoading(false); return;
        }
        try {
          const { token, user } = await apiLogin(fullWhatsapp, formData.password);
          setAuthToken(token);
          saveUserProfile({ firstName: user.first_name, companyName: user.company_name, whatsapp: user.whatsapp, email: user.email, id: user.id });
          onLoginSuccess();
        } catch {
          // Fallback local
          if (loginUser(fullWhatsapp, formData.password)) { onLoginSuccess(); return; }
          setError('Numéro WhatsApp ou mot de passe incorrect.');
        }
      } else {
        if (!formData.firstName || !formData.companyName || !formData.whatsapp || !formData.password) {
          setError('Veuillez remplir tous les champs obligatoires.'); setLoading(false); return;
        }
        try {
          const { token, user } = await apiRegister({
            firstName: formData.firstName, companyName: formData.companyName,
            whatsapp: fullWhatsapp, email: formData.email || undefined, password: formData.password
          });
          setAuthToken(token);
          saveUserProfile({ firstName: user.first_name, companyName: user.company_name, whatsapp: user.whatsapp, email: user.email, id: user.id });
          onLoginSuccess();
        } catch (err: any) {
          // Fallback local
          registerUser({ firstName: formData.firstName, companyName: formData.companyName, whatsapp: fullWhatsapp, email: formData.email, password: formData.password });
          onLoginSuccess();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-neutral-900 rounded-b-[3rem] shadow-xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <Logo className="w-12 h-12 text-neutral-900" textClassName="text-3xl font-bold text-neutral-900" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">{isLogin ? 'Bon retour !' : 'Bienvenue'}</h1>
            <p className="text-neutral-500 text-sm">
              {isLogin ? 'Connectez-vous pour accéder à votre tableau de bord.' : 'Créez votre compte pour commencer à gérer vos finances.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }} transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Prénom *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400"><User size={18} /></div>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="Votre prénom" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Entreprise *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400"><Building2 size={18} /></div>
                      <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="Nom de votre entreprise" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Email (optionnel)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400"><Mail size={18} /></div>
                      <input type="email" name="email" value={formData.email} onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="votre@email.com" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">WhatsApp *</label>
              <div className="flex gap-2">
                <select name="countryCode" value={formData.countryCode} onChange={handleChange}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all">
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400"><Phone size={18} /></div>
                  <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    placeholder="XX XX XX XX" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Mot de passe *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400"><Lock size={18} /></div>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-xl">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-neutral-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-70 mt-2">
              {loading ? <Loader size={20} className="animate-spin" /> : isLogin ? <><LogIn size={20} /> Connexion</> : <><UserPlus size={20} /> Créer mon compte</>}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors font-medium">
              {isLogin ? "Pas encore de compte ? S'inscrire →" : "Déjà un compte ? Se connecter →"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
