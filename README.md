# ComptaApp — Version PostgreSQL + PRO

## 🚀 Lancement

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer le serveur backend (PostgreSQL)
```bash
npm run server
# ou: npx tsx server.ts
```
> La base de données se crée automatiquement au 1er démarrage.

### 3. Démarrer le frontend (dans un 2ᵉ terminal)
```bash
npm run dev
```

L'application sera disponible sur **http://localhost:3000**

---

## 🔐 Panneau Admin (CheckMode)

Accédez au panneau administrateur secret :

```
http://localhost:3001/checkmode?key=CHECKMODE2024
```

**Ce que vous pouvez faire depuis le panneau :**
- Voir tous les utilisateurs inscrits avec leurs infos
- Passer un utilisateur en **PRO** (mensuel / trimestriel / annuel)
- Repasser un utilisateur en **FREE**
- Configurer le **numéro WhatsApp de paiement**
- Changer la **clé d'accès admin**

> 💡 Changez la clé `CHECKMODE2024` depuis le panneau → Paramètres dès le premier lancement.

---

## 💳 Plans d'abonnement

| Plan | Prix | Réduction |
|------|------|-----------|
| Mensuel | 10 000 FCFA/mois | — |
| Trimestriel | 27 000 FCFA (3 mois) | -10% |
| Annuel | 108 000 FCFA/an | -10% |

Le bouton **"Acheter via WhatsApp"** redirige l'utilisateur vers WhatsApp avec un message pré-rempli contenant ses informations et le plan choisi.

---

## 📱 Partage WhatsApp

- **Mobile** : bouton flottant vert (en bas à gauche)
- **PC** : bouton "Partager" en haut à droite + lien dans la sidebar

---

## 🖥️ Layout PC

Sur les écrans ≥ 768px (md), l'application affiche :
- Une **sidebar** fixe à gauche avec navigation, infos utilisateur
- Un **panneau principal** centré avec rendu amélioré
- Toutes les fonctionnalités identiques au mobile

---

## 🗄️ Structure de la base de données

### Table `users`
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant auto |
| whatsapp | VARCHAR(50) | Numéro unique (clé de login) |
| first_name | VARCHAR | Prénom |
| company_name | VARCHAR | Entreprise |
| email | VARCHAR | Email (optionnel) |
| password | VARCHAR | Mot de passe |
| is_pro | BOOLEAN | Statut PRO |
| plan | VARCHAR | free / monthly / quarterly / yearly |
| activated_at | TIMESTAMP | Date d'activation PRO |
| created_at | TIMESTAMP | Date d'inscription |

### Table `admin_settings`
| Clé | Valeur par défaut |
|-----|-------------------|
| whatsapp_number | 241XXXXXXXX |
| admin_key | CHECKMODE2024 |
