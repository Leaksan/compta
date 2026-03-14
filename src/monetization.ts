import { getUserSettings, updateUserSettings, getTransactions, getMonthKey } from './storage';

export const FREE_PLAN_LIMIT = 20;

export function isProUser(): boolean {
  const settings = getUserSettings();
  if (!settings.isPro) return false;

  // Vérifie expiration locale si date présente
  if (settings.proExpiresAt) {
    const expiry = new Date(settings.proExpiresAt);
    if (new Date() > expiry) {
      updateUserSettings({ isPro: false, proExpiresAt: null, proplan: null });
      return false;
    }
  }
  return true;
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

// Activé depuis l'admin — stocke le plan et l'expiration localement
export function applyProLocally(plan: string, expiresAt: string): void {
  updateUserSettings({
    isPro: true,
    activatedAt: new Date().toISOString(),
    proExpiresAt: expiresAt,
    proplan: plan,
  });
}

export function revokePro(): void {
  updateUserSettings({ isPro: false, activatedAt: null, proExpiresAt: null, proplan: null });
}

// Conservé pour compatibilité — non utilisé
export function activatePro(_promoCode?: string): boolean {
  return false;
}
