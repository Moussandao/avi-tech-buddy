# Diagnostic NVIDIA, voix et finances multi-devises

## Ce qui change pour l'éleveur
- **Diagnostic photo par NVIDIA** : la photo est envoyée à un modèle de vision NVIDIA, qui répond en FR, EN ou AR avec : diagnostic, gravité, actions recommandées. Chaque analyse est enregistrée dans l'historique.
- **Secours en 8 secondes** : si NVIDIA est lent (plus de 8 s) ou en panne, l'appli affiche aussitôt un résultat de démonstration (suspicion de coccidiose, gravité élevée, 3 actions) dans la langue choisie, avec une mention « Démo ».
- **Bouton « Écouter »** sur les fiches de diagnostic et sur le bilan financier, avec la voix de la langue active (fr-FR, en-US, ar-SA).
- **Saisie vocale** : une fenêtre avec un grand bouton micro. On dit « Achat de 3 sacs d'aliments pour 450 dirhams » et le formulaire se remplit tout seul (montant, catégorie, dépense ou vente, devise reconnue : dirhams, francs CFA, naira, dollars...).
- **Finances et tableau de bord** : ajout rapide par texte ou voix, symbole de devise automatique, solde et indicateurs mis à jour immédiatement.
- **Température / humidité** : petit formulaire rapide qui met à jour la courbe tout de suite.

## Ce dont j'ai besoin de vous
Une clé NVIDIA (gratuite pour commencer) : créez un compte sur build.nvidia.com, puis « Get API Key ». Je vous ouvrirai un formulaire sécurisé pour la coller.

## Choix faits (à dire si vous n'êtes pas d'accord)
- Les photos restent **privées** (pas de lien public) : seul l'éleveur et le serveur y ont accès, via un lien temporaire. Plus sûr pour vos données.
- Les tableaux existants sont réutilisés (diagnostics, transactions, relevés) au lieu d'en créer des doublons avec les noms du document. Aucune donnée n'est perdue.

## Détails techniques
- Secret `NVIDIA_API_KEY` ; fonction serveur (createServerFn, authentifiée) remplace l'appel IA actuel dans `diagnose.functions.ts` : appel `https://integrate.api.nvidia.com/v1/chat/completions` avec un modèle vision (ex. `meta/llama-3.2-90b-vision-instruct`), `AbortSignal.timeout(8000)`, sortie JSON `{diagnosis, severity, recommended_actions}` validée par zod.
- Photo : upload dans le bucket privé existant `diagnoses`, URL signée courte transmise à NVIDIA (ou image base64 si NVIDIA refuse l'URL).
- Fallback : jeu de données démo FR/EN/AR côté serveur et côté client (si le réseau coupe), champ `is_demo` ajouté à `diagnoses` par migration.
- Voix : locale arabe passée à `ar-SA` dans `translations.ts` ; nouveau composant `VoiceTransactionDialog` (Dialog shadcn, micro géant) ; parseur étendu (mots-clés achat/vente, catégories, noms de devises FR/EN/AR, nombres avec espaces « 50 000 »).
- `SpeakButton` ajouté sur la carte de bilan financier.
- Formulaire rapide climat sur le tableau de bord, écriture via la file hors-ligne existante et invalidation React Query pour mise à jour instantanée.
- Toutes les nouvelles phrases traduites en FR/EN/AR.
