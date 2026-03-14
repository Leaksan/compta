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
      setTransactions(getTransactions(getMonthKey(periodStart)));
      setPrevTransactions(getTransactions(getMonthKey(subMonths(periodStart, 1))));
    }
  };

  const handlePrevMonth = () => {
    setPeriodStart(subMonths(periodStart, 1));
    setPeriodEnd(subMonths(periodEnd, 1));
  };
  
  const handleNextMonth = () => {
    setPeriodStart(addMonths(periodStart, 1));
    setPeriodEnd(addMonths(periodEnd, 1));
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const prevTotalIncome = prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const prevTotalExpense = prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const prevNetBalance = prevTotalIncome - prevTotalExpense;

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

  const getPerformanceObservation = () => {
    if (transactions.length === 0 && prevTransactions.length === 0) return null;
    if (transactions.length === 0) {
      return {
        text: `Nouveau mois, nouveau départ ! Ajoutez vos premières transactions pour commencer l'analyse.`,
        type: 'neutral'
      };
    }
    
    const today = new Date();
    const isCurrentMonth = periodStart.getMonth() === today.getMonth() && periodStart.getFullYear() === today.getFullYear();
    const showBalanceComparison = !isCurrentMonth || today.getDate() > 21;

    const isSameMonth = periodStart.getMonth() === periodEnd.getMonth() && periodStart.getFullYear() === periodEnd.getFullYear();
    const prevPeriodText = isSameMonth 
      ? `au mois de ${format(subMonths(periodStart, 1), 'MMMM', { locale: fr })}`
      : `à la période précédente`;

    const getCategoryTotals = (txs: Transaction[], type: 'income' | 'expense') => {
      return txs.filter(t => t.type === type).reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    };

    const currentIncomeByCategory = getCategoryTotals(transactions, 'income');
    const prevIncomeByCategory = getCategoryTotals(prevTransactions, 'income');
    const currentExpenseByCategory = getCategoryTotals(transactions, 'expense');
    const prevExpenseByCategory = getCategoryTotals(prevTransactions, 'expense');

    interface Insight {
      text: string;
      type: 'positive' | 'negative' | 'neutral';
      score: number;
    }
    const insights: Insight[] = [];

    // 1. Balance Comparison (Only if allowed)
    if (showBalanceComparison) {
      if (prevTransactions.length === 0) {
        if (netBalance > 0) {
          insights.push({ text: `C'est un excellent mois ! Vous avez réalisé ${formatCurrency(netBalance)} de bénéfice.`, type: 'positive', score: 100 });
        } else if (netBalance < 0) {
          insights.push({ text: `Attention, vos dépenses ont dépassé vos revenus de ${formatCurrency(Math.abs(netBalance))}.`, type: 'negative', score: 100 });
        }
      } else {
        const diff = netBalance - prevNetBalance;
        if (diff > 0) {
          insights.push({ text: `Bravo ! Votre solde s'est amélioré de ${formatCurrency(diff)} par rapport ${prevPeriodText}.`, type: 'positive', score: 100 });
        } else if (diff < 0) {
          insights.push({ text: `Attention, votre solde a baissé de ${formatCurrency(Math.abs(diff))} par rapport ${prevPeriodText}.`, type: 'negative', score: 100 });
        } else {
          insights.push({ text: `Votre solde est stable par rapport ${prevPeriodText}.`, type: 'neutral', score: 100 });
        }
      }
    }

    // 2. Category Insights
    Object.keys(currentIncomeByCategory).forEach(cat => {
      const current = currentIncomeByCategory[cat];
      const prev = prevIncomeByCategory[cat] || 0;
      if (prev > 0 && current > prev) {
        const growth = current - prev;
        const percent = (growth / prev) * 100;
        if (percent > 50) {
          insights.push({ text: `Excellente nouvelle ! Vos revenus en "${cat}" ont explosé (+${formatCurrency(growth)}). Continuez comme ça !`, type: 'positive', score: 90 + Math.min(percent/100, 9) });
        } else {
          insights.push({ text: `Belle progression ! Vos revenus en "${cat}" ont augmenté de ${formatCurrency(growth)} par rapport ${prevPeriodText}.`, type: 'positive', score: 70 + Math.min(percent/100, 9) });
        }
      }
    });

    Object.keys(prevExpenseByCategory).forEach(cat => {
      const prev = prevExpenseByCategory[cat];
      const current = currentExpenseByCategory[cat] || 0;
      if (prev > 0 && current < prev) {
        const reduction = prev - current;
        const percent = (reduction / prev) * 100;
        if (percent > 20 && current > 0) {
          insights.push({ text: `Super effort ! Vos dépenses en "${cat}" ont baissé de ${formatCurrency(reduction)}. Belle gestion !`, type: 'positive', score: 80 + Math.min(percent/100, 9) });
        } else if (current === 0) {
          insights.push({ text: `Parfait ! Vous n'avez fait aucune dépense en "${cat}" pour le moment, contre ${formatCurrency(prev)} ${prevPeriodText}.`, type: 'positive', score: 85 });
        }
      }
    });

    Object.keys(currentExpenseByCategory).forEach(cat => {
      const current = currentExpenseByCategory[cat];
      const prev = prevExpenseByCategory[cat] || 0;
      if (prev > 0 && current > prev) {
        const spike = current - prev;
        const percent = (spike / prev) * 100;
        if (percent > 30) {
          insights.push({ text: `Attention, vos dépenses en "${cat}" ont fortement augmenté (+${formatCurrency(spike)}). Gardez un œil dessus.`, type: 'negative', score: 75 + Math.min(percent/100, 9) });
        }
      }
    });

    // 3. General Motivation (Fallbacks)
    if (totalExpense === 0 && totalIncome > 0) {
      insights.push({ text: `Zéro dépense enregistrée pour le moment, belle épargne en perspective !`, type: 'positive', score: 60 });
    }

    const topIncome = Object.entries(currentIncomeByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topIncome) {
      insights.push({ text: `La catégorie "${topIncome[0]}" est votre meilleure source de revenus ce mois-ci (${formatCurrency(topIncome[1])}).`, type: 'positive', score: 50 });
    }

    const topExpense = Object.entries(currentExpenseByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topExpense) {
      insights.push({ text: `Votre principale dépense ce mois-ci est "${topExpense[0]}" (${formatCurrency(topExpense[1])}).`, type: 'neutral', score: 40 });
    }

    if (transactions.length > prevTransactions.length && prevTransactions.length > 0) {
      insights.push({ text: `Vous êtes très actif ce mois-ci (${transactions.length} transactions), super suivi de vos finances !`, type: 'positive', score: 30 });
    }

    if (insights.length === 0) {
      return {
        text: `Commencez à ajouter des transactions pour voir votre analyse de performance.`,
        type: 'neutral'
      };
    }

    insights.sort((a, b) => b.score - a.score);
    
    // Rotate among the top insights (within 20 points of the best one)
    const topScore = insights[0].score;
    const topInsights = insights.filter(i => i.score >= topScore - 20);
    const selectedIndex = today.getDate() % topInsights.length;
    
    const selectedInsight = topInsights[selectedIndex];
    return { text: selectedInsight.text, type: selectedInsight.type };
  };

  const observation = getPerformanceObservation();

  const getPeriodName = () => {
    const startStr = format(periodStart, 'MMM yyyy', { locale: fr });
    const endStr = format(periodEnd, 'MMM yyyy', { locale: fr });
    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  };

  const handleExport = () => {
    const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0);
    const startStr = format(start, 'dd MMMM yyyy', { locale: fr });
    const endStr = format(end, 'dd MMMM yyyy', { locale: fr });
    const exportPeriodName = start.getTime() === end.getTime() ? startStr : `Du ${startStr} au ${endStr}`;
    exportToExcel(transactions, exportPeriodName);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setConfirmModal({
      isOpen: true,
      title: "Importer des données",
      message: "Attention : L'importation va écraser vos paramètres actuels et ajouter les transactions du fichier. Voulez-vous continuer ?",
      onConfirm: async () => {
        setConfirmModal(null);
        const result = await importFromExcel(file);
        setAlertModal({
          isOpen: true,
          title: result.success ? "Succès" : "Erreur",
          message: result.message || (result.success ? "Importation réussie !" : "Erreur lors de l'importation.")
        });
        if (result.success) {
          setSettings(getUserSettings());
          loadTransactions();
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer",
      message: "Voulez-vous vraiment supprimer cette transaction ?",
      onConfirm: () => {
        const t = transactions.find(t => t.id === id);
        if (t) {
          deleteTransaction(id, getMonthKey(t.date));
          loadTransactions();
        }
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
      setCurrentView('pro');
      return;
    }
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const profile = getUserProfile();
    const name = profile?.firstName || '';
    if (hour < 18) {
      return `Bonjour ${name}`;
    }
    return `Bonsoir ${name}`;
  };

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderDashboard = () => (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-8 shadow-sm border-b border-neutral-100">
        <div className="flex items-center justify-between mb-6">
          <Logo className="w-8 h-8 text-neutral-900" textClassName="text-xl font-bold text-neutral-900" />
          <h2 className="text-sm font-medium text-neutral-500">{getGreeting()} 👋</h2>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <button onClick={handlePrevMonth} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          
          <button 
            onClick={() => settings.isPro && setIsPeriodModalOpen(true)}
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${settings.isPro ? 'text-neutral-900 hover:opacity-70' : 'text-neutral-500 cursor-default'}`}
          >
            {getPeriodName()}
            {settings.isPro && <Calendar size={14} className="text-neutral-400" />}
          </button>
          
          <button onClick={handleNextMonth} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <ChevronRight size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="text-center mb-10">
          <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2 font-medium">Solde Net</p>
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 font-mono">
            {formatCurrency(netBalance)}
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
              <span className="text-[10px] font-semibold uppercase tracking-widest">{settings.fieldLabels?.income || 'Entrées'}</span>
            </div>
            <p className="font-mono text-lg font-medium text-neutral-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-danger"></div>
              <span className="text-[10px] font-semibold uppercase tracking-widest">{settings.fieldLabels?.expense || 'Dépenses'}</span>
            </div>
            <p className="font-mono text-lg font-medium text-neutral-900">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        {/* Animated Chart */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Performances</h3>
          
          {observation && (
            <div className={`border rounded-xl p-4 mb-4 flex items-start gap-3 ${
              observation.type === 'positive' ? 'bg-success-light border-success/20 text-success' :
              observation.type === 'negative' ? 'bg-danger-light border-danger/20 text-danger' :
              'bg-neutral-50 border-neutral-100 text-neutral-700'
            }`}>
              <div className="mt-0.5">
                {observation.type === 'positive' ? <TrendingUp size={18} /> :
                 observation.type === 'negative' ? <TrendingDown size={18} /> :
                 <TrendingUp size={18} className="opacity-50" />}
              </div>
              <p className="text-sm leading-relaxed font-medium">
                {observation.text}
              </p>
            </div>
          )}

          <DashboardChart transactions={transactions} currency={settings.currency} fieldLabels={settings.fieldLabels} />
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-8">
        <div className="flex justify-between items-center mb-6">
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
    </div>
  );
}
