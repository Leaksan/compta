import React, { useState, useEffect, useRef } from 'react';
import { Plus, History, Settings, Crown, Download, Upload, TrendingUp, TrendingDown, FileText, Trash2, Edit2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Transaction, getTransactions, getTransactionsForPeriod, getMonthKey, deleteTransaction, getUserSettings, isUserLoggedIn, getUserProfile } from './storage';
import { exportToExcel, importFromExcel } from './export';
import { canAddTransaction, getRemainingTransactions } from './monetization';
import TransactionModal from './components/TransactionModal';
import HistoryView from './components/HistoryView';
import ProView from './components/ProView';
import SettingsView from './components/SettingsView';
import PeriodSelectorModal from './components/PeriodSelectorModal';
import AuthView from './components/AuthView';
import DashboardChart from './components/DashboardChart';
import Logo from './components/Logo';
import InstallPopup from './components/InstallPopup';
import LicenseGate from './components/LicenseGate';

type View = 'dashboard' | 'history' | 'pro' | 'settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(isUserLoggedIn());
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [periodStart, setPeriodStart] = useState(new Date());
  const [periodEnd, setPeriodEnd] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [settings, setSettings] = useState(getUserSettings());
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomPeriod = periodStart.getTime() !== periodEnd.getTime();

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
      setSettings(getUserSettings());
    }
  }, [periodStart, periodEnd, currentView, isAuthenticated]);

  const loadTransactions = () => {
    if (settings.isPro) {
      setTransactions(getTransactionsForPeriod(periodStart, periodEnd));
      
      const diffMonths = (periodEnd.getFullYear() - periodStart.getFullYear()) * 12 + (periodEnd.getMonth() - periodStart.getMonth()) + 1;
      
      const prevStart = subMonths(periodStart, diffMonths);
      const prevEnd = subMonths(periodEnd, diffMonths);
      setPrevTransactions(getTransactionsForPeriod(prevStart, prevEnd));
    } else {
      const monthKey = getMonthKey(periodStart);
      setTransactions(getTransactions(monthKey));

      const prevMonth = subMonths(periodStart, 1);
      const prevMonthKey = getMonthKey(prevMonth);
      setPrevTransactions(getTransactions(prevMonthKey));
    }
  };

  const handleExport = async () => {
    exportToExcel(transactions, periodStart);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importFromExcel(file);
        loadTransactions();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Import failed:', error);
      }
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Supprimer la transaction',
      message: 'Êtes-vous sûr de vouloir supprimer cette transaction ?',
      onConfirm: () => {
        deleteTransaction(id, getMonthKey(periodStart));
        loadTransactions();
        setConfirmModal(null);
      }
    });
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const openNewTransaction = () => {
    if (!canAddTransaction(periodStart.toISOString())) {
      setAlertModal({
        title: 'Limite atteinte',
        message: 'Vous avez atteint la limite de 20 transactions gratuites par mois. Passez au plan PRO pour un usage illimité.'
      });
      return;
    }
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: settings.currency === 'FCFA' ? 'XAF' : settings.currency,
        maximumFractionDigits: 0
      }).format(amount).replace('XAF', 'FCFA').replace('XOF', 'FCFA');
    } catch (e) {
      return `${amount} ${settings.currency}`;
    }
  };

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderDashboard = () => (
    <div className="pb-32">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 rounded-b-[3rem] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <Calendar size={18} />
            </button>
            <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white font-bold text-xs">
              {getUserProfile()?.firstName?.[0] || 'U'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => {
              const newDate = subMonths(periodStart, 1);
              setPeriodStart(newDate);
              setPeriodEnd(newDate);
            }}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-neutral-400" />
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-bold text-neutral-900">
              {isCustomPeriod
                ? `Du ${format(periodStart, 'dd MMM', { locale: fr })} au ${format(periodEnd, 'dd MMM', { locale: fr })}`
                : format(periodStart, 'MMMM yyyy', { locale: fr })
              }
            </h2>
          </div>

          <button
            onClick={() => {
              const newDate = addMonths(periodStart, 1);
              setPeriodStart(newDate);
              setPeriodEnd(newDate);
            }}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} className="text-neutral-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-neutral-900 rounded-3xl p-6 text-white shadow-xl shadow-neutral-200">
            <p className="text-neutral-400 text-xs font-medium uppercase tracking-widest mb-1">Solde Total</p>
            <h1 className="text-3xl font-bold tracking-tight mb-6">{formatCurrency(totals.income - totals.expense)}</h1>
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Entrées</p>
                <p className="text-success font-bold">{formatCurrency(totals.income)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Sorties</p>
                <p className="text-danger-light font-bold">{formatCurrency(totals.expense)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-8">
        <DashboardChart
          transactions={transactions}
          currency={settings.currency}
        />
      </div>

      {/* Transactions */}
      <div className="px-6 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Transactions</h3>
          <div className="flex items-center gap-4">
            {settings.isPro && (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImport}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 hover:opacity-70 transition-opacity"
                  title="Importer des données depuis un fichier Excel"
                >
                  <Upload size={14} strokeWidth={2} />
                  Importer
                </button>
              </>
            )}
            <button 
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 hover:opacity-70 transition-opacity"
            >
              <Download size={14} strokeWidth={2} />
              Exporter
            </button>
          </div>
        </div>

        {/* Freemium Banner */}
        {!settings.isPro && (
          <div className="mb-8 bg-neutral-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
            <div>
              <p className="text-sm font-medium">Plan Gratuit</p>
              <p className="text-xs text-neutral-400 mt-0.5">{getRemainingTransactions(periodStart.toISOString())} transactions restantes</p>
            </div>
            <button onClick={() => setCurrentView('pro')} className="text-xs font-bold bg-white text-neutral-900 px-4 py-2 rounded-xl hover:bg-neutral-100 transition-colors">
              Passer PRO
            </button>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-1">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <FileText size={32} strokeWidth={1} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune transaction pour cette période</p>
            </div>
          ) : (
            transactions.map(t => (
              <div key={t.id} className="group flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    t.type === 'income' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                  }`}>
                    {t.type === 'income' ? <TrendingUp size={18} strokeWidth={2} /> : <TrendingDown size={18} strokeWidth={2} />}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">
                      {t.label || t.category}
                      {t.quantity && t.quantity > 1 && (
                        <span className="text-neutral-400 text-xs ml-1.5 font-normal">x{t.quantity}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">{t.category}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-300"></span>
                      <span className="text-[10px] text-neutral-500">{format(parseISO(t.date), 'dd MMM', { locale: fr })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className={`font-mono font-medium text-sm ${t.type === 'income' ? 'text-success' : 'text-neutral-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <div className="flex gap-2 mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(t)} className="text-neutral-400 hover:text-neutral-900 p-1"><Edit2 size={12} /></button>
                      <button onClick={() => handleDelete(t.id)} className="text-neutral-400 hover:text-danger p-1"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button 
        onClick={openNewTransaction}
        className="fixed bottom-24 right-6 w-14 h-14 bg-neutral-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-neutral-800 transition-transform active:scale-95 z-30"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <LicenseGate onSuccess={() => setSettings(getUserSettings())}>
      <div className="min-h-screen bg-neutral-100 max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'history' && <HistoryView onSelectMonth={(d) => { setPeriodStart(d); setPeriodEnd(d); setCurrentView('dashboard'); }} />}
          {currentView === 'pro' && <ProView onBack={() => setCurrentView('dashboard')} />}
          {currentView === 'settings' && <SettingsView onBack={() => setCurrentView('dashboard')} />}
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-neutral-100 px-6 py-4 flex justify-between items-center z-40 pb-safe">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'dashboard' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
            <FileText size={20} strokeWidth={currentView === 'dashboard' ? 2.5 : 1.5} />
            <span className="text-[9px] font-semibold uppercase tracking-widest">Mois</span>
          </button>
          <button onClick={() => setCurrentView('history')} className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'history' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
            <History size={20} strokeWidth={currentView === 'history' ? 2.5 : 1.5} />
            <span className="text-[9px] font-semibold uppercase tracking-widest">Histo</span>
          </button>
          <button onClick={() => setCurrentView('pro')} className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'pro' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
            <Crown size={20} strokeWidth={currentView === 'pro' ? 2.5 : 1.5} />
            <span className="text-[9px] font-semibold uppercase tracking-widest">Pro</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === 'settings' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
            <Settings size={20} strokeWidth={currentView === 'settings' ? 2.5 : 1.5} />
            <span className="text-[9px] font-semibold uppercase tracking-widest">Param</span>
          </button>
        </nav>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={() => { setIsModalOpen(false); loadTransactions(); }}
          transaction={editingTransaction}
          currentDate={periodStart}
        />

        <PeriodSelectorModal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          onApply={(start, end) => {
            setPeriodStart(start);
            setPeriodEnd(end);
          }}
          currentStart={periodStart}
          currentEnd={periodEnd}
        />

        {/* Custom Confirm Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-neutral-600 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Modal */}
        {alertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{alertModal.title}</h3>
              <p className="text-sm text-neutral-600 mb-6">{alertModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setAlertModal(null)}
                  className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Install popup Android */}
        <InstallPopup />
      </div>
    </LicenseGate>
  );
}
