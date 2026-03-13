import { useState, useEffect } from 'react';
import { getAvailableMonths, getTransactions, getUserSettings, getExportHistory, ExportRecord, deleteExportRecord } from '../storage';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, Calendar, FileDown, Share2, Trash2 } from 'lucide-react';
import { exportToExcel } from '../export';

interface Props {
  onSelectMonth: (date: Date) => void;
}

export default function HistoryView({ onSelectMonth }: Props) {
  const [activeTab, setActiveTab] = useState<'months' | 'exports'>('months');
  const [months, setMonths] = useState<string[]>([]);
  const [exports, setExports] = useState<ExportRecord[]>([]);
  const settings = getUserSettings();

  useEffect(() => {
    setMonths(getAvailableMonths());
    setExports(getExportHistory());
  }, []);

  const formatCurrency = (amount: number) => {
    if (settings.currency === 'FCFA') {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA';
    }
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: settings.currency, maximumFractionDigits: 0 }).format(amount);
    } catch (e) {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + settings.currency;
    }
  };

  const handleShareExport = async (record: ExportRecord) => {
    // Re-generate and share without saving to history again
    await exportToExcel(record.transactions, record.periodName, false);
  };

  const handleDeleteExport = (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet export de l\'historique ?')) {
      deleteExportRecord(id);
      setExports(getExportHistory());
    }
  };

  return (
    <div className="pb-24 bg-neutral-100 min-h-screen">
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-neutral-100">
        <h1 className="text-3xl font-light tracking-tight text-neutral-900 mb-2">Historique</h1>
        <p className="text-neutral-500 text-sm mb-6">Retrouvez vos mois précédents et vos exports</p>
        
        {/* Tabs */}
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('months')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'months' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Mois
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'exports' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Exports
          </button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-4">
        {activeTab === 'months' ? (
          months.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <Calendar className="mx-auto mb-4 opacity-50" size={32} strokeWidth={1} />
              <p className="text-sm">Aucun historique disponible</p>
            </div>
          ) : (
            months.map(monthKey => {
              const [_, year, month] = monthKey.split('_');
              const date = new Date(parseInt(year), parseInt(month) - 1);
              const transactions = getTransactions(monthKey);
              
              const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
              const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
              const netBalance = totalIncome - totalExpense;

              return (
                <button
                  key={monthKey}
                  onClick={() => onSelectMonth(date)}
                  className="w-full bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between hover:border-neutral-300 transition-colors text-left group"
                >
                  <div>
                    <h3 className="font-semibold text-neutral-900 capitalize text-lg mb-2">
                      {format(date, 'MMMM yyyy', { locale: fr })}
                    </h3>
                    <div className="flex gap-3 text-xs font-medium">
                      <span className="text-success">+{formatCurrency(totalIncome)}</span>
                      <span className="text-neutral-300">|</span>
                      <span className="text-danger">-{formatCurrency(totalExpense)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1 font-semibold">Solde</p>
                      <p className={`font-mono font-medium text-lg ${netBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(netBalance)}
                      </p>
                    </div>
                    <ChevronRight size={20} strokeWidth={1.5} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                  </div>
                </button>
              );
            })
          )
        ) : (
          exports.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <FileDown className="mx-auto mb-4 opacity-50" size={32} strokeWidth={1} />
              <p className="text-sm">Aucun export récent</p>
            </div>
          ) : (
            exports.map(record => (
              <div key={record.id} className="w-full bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm mb-1">
                    {record.periodName}
                  </h3>
                  <p className="text-xs text-neutral-500 mb-2">
                    Généré le {format(parseISO(record.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-400 truncate max-w-[150px] sm:max-w-[200px]">
                    {record.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleShareExport(record)}
                    className="p-2.5 bg-neutral-100 text-neutral-900 rounded-xl hover:bg-neutral-200 transition-colors"
                  >
                    <Share2 size={18} strokeWidth={2} />
                  </button>
                  <button 
                    onClick={() => handleDeleteExport(record.id)}
                    className="p-2.5 bg-danger-light text-danger rounded-xl hover:bg-danger/20 transition-colors"
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
