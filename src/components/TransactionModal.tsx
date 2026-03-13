import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Transaction, TransactionType, saveTransaction, updateTransaction, getMonthKey, PREDEFINED_CATEGORIES, getUserSettings } from '../storage';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  transaction: Transaction | null;
  currentDate: Date;
}

export default function TransactionModal({ isOpen, onClose, onSave, transaction, currentDate }: Props) {
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [observation, setObservation] = useState('');
  const [date, setDate] = useState(format(currentDate, 'yyyy-MM-dd'));
  const [customData, setCustomData] = useState<Record<string, string | number>>({});
  
  const settings = getUserSettings();

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setLabel(transaction.label);
      setCategory(transaction.category);
      setObservation(transaction.observation || '');
      setDate(transaction.date);
      setCustomData(transaction.customData || {});
    } else {
      setType('income');
      setAmount('');
      setLabel('');
      setCategory(PREDEFINED_CATEGORIES.income[0]);
      setObservation('');
      setDate(format(currentDate, 'yyyy-MM-dd'));
      setCustomData({});
    }
  }, [transaction, isOpen, currentDate]);

  useEffect(() => {
    if (!transaction) {
      setCategory(PREDEFINED_CATEGORIES[type][0]);
    }
  }, [type, transaction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hiddenFields = settings.hiddenFields || [];
    const isAmountRequired = !hiddenFields.includes('income') || !hiddenFields.includes('expense');
    const parsedAmount = parseFloat(amount);

    if (isAmountRequired && (!amount || isNaN(parsedAmount) || parsedAmount <= 0)) {
      alert("Veuillez saisir un montant (Entrée ou Dépense).");
      return;
    }

    const transactionData = {
      type,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      label,
      category,
      observation,
      date,
      customData
    };

    if (transaction) {
      updateTransaction(transaction.id, getMonthKey(transaction.date), transactionData);
    } else {
      saveTransaction(transactionData);
    }
    
    onSave();
  };

  const categories = [...PREDEFINED_CATEGORIES[type], 'Autre'];
  const fieldOrder = settings.fieldOrder || ['date', 'category', 'label', 'observation', 'income', 'expense'];
  const hiddenFields = settings.hiddenFields || [];
  const visibleFields = fieldOrder.filter(id => !hiddenFields.includes(id));

  const renderField = (fieldId: string) => {
    switch (fieldId) {
      case 'income':
        return (
          <div key="income">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-success mb-2">Entrée</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={type === 'income' ? amount : ''}
                onChange={(e) => {
                  setType('income');
                  setAmount(e.target.value);
                }}
                className="w-full bg-transparent border-b-2 border-neutral-100 px-0 py-2 text-4xl font-mono font-light text-success focus:outline-none focus:border-success transition-colors placeholder:text-neutral-200"
                placeholder="0"
              />
              <span className="absolute right-0 bottom-4 text-neutral-400 font-medium text-lg">
                {settings.currency}
              </span>
            </div>
          </div>
        );
      case 'expense':
        return (
          <div key="expense">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-danger mb-2">Dépense</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={type === 'expense' ? amount : ''}
                onChange={(e) => {
                  setType('expense');
                  setAmount(e.target.value);
                }}
                className="w-full bg-transparent border-b-2 border-neutral-100 px-0 py-2 text-4xl font-mono font-light text-danger focus:outline-none focus:border-danger transition-colors placeholder:text-neutral-200"
                placeholder="0"
              />
              <span className="absolute right-0 bottom-4 text-neutral-400 font-medium text-lg">
                {settings.currency}
              </span>
            </div>
          </div>
        );
      case 'label':
        return (
          <div key="label">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Libellé</label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
              placeholder="Ex: Vente de chaussures"
            />
          </div>
        );
      case 'category':
        return (
          <div key="category">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all appearance-none"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        );
      case 'date':
        return (
          <div key="date">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            />
          </div>
        );
      case 'observation':
        return (
          <div key="observation">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Observation (Optionnel)</label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all resize-none"
              rows={2}
              placeholder="Détails supplémentaires..."
            />
          </div>
        );
      default:
        const field = settings.customFields?.find(f => f.id === fieldId);
        if (!field) return null;
        return (
          <div key={field.id}>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">{field.name}</label>
            <input
              type={field.type}
              value={customData[field.id] || ''}
              onChange={(e) => setCustomData({...customData, [field.id]: e.target.value})}
              className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
              placeholder={`Saisir ${field.name.toLowerCase()}`}
            />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-semibold text-neutral-900">
            {transaction ? 'Modifier' : 'Nouvelle'} transaction
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {visibleFields.map(renderField)}

          <button
            type="submit"
            className="w-full bg-neutral-900 text-white font-semibold py-4 rounded-xl mt-8 hover:bg-neutral-800 transition-colors active:scale-95"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}
