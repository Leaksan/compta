import React, { useState, useEffect } from 'react';
import { getUserSettings, updateUserSettings, UserSettings, getUserProfile, saveUserProfile, UserProfile } from '../storage';
import { Settings, Save, Trash2, AlertTriangle, Crown, User, Edit2, X, Tags } from 'lucide-react';
import InstallPWA from './InstallPWA';
import CategoryManager from './CategoryManager';

interface Props {
  onBack: () => void;
}

export default function SettingsView({ onBack }: Props) {
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [currency, setCurrency] = useState(settings.currency);
  const [categories, setCategories] = useState(settings.categories || { income: [], expense: [] });
  const [fieldLabels, setFieldLabels] = useState(settings.fieldLabels || {
    date: 'Date',
    category: 'Catégorie',
    label: 'Libellé',
    observation: 'Observation',
    income: 'Entrée',
    expense: 'Dépense',
    quantity: 'Quantité'
  });
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(getUserProfile());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<UserProfile>({
    firstName: profile?.firstName || '',
    companyName: profile?.companyName || '',
    whatsapp: profile?.whatsapp || '',
    email: profile?.email || '',
    password: profile?.password || ''
  });

  useEffect(() => {
    setSettings(getUserSettings());
  }, []);

  const handleSave = () => {
    updateUserSettings({ ...settings, currency, categories, fieldLabels });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveProfile = () => {
    if (!profileForm.firstName || !profileForm.companyName || !profileForm.whatsapp) {
      alert('Veuillez remplir les champs obligatoires (Nom, Entreprise, WhatsApp).');
      return;
    }
    saveUserProfile(profileForm);
    setProfile(profileForm);
    setIsEditingProfile(false);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleLabelChange = (key: string, value: string) => {
    setFieldLabels({ ...fieldLabels, [key]: value });
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer TOUTES vos données ? Cette action est irréversible.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-24">
      <div className="bg-white px-6 pt-12 pb-8 shadow-sm border-b border-neutral-100">
        <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Paramètres</h1>
        <p className="text-neutral-500 text-sm">Gérez vos préférences</p>
      </div>

      <div className="px-6 py-8 space-y-6">
        {/* Profile Info */}
        {profile && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <User size={16} />
                Profil
              </h2>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                >
                  <Edit2 size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Nom *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={profileForm.firstName}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Entreprise *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={profileForm.companyName}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">WhatsApp *</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={profileForm.whatsapp}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    value={profileForm.password}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                    placeholder="Laisser vide pour ne pas modifier"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full mt-4 bg-neutral-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
                >
                  <Save size={18} strokeWidth={2} />
                  Enregistrer le profil
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Nom</p>
                  <p className="text-sm font-medium text-neutral-900">{profile.firstName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Entreprise</p>
                  <p className="text-sm font-medium text-neutral-900">{profile.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">WhatsApp</p>
                  <p className="text-sm font-medium text-neutral-900">{profile.whatsapp}</p>
                </div>
                {profile.email && (
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm font-medium text-neutral-900">{profile.email}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Account Status */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
            <Crown size={16} className={settings.isPro ? 'text-neutral-900' : 'text-neutral-400'} />
            Statut du compte
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900">Plan actuel</span>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${settings.isPro ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              {settings.isPro ? 'PRO' : 'GRATUIT'}
            </span>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
            <Settings size={16} />
            Général
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-3">Devise principale</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all appearance-none"
              >
                <option value="FCFA">FCFA (Franc CFA)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            {settings.isPro && (
              <>
                <div className="pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
                    <Tags size={16} className="text-neutral-400" />
                    Catégories personnalisées
                  </h3>
                  <CategoryManager 
                    categories={categories} 
                    onChange={setCategories} 
                    fieldLabels={fieldLabels}
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
                    <Edit2 size={16} className="text-neutral-400" />
                    Personnalisation des champs
                  </h3>
                  <p className="text-xs text-neutral-500 mb-4">Modifiez les noms des champs standards selon vos besoins.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(fieldLabels).map(([key, value]) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5 ml-1">
                          {key === 'date' ? 'Date' : 
                           key === 'category' ? 'Catégorie' : 
                           key === 'label' ? 'Libellé' : 
                           key === 'observation' ? 'Observation' : 
                           key === 'income' ? 'Entrée' : 
                           key === 'expense' ? 'Dépense' : 
                           key === 'quantity' ? 'Quantité' : key}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleLabelChange(key, e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleSave}
              className="w-full bg-neutral-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors"
            >
              <Save size={18} strokeWidth={2} />
              Enregistrer
            </button>
            {saved && <p className="text-success text-xs text-center font-medium">Paramètres enregistrés !</p>}
          </div>
        </div>

        {/* Mobile App Install */}
        <InstallPWA />

        {/* Danger Zone */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-danger/20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-danger mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Zone de danger
          </h2>
          <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
            Supprimez toutes vos transactions et réinitialisez l'application. Cette action ne peut pas être annulée.
          </p>
          <button
            onClick={handleReset}
            className="w-full bg-danger-light text-danger font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-danger/20 transition-colors"
          >
            <Trash2 size={18} strokeWidth={2} />
            Réinitialiser les données
          </button>
        </div>
      </div>
    </div>
  );
}
