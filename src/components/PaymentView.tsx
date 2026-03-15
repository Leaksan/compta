import { useState, useEffect } from 'react';
import { Crown, Check, ArrowRight, MessageCircle, X, Sparkles } from 'lucide-react';
import { getUserProfile, getWhatsAppConfig } from '../storage';

interface Props {
  onClose: () => void;
}

type Plan = 'monthly' | 'quarterly' | 'annual';

const PLANS: Record<Plan, { label: string; months: number; price: number; discount: number; badge?: string }> = {
  monthly: { label: 'Mensuel', months: 1, price: 10000, discount: 0 },
  quarterly: { label: 'Trimestriel', months: 3, price: 10000 * 3, discount: 10, badge: '-10%' },
  annual: { label: 'Annuel', months: 12, price: 10000 * 12, discount: 10, badge: '-10% 🔥' },
};

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA';
}

export default function PaymentView({ onClose }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('monthly');
  const [whatsappNumber, setWhatsappNumber] = useState('22900000000');

  useEffect(() => {
    getWhatsAppConfig().then(setWhatsappNumber);
  }, []);

  const plan = PLANS[selectedPlan];
  const finalPrice = Math.round(plan.price * (1 - plan.discount / 100));

  const handleBuy = () => {
    const profile = getUserProfile();
    const name = profile?.firstName || 'Client';
    const company = profile?.companyName || '';
    const phone = profile?.whatsapp || '';

    const planLabel = `${plan.label}${plan.months > 1 ? ` (${plan.months} mois)` : ''}`;
    const message = [
      `🔐 *Demande d'abonnement PRO — Compta*`,
      ``,
      `👤 Nom : ${name}`,
      company ? `🏢 Entreprise : ${company}` : '',
      phone ? `📱 WhatsApp : ${phone}` : '',
      ``,
      `📦 Plan choisi : *${planLabel}*`,
      `💰 Montant : *${formatPrice(finalPrice)}*`,
      plan.discount > 0 ? `🎁 Réduction appliquée : ${plan.discount}%` : '',
      ``,
      `Merci de procéder au paiement pour activer mon compte PRO.`,
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(message);
    const clean = whatsappNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="bg-neutral-900 text-white px-6 pt-8 pb-6 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Crown size={22} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Passer à PRO</h2>
              <p className="text-neutral-400 text-xs">Transactions illimitées & plus</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {(['monthly', 'quarterly', 'annual'] as Plan[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  selectedPlan === p ? 'bg-white text-neutral-900' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                }`}
              >
                {PLANS[p].badge && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-neutral-900 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                    {PLANS[p].badge}
                  </span>
                )}
                {PLANS[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="px-6 py-5 border-b border-neutral-100">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-neutral-900 font-mono">{formatPrice(finalPrice)}</span>
            {plan.discount > 0 && (
              <span className="text-sm text-neutral-400 line-through">{formatPrice(plan.price)}</span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {plan.months === 1 ? 'par mois' : `pour ${plan.months} mois`}
            {plan.discount > 0 && <span className="text-green-600 font-semibold ml-1">— {plan.discount}% de réduction</span>}
          </p>
        </div>

        {/* Features */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Inclus dans PRO</p>
          <ul className="space-y-3">
            {[
              'Transactions illimitées',
              'Champs personnalisés illimités',
              'Export Excel sur mesure',
              'Analyse multi-périodes',
              'Support prioritaire',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                <Check size={16} className="text-green-500 shrink-0" strokeWidth={3} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-8">
          <button
            onClick={handleBuy}
            className="w-full bg-neutral-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-lg"
          >
            <MessageCircle size={20} className="text-green-400" />
            Acheter via WhatsApp
            <ArrowRight size={18} />
          </button>
          <p className="text-center text-xs text-neutral-400 mt-3">
            <Sparkles size={12} className="inline mr-1" />
            Un message pré-rempli sera envoyé à notre équipe
          </p>
        </div>
      </div>
    </div>
  );
}
