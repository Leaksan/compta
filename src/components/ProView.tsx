import { useState, useEffect } from 'react';
import { Crown, CheckCircle2, Star, ListPlus, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { isProUser } from '../monetization';
import { getUserSettings, updateUserSettings, UserSettings, CustomField } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import PaymentView from './PaymentView';

interface Props { onBack: () => void; }

export default function ProView({ onBack }: Props) {
  const [isPro, setIsPro] = useState(isProUser());
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    setSettings(getUserSettings());
    setIsPro(isProUser());
  }, [isPro]);

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
    setSettings(updateUserSettings({
      hiddenFields: hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]
    }));
  };

  const getFieldInfo = (id: string) => {
    const standard: Record<string, { name: string; type: string }> = {
      'date': { name: settings.fieldLabels?.date || 'Date', type: 'date' },
      'category': { name: settings.fieldLabels?.category || 'Catégorie', type: 'liste' },
      'label': { name: settings.fieldLabels?.label || 'Libellé', type: 'texte' },
      'observation': { name: settings.fieldLabels?.observation || 'Observation', type: 'texte long' },
      'income': { name: settings.fieldLabels?.income || 'Entrée', type: 'nombre' },
      'expense': { name: settings.fieldLabels?.expense || 'Dépense', type: 'nombre' },
      'quantity': { name: settings.fieldLabels?.quantity || 'Quantité', type: 'nombre' }
    };
    if (standard[id]) return { ...standard[id], isStandard: true };
    const custom = settings.customFields?.find(f => f.id === id);
    return custom ? { name: custom.name, type: custom.type === 'text' ? 'texte' : 'nombre', isStandard: false } : null;
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-100 pb-24">
        <div className="bg-white px-6 pt-12 pb-8 shadow-sm border-b border-neutral-100 text-center">
          <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Crown size={32} strokeWidth={1.5} className="text-white" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-3">Espace PRO</h1>
          <p className="text-neutral-500 text-sm max-w-[250px] mx-auto">Personnalisez votre comptabilité à l'infini.</p>
        </div>

        <div className="px-6 py-8 relative">
          {/* PRO Features (blurred if not pro) */}
          <div className={`space-y-6 ${!isPro ? 'opacity-30 pointer-events-none select-none blur-[1px]' : ''}`}>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-900 mb-2 flex items-center gap-2">
                <ListPlus size={18} /> Organisation des colonnes
              </h2>
              <p className="text-xs text-neutral-500 mb-6 leading-relaxed">Ajoutez des champs, réorganisez l'ordre et masquez les colonnes dans votre export Excel.</p>
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
                          <button onClick={() => handleRemoveField(fieldId)} className="text-neutral-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                  placeholder="Nom du champ (ex: Client)"
                  className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors" />
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
          </div>

          {/* Paywall overlay */}
          {!isPro && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6">
              <div className="bg-neutral-900 text-white rounded-[2rem] shadow-2xl p-8 w-full relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <h2 className="font-semibold text-lg mb-6 flex items-center gap-3 relative z-10">
                  <Star size={20} className="text-yellow-400 fill-yellow-400" /> Débloquer PRO
                </h2>
                <ul className="space-y-4 mb-8 relative z-10">
                  {['Champs personnalisés illimités', 'Transactions illimitées', 'Export Excel sur mesure', 'Analyse multi-périodes'].map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <CheckCircle2 size={20} strokeWidth={1.5} className="text-green-400 shrink-0" />
                      <p className="text-sm text-neutral-200">{f}</p>
                    </li>
                  ))}
                </ul>
                <div className="relative z-10">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-white text-neutral-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-100 transition-colors active:scale-95"
                  >
                    <Crown size={20} className="text-yellow-500" />
                    Voir les offres d'abonnement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPayment && <PaymentView onClose={() => setShowPayment(false)} />}
    </>
  );
}
