import { v4 as uuidv4 } from 'uuid';
import { apiLogin, apiRegister, apiGetUserStatus } from './api';

export type TransactionType = 'income' | 'expense';

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number';
}

export interface CustomCategory {
  id: string;
  name: string;
  type: TransactionType;
}

export interface UserProfile {
  firstName: string;
  companyName: string;
  whatsapp: string;
  email?: string;
  password?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  quantity?: number;
  label: string;
  category: string;
  observation?: string;
  date: string;
  createdAt: string;
  customData?: Record<string, string | number>;
}

export interface UserSettings {
  currency: string;
  isPro: boolean;
  activatedAt: string | null;
  plan?: string;
  categories?: { income: string[]; expense: string[] };
  customCategories: CustomCategory[];
  customFields: CustomField[];
  fieldOrder: string[];
  hiddenFields: string[];
  fieldLabels?: Record<string, string>;
}

export interface ExportRecord {
  id: string;
  createdAt: string;
  periodName: string;
  fileName: string;
  transactions: Transaction[];
}

export const PREDEFINED_CATEGORIES = {
  income: ['Vente', 'Prestation', 'Salaire', 'Remboursement', 'Autre entrée'],
  expense: ['Loyer', 'Fournitures', 'Transport', 'Salaires versés', 'Communication', 'Fiscalité', 'Autre dépense']
};

const DEFAULT_SETTINGS: UserSettings = {
  currency: 'FCFA',
  isPro: false,
  activatedAt: null,
  plan: 'free',
  categories: PREDEFINED_CATEGORIES,
  customCategories: [],
  customFields: [],
  fieldOrder: ['date', 'category', 'label', 'quantity', 'observation', 'income', 'expense'],
  hiddenFields: ['quantity'],
  fieldLabels: {
    date: 'Date', category: 'Catégorie', label: 'Libellé',
    observation: 'Observation', income: 'Entrée', expense: 'Dépense', quantity: 'Quantité'
  }
};

// ─── Export History ───────────────────────────────────────────────────────────
export function getExportHistory(): ExportRecord[] {
  const data = localStorage.getItem('export_history');
  return data ? JSON.parse(data) : [];
}

export function saveExportRecord(record: Omit<ExportRecord, 'id' | 'createdAt'>): void {
  const history = getExportHistory();
  const newRecord: ExportRecord = { ...record, id: uuidv4(), createdAt: new Date().toISOString() };
  localStorage.setItem('export_history', JSON.stringify([newRecord, ...history].slice(0, 10)));
}

export function deleteExportRecord(id: string): void {
  localStorage.setItem('export_history', JSON.stringify(getExportHistory().filter(r => r.id !== id)));
}

// ─── User Auth ────────────────────────────────────────────────────────────────
export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem('user_profile');
  return data ? JSON.parse(data) : null;
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem('user_profile', JSON.stringify(profile));
}

export function logoutUser(): void {
  localStorage.removeItem('user_session');
}

/** Sync pro status from server and save locally */
export async function syncProStatus(whatsapp: string): Promise<void> {
  try {
    const status = await apiGetUserStatus(whatsapp);
    const settings = getUserSettings();
    updateUserSettings({ isPro: status.isPro, plan: status.plan, activatedAt: status.activatedAt });
  } catch {
    // silently fail – offline
  }
}

export async function loginUserAsync(whatsapp: string, password: string): Promise<{ success: boolean; error?: string }> {
  const result = await apiLogin({ whatsapp, password });
  if (result.success && result.user) {
    const profile: UserProfile = {
      firstName: result.user.first_name,
      companyName: result.user.company_name,
      whatsapp: result.user.whatsapp,
      email: result.user.email || undefined,
      password,
    };
    saveUserProfile(profile);
    localStorage.setItem('user_session', 'active');
    // Sync pro status
    updateUserSettings({ isPro: result.user.is_pro, plan: result.user.plan, activatedAt: result.user.activated_at });
    return { success: true };
  }
  return { success: false, error: result.error || 'Identifiants incorrects' };
}

export async function registerUserAsync(
  profile: UserProfile
): Promise<{ success: boolean; error?: string }> {
  const result = await apiRegister({
    firstName: profile.firstName,
    companyName: profile.companyName,
    whatsapp: profile.whatsapp,
    email: profile.email,
    password: profile.password || '',
  });
  if (result.success && result.user) {
    saveUserProfile(profile);
    localStorage.setItem('user_session', 'active');
    updateUserSettings({ isPro: result.user.is_pro, plan: result.user.plan });
    return { success: true };
  }
  return { success: false, error: result.error || 'Erreur lors de l\'inscription' };
}

