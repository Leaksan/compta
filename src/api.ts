// ─── API Client ───────────────────────────────────────────────────────────────
// All calls go through /api (proxied by Vite to localhost:3001 in dev)

export interface ApiUser {
  id: number;
  whatsapp: string;
  first_name: string;
  company_name: string;
  email: string | null;
  is_pro: boolean;
  plan: string;
  activated_at: string | null;
}

export async function apiRegister(data: {
  firstName: string;
  companyName: string;
  whatsapp: string;
  email?: string;
  password: string;
}): Promise<{ success: boolean; user?: ApiUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau — vérifiez votre connexion' };
  }
}

export async function apiLogin(data: {
  whatsapp: string;
  password: string;
}): Promise<{ success: boolean; user?: ApiUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur réseau — vérifiez votre connexion' };
  }
}

export async function apiGetUserStatus(whatsapp: string): Promise<{
  isPro: boolean;
  plan: string;
  activatedAt: string | null;
}> {
  try {
    const res = await fetch(`/api/user/status?whatsapp=${encodeURIComponent(whatsapp)}`);
    return await res.json();
  } catch {
    return { isPro: false, plan: 'free', activatedAt: null };
  }
}

export async function apiGetWhatsAppNumber(): Promise<string> {
  try {
    const res = await fetch('/api/payment/whatsapp');
    const data = await res.json();
    return data.number || '';
  } catch {
    return '';
  }
}
