import { v4 as uuidv4 } from 'uuid';

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
  id?: string;
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

// ─── Auth (backend-based) ─────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_profile');
  localStorage.removeItem('user_session');
}

export async function apiRegister(data: {
  firstName: string; companyName: string;
  whatsapp: string; email?: string; password: string;
}): Promise<{ token: string; user: any }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur serveur');
  return json;
}

export async function apiLogin(whatsapp: string, password: string): Promise<{ token: string; user: any }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur serveur');
  return json;
}

export async function apiGetMe(): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error('Non connecté');
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erreur serveur');
  return json;
}

export async function getWhatsAppConfig(): Promise<string> {
  try {
    const res = await fetch('/api/config/whatsapp');
    const json = await res.json();
    return json.whatsapp || '22900000000';
  } catch {
    return '22900000000';
  }
}

// ─── Legacy local auth helpers (kept for compat) ─────────────────────────────

export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem('user_profile');
  return data ? JSON.parse(data) : null;
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem('user_profile', JSON.stringify(profile));
}

export function logoutUser(): void {
  clearAuthToken();
}

export function loginUser(whatsapp: string, password?: string): boolean {
  const profile = getUserProfile();
  if (profile && profile.whatsapp === whatsapp && profile.password === password) {
    localStorage.setItem('user_session', 'active');
    return true;
  }
  return false;
}

export function isUserLoggedIn(): boolean {
  return !!getAuthToken() || localStorage.getItem('user_session') === 'active';
}

export function registerUser(profile: UserProfile): void {
  saveUserProfile(profile);
  localStorage.setItem('user_session', 'active');
}

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
  const updatedTransaction = { ...transactions[index], ...updates };
  transactions[index] = updatedTransaction;
  const newMonthKey = getMonthKey(updatedTransaction.date);
  if (newMonthKey !== monthKey) {
    transactions.splice(index, 1);
    localStorage.setItem(monthKey, JSON.stringify(transactions));
    const newMonthTransactions = getTransactions(newMonthKey);
    newMonthTransactions.push(updatedTransaction);
    newMonthTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(newMonthKey, JSON.stringify(newMonthTransactions));
  } else {
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(monthKey, JSON.stringify(transactions));
  }
  return updatedTransaction;
}

export function deleteTransaction(id: string, monthKey: string): void {
  const transactions = getTransactions(monthKey).filter(t => t.id !== id);
  localStorage.setItem(monthKey, JSON.stringify(transactions));
}

export function updateTransactionsCategory(oldCategoryName: string, newCategoryName: string): void {
  getAvailableMonths().forEach(monthKey => {
    const transactions = getTransactions(monthKey);
    let updated = false;
    const newTransactions = transactions.map(t => {
      if (t.category === oldCategoryName) { updated = true; return { ...t, category: newCategoryName }; }
      return t;
    });
    if (updated) localStorage.setItem(monthKey, JSON.stringify(newTransactions));
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function getUserSettings(): UserSettings {
  const data = localStorage.getItem('user_settings');
  const settings = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };

  if (!settings.fieldOrder || settings.fieldOrder.length === 0) {
    settings.fieldOrder = ['date', 'category', 'label', 'quantity', 'observation', 'income', 'expense', ...(settings.customFields || []).map((f: CustomField) => f.id)];
  } else {
    if (settings.fieldOrder.includes('type') || settings.fieldOrder.includes('amount')) {
      settings.fieldOrder = settings.fieldOrder.filter((id: string) => id !== 'type' && id !== 'amount');
      settings.fieldOrder.push('income', 'expense');
    }
    if (!settings.fieldOrder.includes('quantity')) {
      const labelIndex = settings.fieldOrder.indexOf('label');
      if (labelIndex !== -1) settings.fieldOrder.splice(labelIndex + 1, 0, 'quantity');
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
