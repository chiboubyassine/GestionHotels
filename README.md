# 🏨 Gestion Hôtel

Application web complète de gestion hôtelière avec **trois espaces utilisateurs** : administration, réception et clients. Les clients peuvent créer leur compte et réserver des chambres en ligne, tandis que le personnel gère les chambres, les clients et les réservations.

## 📄 Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Architecture du projet](#-architecture-du-projet)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration MySQL](#-configuration-mysql)
- [Démarrage](#-démarrage)
- [Comptes de test](#-comptes-de-test)
- [Structure de la base de données](#-structure-de-la-base-de-données)
- [API Endpoints](#-api-endpoints)
- [Déploiement en production](#-déploiement-en-production)

---

## ✨ Fonctionnalités

### 👑 Espace Administrateur (`/admin`)
- Tableau de bord avec statistiques réelles (chambres, clients, réservations, revenus)
- Graphiques : réservations par mois, revenus, répartition par type de chambre
- Gestion de toutes les chambres, clients et réservations
- Accès aux statistiques détaillées

### 📋 Espace Réception (`/reception`)
- Statistiques du jour : réservations, check-ins, check-outs, chambres disponibles, taux d'occupation
- Dernières réservations avec action **check-in** (confirme la réservation et occupe la chambre)
- Gestion des chambres, réservations et clients
- Accès rapide aux fonctionnalités quotidiennes

### 🧳 Espace Client (`/client`)
- **Inscription en ligne** et connexion avec son propre compte
- Consultation des chambres disponibles (avec photos)
- **Réservation d'une chambre** : dates, nombre de personnes, total estimé automatique
- Suivi de ses réservations (statut : en attente / confirmée / annulée / terminée)
- **Annulation** de ses propres réservations

---

## 🏗 Architecture du projet

```
GestionHotel/
├── backend/                # API Express + MySQL
│   ├── server.js           # Point d'entrée (tous les endpoints)
│   └── package.json
├── frontend/               # Application React (Create React App)
│   ├── public/
│   └── src/
│       ├── pages/          # Pages (AdminDashboard, ReceptionDashboard, ClientDashboard,
│       │                   #   Login, Register, Chambres, Reservations, Clients, ...)
│       ├── components/     # Composants (Sidebar, StatsCards, Chart, ...)
│       ├── style/          # Feuilles de style CSS
│       ├── services/       # Services API
│       └── utils/          # Utilitaires (gestion des dates)
└── package.json
```

**Stack technique**
- **Frontend** : React 19, React Router 7, Chart.js, Recharts, Bootstrap, Axios
- **Backend** : Node.js, Express 5, mysql2
- **Base de données** : MySQL 8

---

## 📦 Prérequis

- **Node.js** (v16 ou supérieur)
- **MySQL** (8.0 recommandé)
- **npm** (inclus avec Node.js)

> ⚠️ **Sous Windows** : si PowerShell bloque `npm.ps1` (erreur de stratégie d'exécution), utilisez **`npm.cmd`** à la place de `npm`.

---

## 🛠 Installation

### 1. Installer les dépendances du backend

```bash
cd backend
npm install
```

### 2. Installer les dépendances du frontend

```bash
cd frontend
npm install
```

### 3. Créer la base de données

```sql
CREATE DATABASE IF NOT EXISTS gestion_hotels;
```

---

## 🗄 Configuration MySQL

La connexion est configurée dans `backend/server.js` :

| Paramètre    | Valeur par défaut |
|--------------|-------------------|
| Hôte         | `localhost`       |
| Port         | `3306`            |
| Utilisateur  | `root`            |
| Mot de passe | `root`            |
| Base         | `gestion_hotels`  |

Pour utiliser d'autres identifiants, modifiez le bloc de connexion dans `backend/server.js`.

---

## ▶️ Démarrage

### 1. Lancer le backend (port 5000)

```bash
cd backend
npm start
```

Vous devriez voir :
```
✅ MySQL connecté avec succès
🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS
📡 Adresse: http://localhost:5000
```

### 2. Lancer le frontend (port 3000)

Dans un second terminal :

```bash
cd frontend
npm start
```

### 3. Ouvrir l'application

```
http://localhost:3000
```

Le frontend communique avec l'API via `http://localhost:5000` (CORS configuré pour `http://localhost:3000`).

---

## 👤 Comptes de test

| Rôle            | Email                  | Mot de passe |
|-----------------|------------------------|--------------|
| 👑 Admin        | `admin@gmail.com`      | `admin123`   |
| 📋 Réception    | `reception@gmail.com`  | `reception123` |
| 🧳 Client       | `pierre.bernard@gmail.com` | `client123` |

> Les comptes sont **stockés en clair** dans la colonne `mot_de_passe` (en production, utilisez un hachage de mot de passe, ex. bcrypt).

> 💡 Les clients peuvent aussi **créer leur propre compte** depuis la page de connexion (bouton « Créer un compte client »).

---

## 🗃 Structure de la base de données

### `utilisateur` — Comptes de connexion
| Colonne       | Type                       | Description |
|---------------|----------------------------|-------------|
| `id`          | INT (PK)                   | Identifiant |
| `nom`         | VARCHAR(100)               | Nom complet |
| `email`       | VARCHAR(100)               | Email de connexion |
| `mot_de_passe`| VARCHAR(255)               | Mot de passe |
| `role`        | ENUM(`admin`, `receptionniste`, `client`) | Rôle |

### `clients` — Fiches clients
| Colonne    | Type          | Description |
|------------|---------------|-------------|
| `id`       | INT (PK)      | Identifiant |
| `nom`      | VARCHAR(100)  | Nom (lié par email au compte `utilisateur`) |
| `prenom`   | VARCHAR(100)  | Prénom |
| `telephone`| VARCHAR(20)   | Téléphone (optionnel) |
| `email`    | VARCHAR(100)  | Email |
| `adresse`  | VARCHAR(255)  | Adresse (optionnel) |

### `chambres` — Chambres
| Colonne      | Type                         | Description |
|--------------|------------------------------|-------------|
| `id`         | INT (PK)                     | Identifiant |
| `numero`     | VARCHAR(10)                  | Numéro de chambre |
| `type`       | VARCHAR(50)                  | Standard / Deluxe / Suite / Presidentielle |
| `prix`       | DECIMAL(10,2)                | Prix par nuit (DH) |
| `statut`     | ENUM(`disponible`, `occupee`, `reservee`, `maintenance`) | Statut |
| `description`| TEXT                         | Description (optionnelle) |

### `reservations` — Réservations
| Colonne           | Type                             | Description |
|-------------------|----------------------------------|-------------|
| `id`              | INT (PK)                         | Identifiant |
| `client_id`       | INT (FK → `clients.id`)          | Client concerné |
| `chambre_id`      | INT (FK → `chambres.id`)         | Chambre réservée |
| `date_reservation`| DATETIME                         | Date de création |
| `date_debut`      | DATE                             | Date d'arrivée |
| `date_fin`        | DATE                             | Date de départ |
| `nombre_personnes`| INT                              | Nombre de personnes |
| `montant_total`   | DECIMAL(10,2)                    | Montant total |
| `statut`          | ENUM(`en_attente`, `confirmee`, `annulee`, `terminee`) | Statut |

---

## 🔌 API Endpoints

Base URL : `http://localhost:5000`

### Authentification
| Méthode | Endpoint          | Description |
|---------|-------------------|-------------|
| POST    | `/api/login`      | Connexion (renvoie le rôle et le `client_id` pour les clients) |
| POST    | `/api/register`   | Inscription d'un compte client |

### Chambres
| Méthode | Endpoint          | Description |
|---------|-------------------|-------------|
| GET     | `/api/chambres`   | Liste toutes les chambres |
| GET     | `/api/chambres/:id` | Détail d'une chambre |
| POST    | `/api/chambres`   | Créer une chambre |
| PUT     | `/api/chambres/:id` | Modifier une chambre |
| DELETE  | `/api/chambres/:id` | Supprimer une chambre |

### Clients
| Méthode | Endpoint          | Description |
|---------|-------------------|-------------|
| GET     | `/api/clients`    | Liste des clients |
| GET     | `/api/clients/:id` | Détail d'un client |
| POST    | `/api/clients`    | Créer un client |
| PUT     | `/api/clients/:id` | Modifier un client |
| DELETE  | `/api/clients/:id` | Supprimer un client |

### Réservations
| Méthode | Endpoint          | Description |
|---------|-------------------|-------------|
| GET     | `/api/reservations` | Liste des réservations (`?client_id=X` pour filtrer par client) |
| GET     | `/api/reservations/:id` | Détail d'une réservation |
| POST    | `/api/reservations` | Créer une réservation |
| PUT     | `/api/reservations/:id` | Modifier une réservation (statut, dates, ...) |
| DELETE  | `/api/reservations/:id` | Supprimer une réservation |

### Dashboard & Statistiques
| Méthode | Endpoint          | Description |
|---------|-------------------|-------------|
| GET     | `/api/dashboard/stats` | Statistiques globales |
| GET     | `/api/dashboard/stats-detailed` | Statistiques détaillées (réservations du jour, occupation, dernières réservations) |
| GET     | `/api/dashboard/reservations-chart` | Réservations par mois |
| GET     | `/api/dashboard/income-chart` | Revenus par mois |
| GET     | `/api/dashboard/reservations-by-room` | Réservations par type de chambre |
| GET     | `/api/dashboard/monthly-income` | Revenus mensuels de l'année en cours |

---

## 🚀 Déploiement en production

### Frontend
```bash
cd frontend
npm run build
```

Le dossier `build/` est généré et prêt à être déployé (statique). Pour le servir localement :
```bash
npx serve -s build
```

### Backend
Démarrez simplement `node server.js` derrière un gestionnaire de processus (PM2, systemd, ...) :
```bash
cd backend
npm start
```

> ⚠️ **Sécurité** : avant la mise en production, remplacez les mots de passe en clair par un hachage (bcrypt), utilisez des variables d'environnement pour les identifiants MySQL et restreignez le CORS.

---

## 📄 Licence

Projet pédagogique — libre d'utilisation. Photos des chambres fournies par [Unsplash](https://unsplash.com).