// Keep legacy sync versions for compatibility
export function loginUser(whatsapp: string, password?: string): boolean {
  const profile = getUserProfile();
  if (profile && profile.whatsapp === whatsapp && profile.password === password) {
    localStorage.setItem('user_session', 'active');
    return true;
  }
  return false;
}

export function registerUser(profile: UserProfile): void {
  saveUserProfile(profile);
  localStorage.setItem('user_session', 'active');
}

export function isUserLoggedIn(): boolean {
  return localStorage.getItem('user_session') === 'active';
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function getMonthKey(date: Date | string): string {
  const d = new Date(date);
  return `transactions_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getTransactions(monthKey: string): Transaction[] {
  const data = localStorage.getItem(monthKey);
  return data ? JSON.parse(data) : [];
}

export function getTransactionsForPeriod(startDate: Date, endDate: Date): Transaction[] {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
  const months = getAvailableMonths();
  let all: Transaction[] = [];
  months.forEach(monthKey => {
    const [, yearStr, monthStr] = monthKey.split('_');
    const monthDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    if (monthDate >= start && monthDate <= end) all = [...all, ...getTransactions(monthKey)];
  });
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const newTransaction: Transaction = { ...transaction, id: uuidv4(), createdAt: new Date().toISOString() };
  const monthKey = getMonthKey(transaction.date);
  const transactions = getTransactions(monthKey);
  transactions.push(newTransaction);
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(monthKey, JSON.stringify(transactions));
  return newTransaction;
}

export function updateTransaction(id: string, monthKey: string, updates: Partial<Transaction>): Transaction | null {
  const transactions = getTransactions(monthKey);
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return null;
  const updated = { ...transactions[index], ...updates };
  transactions[index] = updated;
  const newMonthKey = getMonthKey(updated.date);
  if (newMonthKey !== monthKey) {
    transactions.splice(index, 1);
    localStorage.setItem(monthKey, JSON.stringify(transactions));
    const newMonthTx = getTransactions(newMonthKey);
    newMonthTx.push(updated);
    newMonthTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(newMonthKey, JSON.stringify(newMonthTx));
  } else {
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(monthKey, JSON.stringify(transactions));
  }
  return updated;
}

export function deleteTransaction(id: string, monthKey: string): void {
  localStorage.setItem(monthKey, JSON.stringify(getTransactions(monthKey).filter(t => t.id !== id)));
}

export function updateTransactionsCategory(oldName: string, newName: string): void {
  getAvailableMonths().forEach(monthKey => {
    const txs = getTransactions(monthKey);
    const updated = txs.map(t => t.category === oldName ? { ...t, category: newName } : t);
    if (txs.some(t => t.category === oldName)) localStorage.setItem(monthKey, JSON.stringify(updated));
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export function getUserSettings(): UserSettings {
  const data = localStorage.getItem('user_settings');
  const settings: UserSettings = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };

  if (!settings.fieldOrder || settings.fieldOrder.length === 0) {
    settings.fieldOrder = ['date', 'category', 'label', 'quantity', 'observation', 'income', 'expense', ...(settings.customFields || []).map((f: CustomField) => f.id)];
  } else {
    if (settings.fieldOrder.includes('type') || settings.fieldOrder.includes('amount')) {
      settings.fieldOrder = settings.fieldOrder.filter(id => id !== 'type' && id !== 'amount');
      settings.fieldOrder.push('income', 'expense');
    }
    if (!settings.fieldOrder.includes('quantity')) {
      const li = settings.fieldOrder.indexOf('label');
      if (li !== -1) settings.fieldOrder.splice(li + 1, 0, 'quantity');
      else settings.fieldOrder.push('quantity');
      if (!settings.hiddenFields) settings.hiddenFields = ['quantity'];
      else if (!settings.hiddenFields.includes('quantity')) settings.hiddenFields.push('quantity');
    }
  }
  if (!settings.hiddenFields) settings.hiddenFields = ['quantity'];
  if (!settings.categories) settings.categories = PREDEFINED_CATEGORIES;
  if (!settings.fieldLabels) settings.fieldLabels = DEFAULT_SETTINGS.fieldLabels;
  return settings;
}

export function updateUserSettings(updates: Partial<UserSettings>): UserSettings {
  const settings = getUserSettings();
  const newSettings = { ...settings, ...updates };
  localStorage.setItem('user_settings', JSON.stringify(newSettings));
  return newSettings;
}

export function getAvailableMonths(): string[] {
  const months: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('transactions_')) months.push(key);
  }
  return months.sort().reverse();
}
