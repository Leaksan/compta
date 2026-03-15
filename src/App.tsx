import React, { useState, useEffect, useRef } from 'react';
import { Plus, History, Settings, Crown, Download, Upload, TrendingUp, TrendingDown, FileText, Trash2, Edit2, ChevronLeft, ChevronRight, Calendar, Share2, Smartphone } from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Transaction, getTransactions, getTransactionsForPeriod, getMonthKey, deleteTransaction, getUserSettings, isUserLoggedIn, getUserProfile, logoutUser } from './storage';
import { exportToExcel, importFromExcel } from './export';
import { canAddTransaction, getRemainingTransactions, syncProStatus } from './monetization';
import TransactionModal from './components/TransactionModal';
import HistoryView from './components/HistoryView';
import ProView from './components/ProView';
import SettingsView from './components/SettingsView';
import PeriodSelectorModal from './components/PeriodSelectorModal';
import AuthView from './components/AuthView';
import DashboardChart from './components/DashboardChart';
import Logo from './components/Logo';
import InstallPopup from './components/InstallPopup';
import PaymentView from './components/PaymentView';

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
  const [showPayment, setShowPayment] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustomPeriod = periodStart.getTime() !== periodEnd.getTime();

  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
      setSettings(getUserSettings());
      syncProStatus().then(() => setSettings(getUserSettings()));
    }
  }, [periodStart, periodEnd, currentView, isAuthenticated]);

  const loadTransactions = () => {
    const s = getUserSettings();
    if (s.isPro) {
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

  const handlePrevMonth = () => { setPeriodStart(subMonths(periodStart, 1)); setPeriodEnd(subMonths(periodEnd, 1)); };
  const handleNextMonth = () => { setPeriodStart(addMonths(periodStart, 1)); setPeriodEnd(addMonths(periodEnd, 1)); };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const prevTotalIncome = prevTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const prevTotalExpense = prevTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const prevNetBalance = prevTotalIncome - prevTotalExpense;

  const formatCurrency = (amount: number) => {
    if (settings.currency === 'FCFA') return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA';
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: settings.currency, maximumFractionDigits: 0 }).format(amount); }
    catch { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + settings.currency; }
  };

  const getPerformanceObservation = () => {
    if (transactions.length === 0 && prevTransactions.length === 0) return null;
    if (transactions.length === 0) return { text: `Nouveau mois, nouveau départ ! Ajoutez vos premières transactions pour commencer l'analyse.`, type: 'neutral' };
    const today = new Date();
    const isCurrentMonth = periodStart.getMonth() === today.getMonth() && periodStart.getFullYear() === today.getFullYear();
    const showBalanceComparison = !isCurrentMonth || today.getDate() > 21;
    const isSameMonth = periodStart.getMonth() === periodEnd.getMonth() && periodStart.getFullYear() === periodEnd.getFullYear();
    const prevPeriodText = isSameMonth ? `au mois de ${format(subMonths(periodStart, 1), 'MMMM', { locale: fr })}` : `à la période précédente`;
    const getCategoryTotals = (txs: Transaction[], type: 'income' | 'expense') => txs.filter(t => t.type === type).reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>);
    const currentIncomeByCategory = getCategoryTotals(transactions, 'income');
    const prevIncomeByCategory = getCategoryTotals(prevTransactions, 'income');
    const currentExpenseByCategory = getCategoryTotals(transactions, 'expense');
    const prevExpenseByCategory = getCategoryTotals(prevTransactions, 'expense');
    interface Insight { text: string; type: 'positive' | 'negative' | 'neutral'; score: number; }
    const insights: Insight[] = [];
    if (showBalanceComparison) {
      if (prevTransactions.length === 0) {
        if (netBalance > 0) insights.push({ text: `C'est un excellent mois ! Vous avez réalisé ${formatCurrency(netBalance)} de bénéfice.`, type: 'positive', score: 100 });
        else if (netBalance < 0) insights.push({ text: `Attention, vos dépenses ont dépassé vos revenus de ${formatCurrency(Math.abs(netBalance))}.`, type: 'negative', score: 100 });
      } else {
        const diff = netBalance - prevNetBalance;
        if (diff > 0) insights.push({ text: `Bravo ! Votre solde s'est amélioré de ${formatCurrency(diff)} par rapport ${prevPeriodText}.`, type: 'positive', score: 100 });
        else if (diff < 0) insights.push({ text: `Attention, votre solde a baissé de ${formatCurrency(Math.abs(diff))} par rapport ${prevPeriodText}.`, type: 'negative', score: 100 });
        else insights.push({ text: `Votre solde est stable par rapport ${prevPeriodText}.`, type: 'neutral', score: 100 });
      }
    }
    Object.keys(currentIncomeByCategory).forEach(cat => {
      const current = currentIncomeByCategory[cat]; const prev = prevIncomeByCategory[cat] || 0;
      if (prev > 0 && current > prev) { const growth = current - prev; const percent = (growth / prev) * 100;
        if (percent > 50) insights.push({ text: `Excellente nouvelle ! Vos revenus en "${cat}" ont explosé (+${formatCurrency(growth)}). Continuez !`, type: 'positive', score: 90 + Math.min(percent / 100, 9) });
        else insights.push({ text: `Belle progression ! Vos revenus en "${cat}" ont augmenté de ${formatCurrency(growth)} par rapport ${prevPeriodText}.`, type: 'positive', score: 70 + Math.min(percent / 100, 9) });
      }
    });
    Object.keys(prevExpenseByCategory).forEach(cat => {
      const prev = prevExpenseByCategory[cat]; const current = currentExpenseByCategory[cat] || 0;
      if (prev > 0 && current < prev) { const reduction = prev - current; const percent = (reduction / prev) * 100;
        if (percent > 20 && current > 0) insights.push({ text: `Super effort ! Vos dépenses en "${cat}" ont baissé de ${formatCurrency(reduction)}. Belle gestion !`, type: 'positive', score: 80 + Math.min(percent / 100, 9) });
        else if (current === 0) insights.push({ text: `Parfait ! Aucune dépense en "${cat}" pour le moment, contre ${formatCurrency(prev)} ${prevPeriodText}.`, type: 'positive', score: 85 });
      }
    });
    Object.keys(currentExpenseByCategory).forEach(cat => {
      const current = currentExpenseByCategory[cat]; const prev = prevExpenseByCategory[cat] || 0;
      if (prev > 0 && current > prev) { const spike = current - prev; const percent = (spike / prev) * 100;
        if (percent > 30) insights.push({ text: `Attention, vos dépenses en "${cat}" ont fortement augmenté (+${formatCurrency(spike)}). Gardez un œil dessus.`, type: 'negative', score: 75 + Math.min(percent / 100, 9) });
      }
    });
    if (totalExpense === 0 && totalIncome > 0) insights.push({ text: `Zéro dépense enregistrée pour le moment, belle épargne en perspective !`, type: 'positive', score: 60 });
    const topIncome = Object.entries(currentIncomeByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topIncome) insights.push({ text: `La catégorie "${topIncome[0]}" est votre meilleure source de revenus ce mois-ci (${formatCurrency(topIncome[1])}).`, type: 'positive', score: 50 });
    const topExpense = Object.entries(currentExpenseByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topExpense) insights.push({ text: `Votre principale dépense ce mois-ci est "${topExpense[0]}" (${formatCurrency(topExpense[1])}).`, type: 'neutral', score: 40 });
    if (transactions.length > prevTransactions.length && prevTransactions.length > 0) insights.push({ text: `Vous êtes très actif ce mois-ci (${transactions.length} transactions), super suivi !`, type: 'positive', score: 30 });
    if (insights.length === 0) return { text: `Commencez à ajouter des transactions pour voir votre analyse.`, type: 'neutral' };
    insights.sort((a, b) => b.score - a.score);
    const topScore = insights[0].score;
    const topInsights = insights.filter(i => i.score >= topScore - 20);
    return topInsights[today.getDate() % topInsights.length];
  };

  const observation = getPerformanceObservation();

  const getPeriodName = () => {
    const startStr = format(periodStart, 'MMM yyyy', { locale: fr });
    const endStr = format(periodEnd, 'MMM yyyy', { locale: fr });
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  };

  const handleExport = () => {
    const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0);
    const startStr = format(start, 'dd MMMM yyyy', { locale: fr });
    const endStr = format(end, 'dd MMMM yyyy', { locale: fr });
    exportToExcel(transactions, start.getTime() === end.getTime() ? startStr : `Du ${startStr} au ${endStr}`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmModal({
      isOpen: true, title: 'Importer des données',
      message: "Attention : L'importation va écraser vos paramètres actuels et ajouter les transactions du fichier. Continuer ?",
      onConfirm: async () => {
        setConfirmModal(null);
        const result = await importFromExcel(file);
        setAlertModal({ isOpen: true, title: result.success ? 'Succès' : 'Erreur', message: result.message || (result.success ? 'Importation réussie !' : "Erreur lors de l'importation.") });
        if (result.success) { setSettings(getUserSettings()); loadTransactions(); }
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true, title: 'Supprimer',
      message: 'Voulez-vous vraiment supprimer cette transaction ?',
      onConfirm: () => {
        const t = transactions.find(t => t.id === id);
        if (t) { deleteTransaction(id, getMonthKey(t.date)); loadTransactions(); }
        setConfirmModal(null);
      }
    });
  };

  const handleEdit = (t: Transaction) => { setEditingTransaction(t); setIsModalOpen(true); };

  const openNewTransaction = () => {
    if (!canAddTransaction(periodStart.toISOString())) { setShowPayment(true); return; }
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const profile = getUserProfile();
    const name = profile?.firstName || '';
    return hour < 18 ? `Bonjour ${name}` : `Bonsoir ${name}`;
  };

  const handleShare = async () => {
    const url = window.location.origin;
    const text = `📊 Gérez votre comptabilité facilement avec Compta !\n💼 Suivi des entrées & dépenses, rapports, export Excel.\n👉 ${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  if (!isAuthenticated) {
    return <AuthView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderDashboard = () => (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-10 pb-8 shadow-sm border-b border-neutral-100">
        <div className="flex items-center justify-between mb-6">
          <Logo className="w-8 h-8 text-neutral-900" textClassName="text-xl font-bold text-neutral-900" />
          <div className="flex items-center gap-3">
            <button onClick={handleShare} title="Partager sur WhatsApp"
              className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-all">
              <Share2 size={14} /> Partager
            </button>
            <h2 className="text-sm font-medium text-neutral-500">{getGreeting()} 👋</h2>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <button onClick={handlePrevMonth} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <button onClick={() => settings.isPro && setIsPeriodModalOpen(true)}
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${settings.isPro ? 'text-neutral-900 hover:opacity-70' : 'text-neutral-500 cursor-default'}`}>
            {getPeriodName()}
            {settings.isPro && <Calendar size={14} className="text-neutral-400" />}
          </button>
          <button onClick={handleNextMonth} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-900 transition-colors">
            <ChevronRight size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="text-center mb-10">
          <p className="text-neutral-400 text-xs uppercase tracking-widest mb-2 font-medium">Solde Net</p>
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 font-mono">{formatCurrency(netBalance)}</h1>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">{settings.fieldLabels?.income || 'Entrées'}</span>
            </div>
            <p className="font-mono text-lg font-medium text-neutral-900">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">{settings.fieldLabels?.expense || 'Dépenses'}</span>
            </div>
            <p className="font-mono text-lg font-medium text-neutral-900">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Performances</h3>
          {observation && (
            <div className={`border rounded-xl p-4 mb-4 flex items-start gap-3 ${
              observation.type === 'positive' ? 'bg-green-50 border-green-200 text-green-700' :
              observation.type === 'negative' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-neutral-50 border-neutral-100 text-neutral-700'}`}>
              <div className="mt-0.5">
                {observation.type === 'positive' ? <TrendingUp size={18} /> : observation.type === 'negative' ? <TrendingDown size={18} /> : <TrendingUp size={18} className="opacity-50" />}
              </div>
              <p className="text-sm leading-relaxed font-medium">{observation.text}</p>
            </div>
          )}
          <DashboardChart transactions={transactions} currency={settings.currency} fieldLabels={settings.fieldLabels} />
        </div>
      </div>

      {/* Transactions */}
      <div className="px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Transactions</h3>
          <div className="flex items-center gap-4">
            {settings.isPro && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 hover:opacity-70 transition-opacity">
                  <Upload size={14} strokeWidth={2} /> Importer
                </button>
              </>
            )}
            <button onClick={handleExport} className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 hover:opacity-70 transition-opacity">
              <Download size={14} strokeWidth={2} /> Exporter
            </button>
          </div>
        </div>

        {!settings.isPro && (
          <div className="mb-8 bg-neutral-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
            <div>
              <p className="text-sm font-medium">Plan Gratuit</p>
              <p className="text-xs text-neutral-400 mt-0.5">{getRemainingTransactions(periodStart.toISOString())} transactions restantes</p>
            </div>
            <button onClick={() => setShowPayment(true)}
              className="text-xs font-bold bg-white text-neutral-900 px-4 py-2 rounded-xl hover:bg-neutral-100 transition-colors">
              Passer PRO
            </button>
          </div>
        )}

        <div className="space-y-1">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <FileText size={32} strokeWidth={1} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune transaction pour cette période</p>
            </div>
          ) : transactions.map(t => (
            <div key={t.id} className="group flex items-center justify-between py-4 border-b border-neutral-100 last:border-0">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {t.type === 'income' ? <TrendingUp size={18} strokeWidth={2} /> : <TrendingDown size={18} strokeWidth={2} />}
                </div>
                <div>
                  <p className="font-medium text-neutral-900 text-sm">
                    {t.label || t.category}
                    {t.quantity && t.quantity > 1 && <span className="text-neutral-400 text-xs ml-1.5 font-normal">x{t.quantity}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">{t.category}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-300" />
                    <span className="text-[10px] text-neutral-500">{format(parseISO(t.date), 'dd MMM', { locale: fr })}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <p className={`font-mono font-medium text-sm ${t.type === 'income' ? 'text-green-600' : 'text-neutral-900'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                  <div className="flex gap-2 mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="text-neutral-400 hover:text-neutral-900 p-1"><Edit2 size={12} /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-neutral-400 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={openNewTransaction}
        className="fixed bottom-24 right-6 w-14 h-14 bg-neutral-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-neutral-800 transition-transform active:scale-95 z-30">
        <Plus size={24} strokeWidth={2} />
      </button>

      {/* Share toast */}
      {showShareToast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg z-50 whitespace-nowrap">
          ✓ Partage ouvert sur WhatsApp !
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* PC Layout wrapper — centers the mobile app on desktop */}
      <div className="min-h-screen bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-stretch justify-center">
        {/* Left sidebar — visible only on large screens */}
        <div className="hidden lg:flex flex-col justify-between w-64 py-12 px-8 shrink-0">
          <div>
            <Logo className="w-8 h-8 text-neutral-700" textClassName="text-xl font-bold text-neutral-700" />
            <p className="text-neutral-500 text-xs mt-3 leading-relaxed">Votre comptabilité simple et efficace.</p>
          </div>
          <div className="space-y-1">
            {[
              { view: 'dashboard' as View, icon: <FileText size={18} />, label: 'Tableau de bord' },
              { view: 'history' as View, icon: <History size={18} />, label: 'Historique' },
              { view: 'pro' as View, icon: <Crown size={18} />, label: 'Espace PRO' },
              { view: 'settings' as View, icon: <Settings size={18} />, label: 'Paramètres' },
            ].map(({ view, icon, label }) => (
              <button key={view} onClick={() => setCurrentView(view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentView === view ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:bg-white/60 hover:text-neutral-900'}`}>
                {icon} {label}
              </button>
            ))}
            <div className="pt-4 mt-2 border-t border-neutral-300/50">
              <button onClick={handleShare}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-green-700 hover:bg-green-100 transition-all">
                <Share2 size={18} /> Partager l'app
              </button>
            </div>
          </div>
          <div className="text-xs text-neutral-400 leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone size={14} />
              <span>Disponible sur mobile</span>
            </div>
            <p>Ajoutez cette page à votre écran d'accueil pour l'utiliser comme application.</p>
          </div>
        </div>

        {/* Mobile App Container */}
        <div className="flex-1 lg:flex-none lg:w-[420px] min-h-screen bg-neutral-100 relative shadow-2xl overflow-hidden flex flex-col lg:my-0 lg:mx-0">
          <div className="flex-1 overflow-y-auto">
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'history' && <HistoryView onSelectMonth={(d) => { setPeriodStart(d); setPeriodEnd(d); setCurrentView('dashboard'); }} />}
            {currentView === 'pro' && <ProView onBack={() => setCurrentView('dashboard')} />}
            {currentView === 'settings' && <SettingsView onBack={() => setCurrentView('dashboard')} />}
          </div>

          {/* Bottom Nav — hidden on large screens (sidebar handles it) */}
          <nav className="lg:hidden fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-neutral-100 px-6 py-4 flex justify-between items-center z-40 pb-safe">
            {[
              { view: 'dashboard' as View, icon: (active: boolean) => <FileText size={20} strokeWidth={active ? 2.5 : 1.5} />, label: 'Mois' },
              { view: 'history' as View, icon: (active: boolean) => <History size={20} strokeWidth={active ? 2.5 : 1.5} />, label: 'Histo' },
              { view: 'pro' as View, icon: (active: boolean) => <Crown size={20} strokeWidth={active ? 2.5 : 1.5} />, label: 'Pro' },
              { view: 'settings' as View, icon: (active: boolean) => <Settings size={20} strokeWidth={active ? 2.5 : 1.5} />, label: 'Param' },
            ].map(({ view, icon, label }) => (
              <button key={view} onClick={() => setCurrentView(view)}
                className={`flex flex-col items-center gap-1.5 transition-colors ${currentView === view ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}>
                {icon(currentView === view)}
                <span className="text-[9px] font-semibold uppercase tracking-widest">{label}</span>
              </button>
            ))}
          </nav>

          <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
            onSave={() => { setIsModalOpen(false); loadTransactions(); }}
            transaction={editingTransaction} currentDate={periodStart} />
          <PeriodSelectorModal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)}
            onApply={(start, end) => { setPeriodStart(start); setPeriodEnd(end); }}
            currentStart={periodStart} currentEnd={periodEnd} />

          {confirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-neutral-600 mb-6">{confirmModal.message}</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">Annuler</button>
                  <button onClick={confirmModal.onConfirm} className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition-colors">Confirmer</button>
                </div>
              </div>
            </div>
          )}
          {alertModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{alertModal.title}</h3>
                <p className="text-sm text-neutral-600 mb-6">{alertModal.message}</p>
                <div className="flex justify-end">
                  <button onClick={() => setAlertModal(null)} className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition-colors">OK</button>
                </div>
              </div>
            </div>
          )}
          <InstallPopup />
        </div>

        {/* Right sidebar — info/tips on large screens */}
        <div className="hidden xl:flex flex-col justify-center w-64 py-12 px-8 shrink-0">
          <div className="bg-white/40 rounded-3xl p-6 border border-white/60">
            <h3 className="text-sm font-bold text-neutral-700 mb-4">📊 Résumé rapide</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Entrées</span>
                <span className="text-xs font-bold text-green-600">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500">Dépenses</span>
                <span className="text-xs font-bold text-red-500">{formatCurrency(totalExpense)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-700">Solde net</span>
                <span className={`text-xs font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(netBalance)}</span>
              </div>
            </div>
          </div>
          {!settings.isPro && (
            <div className="mt-4 bg-neutral-900 text-white rounded-3xl p-6">
              <Crown size={24} className="text-yellow-400 mb-3" />
              <h3 className="text-sm font-bold mb-2">Passez à PRO</h3>
              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">Transactions illimitées, exports sur mesure, analyses avancées.</p>
              <button onClick={() => setShowPayment(true)}
                className="w-full bg-white text-neutral-900 text-xs font-bold py-2.5 rounded-xl hover:bg-neutral-100 transition-colors">
                Voir les offres
              </button>
            </div>
          )}
        </div>
      </div>

      {showPayment && <PaymentView onClose={() => setShowPayment(false)} />}
    </>
  );
}
