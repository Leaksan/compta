import { useState, useEffect } from 'react';
import { Crown, ListPlus, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { isProUser } from '../monetization';
import { getUserSettings, updateUserSettings, UserSettings, CustomField } from '../storage';
import { v4 as uuidv4 } from 'uuid';
import PaymentView from './PaymentView';

interface Props {
  onBack: () => void;
}

export default function ProView({ onBack }: Props) {
  const [isPro, setIsPro] = useState(isProUser());
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');

  useEffect(() => {
    const pro = isProUser();
    setIsPro(pro);
    if (pro) setSettings(getUserSettings());
  }, []);

  // ─── Non-pro → show payment page ──────────────────────────────────────────
  if (!isPro) {
    return <PaymentView onBack={onBack} />;
  }

  // ─── Pro user UI ──────────────────────────────────────────────────────────
  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newField: CustomField = { id: uuidv4(), name: newFieldName.trim(), type: newFieldType };
    const updatedFields = [...(settings.customFields || []), newField];
    const updatedOrder = [...(settings.fieldOrder || []), newField.id];
    setSettings(updateUserSettings({ customFields: updatedFields, fieldOrder: updatedOrder }));
    setNewFieldName('');
  };

  const handleRemoveField = (id: string) => {
    setSettings(updateUserSettings({
      customFields: (settings.customFields || []).filter(f => f.id !== id),
      fieldOrder: (settings.fieldOrder || []).filter(fId => fId !== id),
      hiddenFields: (settings.hiddenFields || []).filter(fId => fId !== id),
    }));
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
    <div className="min-h-screen bg-neutral-100 pb-24 md:pb-8">
      <div className="bg-white px-6 pt-12 pb-8 shadow-sm border-b border-neutral-100">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-700 text-sm mb-4 transition-colors md:hidden">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Crown size={28} strokeWidth={1.5} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900">Espace PRO</h1>
              <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Actif</span>
            </div>
            <p className="text-neutral-500 text-sm mt-0.5">Personnalisez votre comptabilité à l'infini.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-900 mb-2 flex items-center gap-2">
            <ListPlus size={18} /> Organisation des colonnes
          </h2>
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            Ajoutez des champs, réorganisez l'ordre et masquez les colonnes inutiles dans votre export Excel.
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
                      <button onClick={() => handleMoveField(index, 'up')} disabled={index === 0} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20 p-1"><ArrowUp size={14} /></button>
                      <button onClick={() => handleMoveField(index, 'down')} disabled={index === (settings.fieldOrder?.length || 0) - 1} className="text-neutral-400 hover:text-neutral-900 disabled:opacity-20 p-1"><ArrowDown size={14} /></button>
                    </div>
                    <div>
                      <p className={`text-sm font-medium flex items-center gap-2 ${isHidden ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                        {info.name}
                        {info.isStandard && <span className="text-[9px] bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Standard</span>}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{info.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleVisibility(fieldId)} className={`p-2 transition-colors ${isHidden ? 'text-neutral-400' : 'text-neutral-500'} hover:text-neutral-900`}>
                      {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {!info.isStandard && (
                      <button onClick={() => handleRemoveField(fieldId)} className="text-neutral-400 hover:text-red-500 p-2 transition-colors">
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
              type="text"
              value={newFieldName}
              onChange={e => setNewFieldName(e.target.value)}
              placeholder="Nom du champ (ex: Client)"
              className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleAddField()}
            />
            <select
              value={newFieldType}
              onChange={e => setNewFieldType(e.target.value as 'text' | 'number')}
              className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-neutral-900"
            >
              <option value="text">Texte</option>
              <option value="number">Nombre</option>
            </select>
            <button onClick={handleAddField} className="bg-neutral-900 text-white px-4 rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-1 font-medium text-sm">
              <Plus size={18} /> Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
