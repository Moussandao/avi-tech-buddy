# Voir le détail d'un diagnostic précédent

## Ce que l'éleveur verra
- Chaque ligne de l'« Historique des diagnostics » devient cliquable (grande zone tactile, petite flèche).
- Un clic ouvre une fenêtre de détail (panneau qui monte du bas sur mobile) avec :
  - la photo analysée (si elle existe),
  - la maladie, la gravité, et le badge « Démo » le cas échéant,
  - la date et l'heure,
  - le résumé et la liste numérotée des recommandations,
  - le bouton « Écouter » pour la lecture vocale,
  - l'avertissement vétérinaire habituel.
- Tout reste traduit en FR / EN / AR (sens de lecture de droite à gauche pour l'arabe).
- Hors connexion : les textes s'affichent depuis les données déjà chargées ; la photo affiche un message si elle ne peut pas être chargée.

## Détails techniques
- `src/routes/_authenticated/diagnostic.tsx` : transformer chaque `<li>` en `<button>` accessible (aria-label), stocker le diagnostic sélectionné dans l'état local.
- Nouveau composant `src/components/DiagnosisDetailSheet.tsx` (shadcn `Sheet`, côté bas) réutilisant le rendu actuel du résultat (badges, recommandations, SpeakButton, avertissement).
- Photo : URL signée temporaire depuis le stockage privé via `image_path` (buckets `poultry-health-images` / `diagnoses`), chargée à l'ouverture seulement.
- Vérifier que `useDiagnoses()` renvoie `summary`, `recommendations`, `image_path`, `is_demo`, `language` ; l'étendre si besoin.
- Nouvelles clés de traduction : « Détail du diagnostic », « Photo indisponible hors connexion », « Fermer ».
- Aucune modification de la base de données.
