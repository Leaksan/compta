# kaizō — Flask

Application de comptabilité simple pour entrepreneurs africains, réécrite en Python/Flask avec SQLite.

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 2. Lancer l'application

```bash
python app.py
```

Ouvrir dans le navigateur : **http://localhost:5000**

---

## 📁 Structure du projet

```
flask_compta/
├── app.py                  # Application Flask principale (routes, modèles, logique)
├── requirements.txt        # Dépendances Python
├── instance/
│   └── compta.db           # Base SQLite (créée automatiquement au 1er lancement)
└── templates/
    ├── base.html           # Layout de base (sidebar PC + nav mobile)
    ├── auth.html           # Page d'inscription / connexion
    ├── dashboard.html      # Tableau de bord du mois
    ├── history.html        # Historique des mois
    ├── settings.html       # Paramètres & profil
    └── pro.html            # Espace PRO (champs personnalisés)
```

---

## ✨ Fonctionnalités

### Plan Gratuit
- Inscription / connexion par numéro WhatsApp
- Saisie de transactions (entrées & dépenses)
- Limite de **20 transactions par mois**
- Export Excel du mois en cours
- Graphique des performances (barres + solde cumulé)
- Analyse intelligente (comparaison avec mois précédent)
- Interface responsive (mobile + desktop)

### Plan PRO (code : `PROTEST`)
- **Transactions illimitées**
- Sélection de périodes personnalisées (multi-mois)
- Import Excel
- Catégories personnalisées (revenus & dépenses)
- Champs de saisie supplémentaires (texte, nombre)
- Réordonnancement et masquage des champs
- Renommage des libellés de champs

---

## 🔌 API REST

| Méthode | Endpoint                   | Description                    |
|---------|----------------------------|--------------------------------|
| POST    | `/api/auth/register`       | Créer un compte                |
| POST    | `/api/auth/login`          | Se connecter                   |
| GET     | `/api/transactions`        | Lister les transactions du mois|
| POST    | `/api/transactions`        | Créer une transaction          |
| PUT     | `/api/transactions/<id>`   | Modifier une transaction       |
| DELETE  | `/api/transactions/<id>`   | Supprimer une transaction      |
| GET     | `/api/export`              | Exporter en Excel              |
| POST    | `/api/import`              | Importer depuis Excel (PRO)    |
| POST    | `/api/settings`            | Sauvegarder les paramètres     |
| POST    | `/api/profile`             | Mettre à jour le profil        |
| POST    | `/api/activate-pro`        | Activer le plan PRO            |
| POST    | `/api/reset`               | Réinitialiser toutes les données|
| GET     | `/api/user/me`             | Infos utilisateur + paramètres |

---

## ⚙️ Configuration

Variables d'environnement (optionnelles) :

```bash
SECRET_KEY=votre-clé-secrète-production
```

En production, remplacez également :
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://...'  # PostgreSQL recommandé
```

---

## 🛠️ Technologies

- **Flask** 3.x — framework web
- **SQLAlchemy** — ORM base de données
- **Flask-Login** — gestion de sessions
- **Werkzeug** — hashage des mots de passe
- **openpyxl** — export/import Excel
- **Tailwind CSS** (CDN) — styles
- **Chart.js** (CDN) — graphiques

---

## 🧪 Tests

L'application dispose d'une suite de tests complète (API et UI).

### 1. Prérequis pour les tests
Les tests d'interface utilisent **Playwright**. Ils seront installés automatiquement par le script.

### 2. Lancer tous les tests
Exécutez simplement le script à la racine :
```bash
./run_all_tests.sh
```

Ce script va :
- Installer les dépendances nécessaires (`pytest`, `playwright`, etc.)
- Installer les navigateurs pour Playwright
- Lancer les tests API (`tests/test_api.py`)
- Lancer les tests d'interface (`tests/test_ui.py`)
