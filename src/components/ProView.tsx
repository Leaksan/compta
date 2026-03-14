import { useState, useEffect } from 'react';
import {
  Crown, CheckCircle2, ListPlus, Plus, Trash2,
  ArrowUp, ArrowDown, Eye, EyeOff, MessageCircle,
  CalendarClock, ShieldCheck, Zap
} from 'lucide-react';
import { isProUser } from '../monetization';
import { getUserSettings, updateUserSettings, UserSettings, CustomField, getUserProfile } from '../storage';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onBack: () => void;
}

const PLANS = [
  {
    key: 'Mensuel',
    label: 'Mensuel',
    price: '10 000',
    unit: 'FCFA/mois',
    originalPrice: null,
    saving: null,
    featured: false,
    description: 'Idéal pour démarrer',
  },
  {
    key: 'Trimestriel',
    label: 'Trimestriel',
    price: '27 000',
    unit: 'FCFA/trimestre',
    originalPrice: '30 000 FCFA',
    saving: 'Économie de 3 000 FCFA (-10%)',
    featured: true,
    description: 'Le plus populaire',
  },
  {
    key: 'Annuel',
    label: 'Annuel',
    price: '108 000',
    unit: 'FCFA/an',
    originalPrice: '120 000 FCFA',
    saving: 'Économie de 12 000 FCFA (-10%)',
    featured: false,
    description: 'Meilleure valeur',
  },
];

const WA_NUMBER = '074746768';

