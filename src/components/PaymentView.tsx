import { useState, useEffect } from 'react';
import { Crown, Check, Zap, ArrowLeft, MessageCircle, Star } from 'lucide-react';
import { getUserProfile } from '../storage';
import { apiGetWhatsAppNumber } from '../api';

interface Props {
  onBack: () => void;
}

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensuel',
    price: 10000,
    period: '/ mois',
    monthly: 10000,
    badge: null,
    highlight: false,
    description: 'Idéal pour démarrer',
  },
  {
    id: 'quarterly',
    label: 'Trimestriel',
    price: 27000,
    period: '/ 3 mois',
    monthly: 9000,
    badge: '10% de réduction',
    highlight: true,
    description: 'Le plus populaire',
  },
  {
    id: 'yearly',
    label: 'Annuel',
    price: 108000,
    period: '/ an',
    monthly: 9000,
    badge: '10% de réduction',
    highlight: false,
    description: 'La meilleure valeur',
  },
];

export default function PaymentView({ onBack }: Props) {
  const [selected, setSelected] = useState('quarterly');
  const [waNumber, setWaNumber] = useState('');
  const profile = getUserProfile();

  useEffect(() => {
    apiGetWhatsAppNumber().then(num => setWaNumber(num));
  }, []);

  const handleBuy = () => {
    const plan = PLANS.find(p => p.id === selected)!;
    const planLabels: Record<string, string> = {
      monthly: 'Plan Mensuel — 10 000 FCFA/mois',
      quarterly: 'Plan Trimestriel — 27 000 FCFA (3 mois, -10%)',
      yearly: 'Plan Annuel — 108 000 FCFA (12 mois, -10%)',
    };

    const message = `Bonjour 👋, je souhaite souscrire à ComptaApp PRO.

📋 *Mes informations :*
• Prénom : ${profile?.firstName || 'Non renseigné'}
• Entreprise : ${profile?.companyName || 'Non renseignée'}
• WhatsApp : ${profile?.whatsapp || 'Non renseigné'}${profile?.email ? `\n• Email : ${profile.email}` : ''}

💳 *Plan choisi :*
${planLabels[selected]}

Merci de confirmer ma souscription !`;

    const encoded = encodeURIComponent(message);
    const number = waNumber.replace(/\D/g, '');
    if (!number) {
      alert('Le numéro WhatsApp de paiement n\'est pas encore configuré. Contactez l\'administrateur.');
      return;
    }
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-24 md:pb-8">
      {/* Header */}
      <div className="bg-neutral-900 px-6 pt-12 pb-10 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-2 text-white/60 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
            <Crown size={28} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Passer en PRO</h1>
            <p className="text-white/50 text-sm mt-1">Déverrouillez toutes les fonctionnalités</p>
          </div>
        </div>
      </div>

      {/* Features recap */}
      <div className="px-6 py-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">Inclus dans PRO</p>
          <div className="grid grid-cols-1 gap-3">
            {[
              'Transactions illimitées',
              'Champs personnalisés',
              'Export Excel avancé',
              'Historique complet',
              'Plusieurs périodes',
              'Support prioritaire',
            ].map(f => (
              <div key={f} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check size={11} className="text-green-600" strokeWidth={3} />
                </div>
                <span className="text-xs text-neutral-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">Choisissez votre plan</p>
        <div className="space-y-3">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                selected === plan.id
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-lg scale-[1.01]'
                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.highlight && <Star size={13} className={selected === plan.id ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-500 fill-yellow-500'} />}
                    <span className="font-bold text-base">{plan.label}</span>
                  </div>
                  {plan.badge && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest ${
                      selected === plan.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                    }`}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${selected === plan.id ? 'text-white/70' : 'text-neutral-600'}`}>{plan.description}</p>
                <div className="flex items-center justify-between">
                  <span></span>
                  <div className="text-right">
                    <div className="font-bold text-xl">{plan.price.toLocaleString('fr-FR')} <span className="text-sm font-medium">FCFA</span></div>
                    <div className={`text-xs ${selected === plan.id ? 'text-white/50' : 'text-neutral-400'}`}>
                      {plan.period}
                      {plan.id !== 'monthly' && (
                        <div className="mt-1">{plan.monthly.toLocaleString('fr-FR')} FCFA/mois</div>
                      )}
                    </div>
                  </div>
                </div>
                {selected === plan.id && (
                  <div className="flex justify-end">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <Check size={11} strokeWidth={3} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 mt-6">
        <button
          onClick={handleBuy}
          className="w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[.98] transition-all text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 text-base"
        >
          <MessageCircle size={22} className="fill-white" />
          Acheter via WhatsApp
        </button>
        <p className="text-center text-xs text-neutral-400 mt-3 leading-relaxed">
          Vous serez redirigé vers WhatsApp avec un message pré-rempli.<br />
          Votre accès PRO sera activé après confirmation du paiement.
        </p>
      </div>

      {/* Already have code? */}
      <div className="px-6 mt-5">
        <div className="bg-white rounded-2xl p-4 border border-neutral-100 text-center">
          <Zap size={16} className="mx-auto text-neutral-400 mb-2" />
          <p className="text-xs text-neutral-500">
            Déjà un code d'activation ? Contactez votre administrateur pour l'activer directement.
          </p>
        </div>
      </div>
    </div>
  );
}
