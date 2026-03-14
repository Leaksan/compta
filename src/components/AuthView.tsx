import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Building2, Phone, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { loginUser, registerUser, getUserProfile } from '../storage';
import Logo from './Logo';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(!!getUserProfile());
  const [formData, setFormData] = useState({
    firstName: '',
    companyName: '',
    countryCode: '+241',
    whatsapp: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (!formData.whatsapp || !formData.password) {
        setError('Veuillez remplir tous les champs obligatoires.');
        return;
      }
      const fullWhatsapp = `${formData.countryCode}${formData.whatsapp}`;
      const success = loginUser(fullWhatsapp, formData.password);
      if (success) {
        onLoginSuccess();
      } else {
        setError('Numéro WhatsApp ou mot de passe incorrect.');
      }
    } else {
      if (!formData.firstName || !formData.companyName || !formData.whatsapp || !formData.password) {
        setError('Veuillez remplir tous les champs obligatoires.');
        return;
      }
      const fullProfile = {
        ...formData,
        whatsapp: `${formData.countryCode}${formData.whatsapp}`
      };
      registerUser(fullProfile);
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-64 bg-neutral-900 rounded-b-[3rem] shadow-xl"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <Logo className="w-12 h-12 text-neutral-900" textClassName="text-3xl font-bold text-neutral-900" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              {isLogin ? 'Bon retour !' : 'Bienvenue'}
            </h1>
            <p className="text-neutral-500 text-sm">
              {isLogin ? 'Connectez-vous pour accéder à votre tableau de bord.' : 'Créez votre compte pour commencer à gérer vos finances.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Prénom</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="Votre prénom"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Nom de l'entreprise</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                        <Building2 size={18} />
                      </div>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="Votre entreprise"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Numéro WhatsApp</label>
              <div className="flex gap-2">
                <div className="relative w-1/3">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange as any}
                    className="w-full pl-3 pr-8 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+225">🇨🇮 +225</option>
                    <option value="+221">🇸🇳 +221</option>
                    <option value="+237">🇨🇲 +237</option>
                    <option value="+243">🇨🇩 +243</option>
                    <option value="+228">🇹🇬 +228</option>
                    <option value="+229">🇧🇯 +229</option>
                    <option value="+226">🇧🇫 +226</option>
                    <option value="+223">🇲🇱 +223</option>
                    <option value="+241">🇬🇦 +241</option>
                    <option value="+242">🇨🇬 +242</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Email <span className="text-neutral-400 font-normal lowercase">(facultatif)</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                        placeholder="contact@entreprise.com"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-danger text-sm text-center font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full bg-neutral-900 text-white py-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors mt-6"
            >
              {isLogin ? (
                <>Se connecter <LogIn size={18} /></>
              ) : (
                <>Créer mon compte <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        <div className="bg-neutral-50 p-6 text-center border-t border-neutral-100">
          <p className="text-sm text-neutral-600">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ml-2 font-semibold text-neutral-900 hover:underline focus:outline-none"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
