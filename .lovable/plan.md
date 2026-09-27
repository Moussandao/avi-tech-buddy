# Lecture audio des diagnostics

## Constat
Le bouton « Écouter » existe, mais il s'appuie uniquement sur la voix intégrée du navigateur. Sur beaucoup de téléphones (surtout Android, et en arabe), aucune voix n'est installée : rien ne se lit, sans message. Il n'y a pas non plus d'état lecture / arrêt.

## Ce qui sera fait
1. **Voix naturelle en ligne** : quand l'éleveur appuie sur « Écouter », le texte du diagnostic (maladie, gravité, résumé, recommandations) est transformé en audio par l'IA intégrée à l'app, dans la langue choisie (FR / EN / AR), puis joué.
2. **Hors connexion** : si pas de réseau ou échec, l'app utilise la voix du téléphone ; si aucune voix n'est disponible, un message clair s'affiche.
3. **Bouton amélioré** : états « Chargement… », « Arrêter » pendant la lecture, retour à « Écouter » à la fin. Arrêt automatique si on ferme la fiche du diagnostic.
4. **Mise en cache** : un diagnostic déjà écouté se relit instantanément sans nouvel appel.
5. Fonctionne sur la page Diagnostic (résultat courant), la fiche de détail d'un ancien diagnostic, et les autres endroits utilisant déjà « Écouter ».
6. Textes traduits FR / EN / AR.

## Détails techniques
- Nouvelle server fn `src/lib/tts.functions.ts` (auth requise) appelant Lovable AI Gateway (modèle TTS), renvoyant l'audio en base64 (mp3) ; texte validé par zod (max ~3000 caractères).
- `SpeakButton.tsx` réécrit : état idle/loading/playing, `HTMLAudioElement`, cache mémoire par texte+langue, fallback `speechSynthesis` avec attente de `voiceschanged` et choix d'une voix correspondant à la locale, toast sonner si aucune voix.
- `voice.ts` : `speak()` renvoie un indicateur de succès et sélectionne la voix adaptée.
- Nouvelles clés dans `translations.ts` (loading, stop, noVoice).
