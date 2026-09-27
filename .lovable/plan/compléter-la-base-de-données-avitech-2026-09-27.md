# Compléter la base de données AviTech

On garde la structure actuelle (aucune donnée perdue) et on ajoute ce qui manque par rapport à votre document.

## Ce qui change pour l'éleveur

- **Lots** : effectif actuel suivi automatiquement (baisse à chaque mortalité enregistrée), date d'arrivée affichée.
- **Relevés température/humidité** : possibilité de les rattacher à un lot précis.
- **Diagnostics** : nouveau niveau de gravité « critique » (rouge vif), photo visible par lien direct.
- **Finances** : enregistrement d'une note vocale jointe à une dépense ou une vente, réécoutable ensuite.
- **Hors connexion** : les dernières données réelles restent affichées sur le téléphone, avec des blocs de chargement animés pendant l'attente au lieu d'écrans vides.
- **Sécurité** : chaque éleveur ne voit que ses propres données. Un compte de démonstration pré-rempli pourra être créé pour les présentations.

## Détails techniques

- Migration :
  - `batches` : ajout `current_count integer` maintenu par trigger sur `batch_events` (mortalité), `start_date` conservé comme date d'arrivée.
  - `readings` : ajout `batch_id uuid null` -> `batches`.
  - `diagnoses` : valeur `critical` acceptée pour `severity` ; ajout `audio_url text`.
  - `transactions` : ajout `voice_note_url text`.
  - RLS existante par `auth.uid()` conservée.
- Stockage : buckets publics `poultry-health-images` et `poultry-voice-notes`, écriture limitée au dossier de l'utilisateur (`{user_id}/...`), lecture publique par URL. Le diagnostic IA passe au nouveau bucket.
- Front : enregistrement audio (MediaRecorder) dans Finances ; sélecteur de lot pour les relevés ; badge « critique » traduit FR/EN/AR.
- Hors-ligne : cache React Query persisté en localStorage (`persistQueryClient`) + composants Skeleton sur tableau de bord, cheptel, finances, diagnostic.
- Compte démo : créé avec quelques lots, relevés et transactions d'exemple (sur confirmation).
