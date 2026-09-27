# Écoute des diagnostics plus rapide

## Ce qui change pour l'éleveur
- **Lecture qui démarre tout de suite** : le son commence dès que les premiers morceaux arrivent, sans attendre que tout le diagnostic soit prêt.
- **Préparation à l'avance** : dès qu'un diagnostic s'affiche (résultat ou fenêtre de détail), l'audio est préparé en arrière-plan. Un appui sur « Écouter » joue alors presque aussitôt.
- **Mémoire durable** : un audio déjà écouté est gardé sur le téléphone. Il rejoue instantanément, même après avoir fermé l'appli, et même hors connexion.
- **Pas d'attente bloquante** : si la voix naturelle met plus de 4 secondes à arriver, la voix du téléphone lit tout de suite à la place.

## Détails techniques
- `SpeakButton` : découper le texte en phrases (titre + résumé, puis chaque recommandation) ; demander le premier morceau seul, le jouer, et générer les suivants en parallèle pendant la lecture (file audio).
- Cache persistant IndexedDB (clé = langue + hash du texte), en plus du cache mémoire actuel ; limite ~30 entrées.
- Prop `prefetch` : lancée sur le résultat courant et à l'ouverture de `DiagnosisDetailSheet` ; pas de préchargement sur la liste d'historique (évite de consommer des crédits).
- Garde de 4 s sur le premier morceau, sinon bascule vers `speak()` du navigateur.
- `tts.functions.ts` inchangé côté modèle ; limite de texte par morceau réduite.
- Vérification : mesurer le délai avant le premier son avant/après dans l'aperçu.
