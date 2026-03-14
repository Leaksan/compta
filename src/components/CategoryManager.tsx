import React, { useState } from 'react';
import { Plus, Trash2, Tag, Edit2, Check, X } from 'lucide-react';
import { TransactionType, updateTransactionsCategory } from '../storage';

interface Props {
  categories: { income: string[]; expense: string[] };
  onChange: (categories: { income: string[]; expense: string[] }) => void;
  fieldLabels?: Record<string, string>;
}

export default function CategoryManager({ categories, onChange, fieldLabels }: Props) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>('income');
  const [editingCategory, setEditingCategory] = useState<{ name: string; type: TransactionType } | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const name = newCategoryName.trim();
    if (!name || categories[newCategoryType].includes(name)) return;
    
    onChange({
      ...categories,
      [newCategoryType]: [...categories[newCategoryType], name]
    });
    setNewCategoryName('');
  };

  const handleDelete = (name: string, type: TransactionType) => {
    onChange({
      ...categories,
      [type]: categories[type].filter(c => c !== name)
    });
  };

  const startEdit = (name: string, type: TransactionType) => {
    setEditingCategory({ name, type });
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditName('');
  };

  const saveEdit = (oldName: string, type: TransactionType) => {
    const newName = editName.trim();
    if (!newName || newName === oldName || categories[type].includes(newName)) {
      cancelEdit();
      return;
    }

    // Update transactions with the new category name
    updateTransactionsCategory(oldName, newName);

    // Update category list
    onChange({
      ...categories,
      [type]: categories[type].map(c => c === oldName ? newName : c)
    });
    cancelEdit();
  };

  const incomes = categories.income;
  const expenses = categories.expense;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nouvelle catégorie..."
          className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
        />
        <select
          value={newCategoryType}
          onChange={(e) => setNewCategoryType(e.target.value as TransactionType)}
          className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all appearance-none"
        >
          <option value="income">{fieldLabels?.income || 'Entrée'}</option>
          <option value="expense">{fieldLabels?.expense || 'Dépense'}</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={!newCategoryName.trim()}
          className="bg-neutral-900 text-white p-3 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-success mb-3">{fieldLabels?.income ? fieldLabels.income + 's' : 'Entrées'}</h3>
          {incomes.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">Aucune catégorie</p>
          ) : (
            <ul className="space-y-2">
              {incomes.map(c => (
                <li key={c} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  {editingCategory?.name === c && editingCategory?.type === 'income' ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white border border-neutral-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-neutral-900"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(c, 'income')} className="text-success hover:text-success-light p-1"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-neutral-400 hover:text-neutral-600 p-1"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-700 flex items-center gap-2">
                        <Tag size={14} className="text-success" />
                        {c}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(c, 'income')} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c, 'income')} className="text-neutral-400 hover:text-danger transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-danger mb-3">{fieldLabels?.expense ? fieldLabels.expense + 's' : 'Dépenses'}</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">Aucune catégorie</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map(c => (
                <li key={c} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  {editingCategory?.name === c && editingCategory?.type === 'expense' ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white border border-neutral-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-neutral-900"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(c, 'expense')} className="text-success hover:text-success-light p-1"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-neutral-400 hover:text-neutral-600 p-1"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-700 flex items-center gap-2">
                        <Tag size={14} className="text-danger" />
                        {c}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(c, 'expense')} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c, 'expense')} className="text-neutral-400 hover:text-danger transition-colors p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
