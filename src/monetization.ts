import { getUserSettings, updateUserSettings, getTransactions, getMonthKey } from './storage';

export const FREE_PLAN_LIMIT = 20;

export function isProUser(): boolean {
  const settings = getUserSettings();
  return settings.isPro;
}

export function canAddTransaction(date: string): boolean {
  if (isProUser()) return true;
  
  const monthKey = getMonthKey(date);
  const transactions = getTransactions(monthKey);
  return transactions.length < FREE_PLAN_LIMIT;
}

export function activatePro(promoCode?: string): boolean {
  if (promoCode === 'PROTEST') {
    updateUserSettings({
      isPro: true,
      activatedAt: new Date().toISOString()
    });
    return true;
  }
  return false;
}

export function getRemainingTransactions(date: string): number {
  if (isProUser()) return Infinity;
  
  const monthKey = getMonthKey(date);
  const transactions = getTransactions(monthKey);
  return Math.max(0, FREE_PLAN_LIMIT - transactions.length);
}
