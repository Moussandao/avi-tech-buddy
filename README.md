# 🐔 AviTech (AviTech Innovations)

> Une application moderne et intuitive de gestion d'élevage avicole (poulailler), conçue pour optimiser la productivité, le suivi financier et la gestion opérationnelle des exploitations.

🌐 **Démo en ligne / Application Live :** [https://avitechbuddy.app](https://avitechbuddy.app)
---

## 📌 Présentation

**AviTech** est une application web (PWA) interactive destinée aux aviculteurs et gestionnaires d'élevages. Elle permet de piloter efficacement les bandes de volailles, de suivre les consommations, de gérer la mortalité et les dépenses, ainsi que de visualiser la rentabilité globale en temps réel. Elle intègre également un **assistant IA vétérinaire** pour vous aider à diagnostiquer rapidement les problèmes de santé et protéger votre cheptel.

---

## ✨ Fonctionnalités Principales

- 📊 **Tableau de bord & Statistiques :** Vue d'ensemble des effectifs, taux de mortalité, dépenses et revenus.
- 🐥 **Gestion des Bandes (Lots) :** Suivi détaillé du cycle de vie des volailles (entrée, croissance, ventes, réformes).
- 💰 **Suivi Financier & Budget :** Enregistrement des ventes, des charges (aliments, vaccins, transport) et calcul automatique du bénéfice net.
- 📱 **Expérience Mobile-First & PWA :** Interface fluide, accessible sur smartphone et ordinateur.

---

## 🛠️ Tech Stack

- **Frontend :** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **UI & Styling :** [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State & Router :** React Router
- **Backend & Base de données :** [Supabase](https://supabase.com/) (Authentification, PostgreSQL & Realtime DB)
- **Prototypage & AI Generation :** [Lovable.dev](https://lovable.dev)

---

## 🚀 Installation et Lancement Local

Pour exécuter le projet en local sur votre machine, suivez ces étapes :

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 ou plus récente)
- `npm` ou `pnpm` / `yarn`

### Étapes

1. **Cloner le dépôt :**
   ```bash
   git clone [https://github.com/Moussandao/AviTech.git](https://github.com/Moussandao/AviTech.git)
   cd AviTech
Installer les dépendances :

Bash
npm install
Configurer les variables d'environnement :
Créez un fichier .env à la racine du projet et ajoutez vos clés Supabase :

Extrait de code
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
Lancer le serveur de développement :

Bash
npm run dev
L'application sera accessible sur http://localhost:5173.

🗄️ Structure du Projet
Plaintext
AviTech/
├── public/              # Fichiers statiques et assets PWA
├── src/
│   ├── components/      # Composants UI réutilisables (shadcn, cartes, formulaires)
│   ├── pages/           # Pages de l'application (Dashboard, Diagnostics, Cheptel et Finances)
│   ├── hooks/           # Custom React Hooks
│   ├── lib/             # Configurations (Supabase client, utilitaires)
│   └── App.tsx          # Configuration des routes
├── package.json
└── README.md
👨‍💻 Auteur
Développé par Ndao Moussa Ndene (Dev FullStack)

GitHub : @Moussandao

Contact : ndaomoussa07@gmail.com

📄 Licence
Ce projet est sous licence MIT. Vous êtes libre de l'utiliser et de le modifier.
