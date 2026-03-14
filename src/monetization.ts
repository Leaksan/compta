import { getUserSettings, updateUserSettings, getTransactions, getMonthKey, getUserProfile } from './storage';

export const FREE_PLAN_LIMIT = 20;

// URL de ton API Vercel — remplace après déploiement ou configure dans .env
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function isProUser(): boolean {
  const settings = getUserSettings();
  if (!settings.isPro) return false;

  // Vérifie expiration locale
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

// Vérifie le statut Pro via l'API Neon en matchant le numéro WhatsApp
export async function checkProStatusFromAPI(): Promise<{
  isPro: boolean;
  plan?: string;
  expiresAt?: string;
  error?: string;
}> {
  try {
    const profile = getUserProfile();
    if (!profile?.whatsapp) return { isPro: false, error: 'Profil introuvable' };

    const res = await fetch(`${API_BASE_URL}/api/subscribers`);
    if (!res.ok) throw new Error('API indisponible');

    const subscribers: Array<{
      phone: string;
      status: string;
      plan: string;
      start_date: string | null;
    }> = await res.json();

    // Matching flexible : ignore les +, espaces, indicatifs
    const phone = profile.whatsapp.replace(/\D/g, '');
    const match = subscribers.find(s => {
      const sPhone = s.phone.replace(/\D/g, '');
      return sPhone === phone || sPhone.endsWith(phone) || phone.endsWith(sPhone);
    });

    if (!match || match.status !== 'active') return { isPro: false };

    const PLAN_MONTHS: Record<string, number> = { Mensuel: 1, Trimestriel: 3, Annuel: 12 };
    const months = PLAN_MONTHS[match.plan] ?? 1;
    const startDate = match.start_date ? new Date(match.start_date) : new Date();
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    return { isPro: true, plan: match.plan, expiresAt: expiresAt.toISOString() };
  } catch {
    return { isPro: false, error: 'Erreur réseau' };
  }
}

export function applyProLocally(plan: string, expiresAt: string): void {
  updateUserSettings({ isPro: true, activatedAt: new Date().toISOString(), proExpiresAt: expiresAt, proplan: plan });
}

export function revokePro(): void {
  updateUserSettings({ isPro: false, activatedAt: null, proExpiresAt: null, proplan: null });
}

// Désactivé — remplacé par vérification API
export function activatePro(_promoCode?: string): boolean {
  return false;
}
