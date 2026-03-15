import { getUserSettings, updateUserSettings, getTransactions, getMonthKey, apiGetMe, setAuthToken, getAuthToken } from './storage';

export const FREE_PLAN_LIMIT = 20;

export function isProUser(): boolean {
  return getUserSettings().isPro;
}

export function canAddTransaction(date: string): boolean {
  if (isProUser()) return true;
  const monthKey = getMonthKey(date);
  const transactions = getTransactions(monthKey);
  return transactions.length < FREE_PLAN_LIMIT;
}

export function getRemainingTransactions(date: string): number {
  if (isProUser()) return Infinity;
  const monthKey = getMonthKey(date);
  const transactions = getTransactions(monthKey);
  return Math.max(0, FREE_PLAN_LIMIT - transactions.length);
}

export async function syncProStatus(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const user = await apiGetMe();
    const isPro = user.isPro === true;
    updateUserSettings({ isPro, activatedAt: isPro ? (user.plan_activated_at || new Date().toISOString()) : null });
    return isPro;
  } catch {
    return isProUser();
  }
}

export function activatePro(promoCode?: string): boolean {
  if (promoCode === 'PROTEST') {
    updateUserSettings({ isPro: true, activatedAt: new Date().toISOString() });
    return true;
  }
  return false;
}
