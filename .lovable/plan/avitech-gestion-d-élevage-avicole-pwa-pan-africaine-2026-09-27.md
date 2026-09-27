# AviTech — Gestion d'élevage avicole (PWA pan-africaine)

Application mobile-first installable sur téléphone, pensée pour le terrain : suivi des lots de volailles, dépenses et ventes, diagnostic santé par photo, en 3 langues et 10 devises.

## Compte et données

- Création de compte par email + mot de passe, chaque exploitation ne voit que ses propres données.
- Données enregistrées en ligne et retrouvées sur n'importe quel appareil.
- Fonctionne hors-ligne : les saisies faites sans réseau sont gardées sur l'appareil et envoyées automatiquement au retour du réseau.

## Langues et devises

- Français, Anglais, Arabe, avec bascule complète en lecture de droite à gauche pour l'arabe.
- Sélecteur de langue et de devise dans l'en-tête, choix mémorisé.
- Devises : XOF, XAF, GHS, NGN, MAD, DZD, TND, KES, USD, avec affichage correct des montants partout.

## Les 4 écrans principaux

Barre de navigation en bas sur mobile, menu latéral sur grand écran.

1. **Tableau de bord** — nom de l'exploitation, badge « disponible hors-ligne », indicateurs clés (effectif total, taux de mortalité, solde financier, température/humidité du dernier relevé), grand bouton « Diagnostic IA », graphique d'évolution température/humidité sur 24 h, relevés saisis à la main.
2. **Diagnostic vétérinaire** — prise de photo ou import, analyse par intelligence artificielle, résultat avec maladie suspectée, niveau de gravité en couleur, recommandations, lecture à voix haute. Historique des diagnostics conservé.
3. **Cheptel** — lots de volailles (nom, race, date de mise en place, effectif), enregistrement des mortalités, vaccinations et consommation d'aliments par lot.
4. **Finances** — dépenses et ventes avec catégorie, montant et devise, saisie possible à la voix, bilan par période et par lot.

## Voix

- Dictée vocale pour les montants et observations (fonctionne dans les langues supportées par le téléphone).
- Lecture à voix haute des diagnostics et du bilan financier.

## Design

Palette « Green Earth » : verts profonds, tons sable et terre, blanc cassé, orange/rouge réservés aux alertes. Contrastes forts pour la lecture en plein soleil, mode clair et sombre, gros boutons tactiles, une icône claire sur chaque action.

## Détails techniques

- Lovable Cloud (auth email/mot de passe, base de données) ; tables : `profiles` (exploitation, langue, devise), `batches`, `batch_events` (mortalité, vaccination, aliment), `readings` (température/humidité), `transactions` (dépense/vente), `diagnoses`. RLS stricte par `user_id` + GRANTs.
- Photos de diagnostic dans un bucket Storage privé par utilisateur.
- Diagnostic IA via Lovable AI Gateway (modèle multimodal `openai/gpt-6-astra`), appelé depuis une server function, réponse structurée (maladie, gravité, recommandations) dans la langue active.
- i18n maison légère (dictionnaires FR/EN/AR + `dir`), helper `formatCurrency(amount, currencyCode)` via `Intl.NumberFormat`.
- PWA : manifest + icônes + service worker généré par `vite-plugin-pwa` (désactivé en preview), file d'attente hors-ligne en IndexedDB synchronisée au retour du réseau.
- Graphiques Recharts, composants shadcn, icônes Lucide.

## Ordre de construction

1. Design system, i18n/devises, coquille de navigation
2. Lovable Cloud + authentification + schéma de données
3. Cheptel et finances (avec dictée vocale)
4. Tableau de bord et graphiques
5. Diagnostic IA + lecture vocale
6. PWA et synchronisation hors-ligne
