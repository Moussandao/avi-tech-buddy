# Confirmation avant chaque suppression

## Ce qui change
Avant toute suppression, une fenêtre s'ouvre : « Supprimer cet élément ? Cette action est irréversible. » avec les boutons **Annuler** et **Supprimer** (rouge). Rien n'est supprimé sans confirmation.

Emplacements concernés dans l'appli :
1. **Finances** — suppression d'une vente ou dépense (icône corbeille dans l'historique). La fenêtre rappelle le montant et la catégorie.
2. **Note vocale** — retrait d'un enregistrement audio avant de valider une dépense.

Toute future suppression utilisera la même fenêtre. Textes traduits en français, anglais et arabe (mise en page droite-à-gauche respectée), boutons larges adaptés au mobile. Un message « Supprimé » s'affiche après confirmation.

## Détails techniques
- Nouveau composant réutilisable `src/components/ConfirmDeleteDialog.tsx` basé sur `@/components/ui/alert-dialog` (props : trigger, title, description, onConfirm, loading).
- `finances.tsx` : envelopper le bouton corbeille ; `deleteTransaction.mutate` appelé seulement dans `onConfirm`, toast succès/erreur.
- `VoiceNote.tsx` : envelopper le bouton `removeVoice`.
- `translations.ts` : clés `confirmDeleteTitle`, `confirmDeleteDesc`, `cancel`, `deleted` en FR/EN/AR (réutiliser `delete` existant).
