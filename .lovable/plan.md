# Correction des bugs trouvés

## Ce que j'ai vérifié
- L'appli se construit sans erreur, et aucune erreur n'est apparue récemment dans l'aperçu.
- **Bug réel trouvé :** le diagnostic photo par l'IA NVIDIA échoue souvent. L'IA répond en texte libre au lieu du format attendu, alors l'appli affiche un **diagnostic Démo** au lieu du vrai résultat. L'erreur apparaît 3 fois dans les journaux.

## Corrections
1. **Diagnostic IA plus fiable**
   - Demander plus clairement à l'IA de répondre dans le format attendu.
   - Si la réponse n'est toujours pas lisible, réessayer une fois automatiquement.
   - Si l'IA répond en texte libre, en extraire quand même la maladie, la gravité et les conseils au lieu de passer en mode Démo.
   - Garder le mode Démo en dernier recours, avec la vraie raison notée dans les journaux.
2. **Vérifier que la page Finances fonctionne** (écran blanc corrigé au tour précédent) : ouvrir la page, toucher la corbeille et voir la fenêtre de confirmation, sans supprimer de vraies données.
3. **Tester un diagnostic de bout en bout** dans l'aperçu et confirmer qu'un résultat réel (pas Démo) s'affiche.

## Détails techniques
- `src/lib/diagnose.functions.ts` : message système + consigne « JSON only », `response_format: { type: "json_object" }` si le modèle l'accepte (sinon on l'omet), `max_tokens` 800 ; une nouvelle tentative avec une consigne plus stricte ; `extractJson` tolérant (virgules finales, guillemets typographiques) ; analyse de secours du texte (lignes Diagnosis/Severity/Actions) ; journal des 300 premiers caractères de la réponse.
- Vérification Playwright avec session connectée sur `/finances` et `/diagnostic`.
