# Diagnostic photo avec l'IA Lovable

## Ce qui change pour l'éleveur
- Le diagnostic photo passe par l'IA intégrée de Lovable au lieu de NVIDIA. Elle analyse mieux les photos et répond de façon plus fiable.
- Le résultat ne change pas : maladie, gravité, résumé et 3 à 5 actions concrètes, en français, anglais ou arabe.
- Le mode Démo reste en secours, seulement si l'IA ne répond pas.
- Messages clairs si le service est surchargé (réessayer plus tard) ou si les crédits IA sont épuisés.
- L'historique, la lecture audio et la fenêtre de détail restent identiques.

## Coût
Chaque analyse consomme un peu de crédits IA de votre espace Lovable. Plus besoin de la clé NVIDIA (elle reste enregistrée, mais ne sert plus).

## Vérification
Je lancerai un vrai diagnostic avec une photo de volaille dans l'appli, puis je vérifierai que le résultat enregistré n'est pas marqué Démo.

## Détails techniques
- `src/lib/diagnose.functions.ts` : remplacer l'appel NVIDIA par le gateway Lovable (`/v1/responses`, modèle `openai/gpt-6-astra`, `@ai-sdk/openai` `.responses()`, `streamText` consommé côté serveur), image en data URL, sortie structurée (schéma zod : diagnosis, severity enum, summary, recommended_actions). Options `store:false`, `forceReasoning`, `reasoningEffort:"low"`.
- Garder la normalisation de gravité, le secours démo et les logs de cause. Remonter les erreurs 429/402 au client (`AI_RATE_LIMIT` / `AI_NO_CREDITS`) avec messages traduits FR/EN/AR.
- Délai client porté à ~45 s ; texte d'attente conservé.
- Aucune modification de la base de données.