export default function ProView({ onBack }: Props) {
  const [isPro, setIsPro] = useState(isProUser());
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [proInfo, setProInfo] = useState<{ plan?: string; expiresAt?: string } | null>(null);

  const profile = getUserProfile();

  useEffect(() => {
    setSettings(getUserSettings());
    const s = getUserSettings();
    if (s.isPro && s.proplan) {
      setProInfo({ plan: s.proplan, expiresAt: s.proExpiresAt ?? undefined });
    }
  }, [isPro]);

  const formatExpiry = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const openWA = (plan: string) => {
    const msg = encodeURIComponent(
      `Bonjour, je souhaite souscrire au plan ${plan}. Entreprise : ${profile?.companyName || ''}. Merci !`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  };

  // ─── Gestion des champs personnalisés ───
  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newField: CustomField = { id: uuidv4(), name: newFieldName.trim(), type: newFieldType };
    const updatedFields = [...(settings.customFields || []), newField];
    const updatedOrder = [...(settings.fieldOrder || []), newField.id];
    setSettings(updateUserSettings({ customFields: updatedFields, fieldOrder: updatedOrder }));
    setNewFieldName('');
  };

  const handleRemoveField = (id: string) => {
    const updatedFields = (settings.customFields || []).filter(f => f.id !== id);
    const updatedOrder = (settings.fieldOrder || []).filter(fId => fId !== id);
    const updatedHidden = (settings.hiddenFields || []).filter(fId => fId !== id);
    setSettings(updateUserSettings({ customFields: updatedFields, fieldOrder: updatedOrder, hiddenFields: updatedHidden }));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const order = [...(settings.fieldOrder || [])];
    if (direction === 'up' && index > 0) [order[index - 1], order[index]] = [order[index], order[index - 1]];
    else if (direction === 'down' && index < order.length - 1) [order[index + 1], order[index]] = [order[index], order[index + 1]];
    setSettings(updateUserSettings({ fieldOrder: order }));
  };

  const handleToggleVisibility = (id: string) => {
    const hidden = [...(settings.hiddenFields || [])];
    const newSettings = hidden.includes(id)
      ? updateUserSettings({ hiddenFields: hidden.filter(h => h !== id) })
      : updateUserSettings({ hiddenFields: [...hidden, id] });
    setSettings(newSettings);
  };

  const getFieldInfo = (id: string) => {
    const standard: Record<string, { name: string; type: string }> = {
      date: { name: settings.fieldLabels?.date || 'Date', type: 'date' },
      category: { name: settings.fieldLabels?.category || 'Catégorie', type: 'liste' },
      label: { name: settings.fieldLabels?.label || 'Libellé', type: 'texte' },
      observation: { name: settings.fieldLabels?.observation || 'Observation', type: 'texte long' },
      income: { name: settings.fieldLabels?.income || 'Entrée', type: 'nombre' },
      expense: { name: settings.fieldLabels?.expense || 'Dépense', type: 'nombre' },
      quantity: { name: settings.fieldLabels?.quantity || 'Quantité', type: 'nombre' },
    };
    if (standard[id]) return { ...standard[id], isStandard: true };
    const custom = settings.customFields?.find(f => f.id === id);
    return custom ? { name: custom.name, type: custom.type === 'text' ? 'texte' : 'nombre', isStandard: false } : null;
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 shadow-sm border-b border-neutral-100 text-center">
        <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Crown size={32} strokeWidth={1.5} className="text-white" />
        </div>
        <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Espace PRO</h1>
        {isPro && proInfo?.plan ? (
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-1.5 rounded-full mt-1">
            <ShieldCheck size={13} />
            Plan {proInfo.plan} actif · expire le {formatExpiry(proInfo.expiresAt)}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm max-w-[260px] mx-auto">Personnalisez votre comptabilité à l'infini.</p>
        )}
      </div>

      <div className="px-6 py-8 space-y-6">

        {/* ─── BLOC PRO ACTIF ─── */}
        {isPro ? (
          <>
            {/* Champs personnalisés */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-900 mb-2 flex items-center gap-2">
                <ListPlus size={18} /> Organisation des colonnes
              </h2>
              <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                Ajoutez des champs, réorganisez l'ordre et masquez les colonnes dans vos exports.
              </p>
              <div className="space-y-3 mb-6">
                {(settings.fieldOrder || []).map((fieldId, index) => {
                  const info = getFieldInfo(fieldId);
                  if (!info) return null;
                  const isHidden = (settings.hiddenFields || []).includes(fieldId);
                  return (
                    <div key={fieldId} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isHidden ? 'bg-neutral-100 border-neutral-200 opacity-60' : 'bg-neutral-50 border-neutral-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleMoveField(index, 'up')} disabled={index === 0} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30 p-1"><ArrowUp size={14} /></button>
                          <button onClick={() => handleMoveField(index, 'down')} disabled={index === (settings.fieldOrder?.length || 0) - 1} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30 p-1"><ArrowDown size={14} /></button>
                        </div>
                        <div>
                          <p className={`text-sm font-medium flex items-center gap-2 ${isHidden ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                            {info.name}
                            {info.isStandard && <span className="text-[9px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full uppercase tracking-widest no-underline">Standard</span>}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-neutral-500">{info.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleVisibility(fieldId)} className={`p-2 transition-colors ${isHidden ? 'text-neutral-400 hover:text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}>
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {!info.isStandard && (
                          <button onClick={() => handleRemoveField(fieldId)} className="text-neutral-400 hover:text-danger p-2 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text" value={newFieldName}
                  onChange={e => setNewFieldName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddField()}
                  placeholder="Nom du champ (ex: Client)"
                  className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
                />
                <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as 'text' | 'number')}
                  className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors">
                  <option value="text">Texte</option>
                  <option value="number">Nombre</option>
                </select>
                <button onClick={handleAddField} className="bg-neutral-900 text-white px-4 rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-1 font-medium text-sm">
                  <Plus size={18} /> Valider
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ─── PLANS PRICING ─── */}
            <div className="space-y-3">
              {PLANS.map(plan => (
                <div key={plan.key} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${plan.featured ? 'border-neutral-900' : 'border-neutral-100'}`}>
                  {plan.featured && (
                    <div className="bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1.5">
                      ★ {plan.description}
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-0.5">{plan.label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-neutral-900 font-mono">{plan.price}</span>
                          <span className="text-sm text-neutral-500">{plan.unit}</span>
                        </div>
                        {plan.originalPrice && (
                          <p className="text-xs text-neutral-400 line-through mt-0.5">{plan.originalPrice}</p>
                        )}
                      </div>
                      {plan.saving && (
                        <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg shrink-0 ml-3 text-center leading-tight">
                          {plan.saving.split('(')[0].trim()}<br />
                          <span className="opacity-80">({plan.saving.split('(')[1]}</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openWA(plan.key)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        plan.featured
                          ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                          : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
                      }`}
                    >
                      <MessageCircle size={16} />
                      Souscrire via WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fonctionnalités incluses */}
            <div className="bg-neutral-900 text-white rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Inclus dans tous les plans</p>
              {[
                { icon: <Zap size={16} />, text: 'Transactions illimitées' },
                { icon: <ListPlus size={16} />, text: 'Champs personnalisés illimités' },
                { icon: <CalendarClock size={16} />, text: 'Historique multi-périodes' },
                { icon: <CheckCircle2 size={16} />, text: 'Export Excel sur mesure' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                  <span className="text-green-400">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Comment ça marche */}
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Comment ça marche</p>
              {[
                'Choisissez un plan et cliquez sur "Souscrire via WhatsApp"',
                'Envoyez votre paiement mobile money',
                'Partagez votre preuve de paiement sur WhatsApp au 074 74 67 68',
                'Votre accès Pro est activé sous 24h',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                  <p className="text-sm text-neutral-600">{step}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
