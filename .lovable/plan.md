# Rendre le diagnostic NVIDIA réellement fonctionnel

## Constat (vérifié)
- La clé NVIDIA est valide (le service répond en 0,1 s).
- Le modèle actuel (Llama 3.2 90B Vision) ne répond pas à une photo test, même après 60 s ; l'app coupe après 8 s et affiche le résultat Démo. Le dernier diagnostic enregistré est bien marqué Démo, et le journal serveur montre « NVIDIA diagnosis failed, using demo — timeout ».
- Le modèle plus léger (Llama 3.2 11B Vision) a répondu correctement en ~10 s.

## Changements
1. Passer au modèle `meta/llama-3.2-11b-vision-instruct`.
2. Porter le délai serveur de 8 s à 25 s, et le délai côté téléphone de 9 s à 27 s, pour laisser le temps à la réponse.
3. Afficher un message d'attente rassurant pendant l'analyse (« Analyse en cours, cela peut prendre jusqu'à 30 secondes »), traduit FR/EN/AR.
4. Garder le résultat Démo en secours si NVIDIA échoue ou dépasse le délai, avec un message dans le journal indiquant la cause précise (délai, erreur HTTP, réponse illisible).
5. Tester avec une vraie photo : vérifier qu'un diagnostic non-Démo est enregistré.

## Détails techniques
- `src/lib/diagnose.functions.ts` : constante `NVIDIA_MODEL`, `TIMEOUT_MS = 25000`, logs distincts par type d'échec.
- `src/routes/_authenticated/diagnostic.tsx` : course client à 27 s, texte d'attente.
- `src/lib/translations.ts` : clé `analyzingLong` dans les 3 langues.
